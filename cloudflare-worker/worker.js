// Cloudflare Worker: secure relay between the KVP admin page and GitHub.
//
// The real GitHub token never leaves this Worker. The admin page only sends
// a short password you choose, which this Worker checks before touching
// GitHub on your behalf.
//
// ---- One-time setup in the Cloudflare dashboard ----
// 1. Go to workers.cloudflare.com -> sign in / sign up (free, no card needed).
// 2. Workers & Pages -> Create -> Create Worker.
// 3. Give it a name (e.g. "kvp-dealer-admin"), click Deploy.
// 4. Click "Edit code", delete the placeholder, paste this entire file, Save & Deploy.
// 5. Go to Settings -> Variables and Secrets -> Add:
//      - GITHUB_TOKEN   = your GitHub Personal Access Token (Contents: Read/write on kvpcontrols)
//      - ADMIN_PASSWORD = a short password you choose for the admin page
//    Mark both as "Encrypt" / Secret (not plain text).
// 6. Copy the Worker's URL shown at the top (e.g. https://kvp-dealer-admin.<you>.workers.dev)
//    and paste it into js/admin.js as WORKER_URL.
// 7. For visit tracking: Settings -> Bindings -> Add -> KV Namespace.
//      - Create a new namespace (e.g. "kvp-visits"), bind it with variable name: VISITS
//    Visit tracking works without this, but counts won't persist until it's bound.

const GH_OWNER = "VaishnaviJilla11";
const GH_REPO = "kvpcontrols";
const GH_BRANCH = "main";
const GH_PATH = "assets/data/dealers.json";

function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function json(body, status) {
  return cors(
    new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

async function githubContentsUrl() {
  return "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + GH_PATH;
}

async function ghFetch(url, token, options) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "kvp-dealer-admin-worker",
      ...(options && options.headers ? options.headers : {}),
    },
  });
}

async function loadData(token) {
  const res = await ghFetch(await githubContentsUrl() + "?ref=" + GH_BRANCH, token);
  if (!res.ok) throw new Error("GitHub read failed: " + res.status);
  const body = await res.json();
  return {
    sha: body.sha,
    data: JSON.parse(b64DecodeUtf8(body.content.replace(/\n/g, ""))),
  };
}

async function saveData(token, data, message) {
  const current = await loadData(token).catch(function () {
    return { sha: undefined };
  });
  const res = await ghFetch(await githubContentsUrl(), token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message || "Update dealers.json",
      content: b64EncodeUtf8(JSON.stringify(data, null, 2)),
      sha: current.sha,
      branch: GH_BRANCH,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(function () {
      return {};
    });
    throw new Error(errBody.message || "GitHub write failed: " + res.status);
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function trackVisit(env, pagePath) {
  if (!env.VISITS) return; // KV not bound yet; silently no-op
  const day = todayStr();
  const totalKey = "visits:total";
  const dayKey = "visits:day:" + day;
  const [totalRaw, dayRaw] = await Promise.all([
    env.VISITS.get(totalKey),
    env.VISITS.get(dayKey),
  ]);
  const total = (parseInt(totalRaw, 10) || 0) + 1;
  const dayCount = (parseInt(dayRaw, 10) || 0) + 1;
  await Promise.all([
    env.VISITS.put(totalKey, String(total)),
    env.VISITS.put(dayKey, String(dayCount)),
  ]);
}

async function getVisitStats(env) {
  if (!env.VISITS) {
    return { total: 0, days: [], note: "KV namespace 'VISITS' not bound yet." };
  }
  const totalRaw = await env.VISITS.get("visits:total");
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = await env.VISITS.get("visits:day:" + key);
    days.push({ date: key, count: parseInt(count, 10) || 0 });
  }
  return { total: parseInt(totalRaw, 10) || 0, days };
}

// ---- Brute-force protection for the admin password ----
// Tracks failed attempts per client IP in the same KV namespace used for visits.
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

async function isLockedOut(env, ip) {
  if (!env.VISITS) return false; // KV not bound; fail open rather than lock everyone out
  const raw = await env.VISITS.get("login_fail:" + ip);
  return (parseInt(raw, 10) || 0) >= MAX_LOGIN_ATTEMPTS;
}

async function recordFailedLogin(env, ip) {
  if (!env.VISITS) return;
  const key = "login_fail:" + ip;
  const count = (parseInt(await env.VISITS.get(key), 10) || 0) + 1;
  await env.VISITS.put(key, String(count), { expirationTtl: LOGIN_LOCKOUT_SECONDS });
}

async function clearFailedLogins(env, ip) {
  if (!env.VISITS) return;
  await env.VISITS.delete("login_fail:" + ip).catch(function () {});
}

// ---- Basic bounds checking for saved dealer data (defense against abuse) ----
function validateDealerData(data) {
  if (!data || typeof data !== "object") return "Invalid data";
  const dealers = data.dealers || [];
  const districts = data.districts || [];
  if (dealers.length > 5000) return "Too many dealers";
  if (districts.length > 1000) return "Too many districts";
  for (const d of dealers) {
    if (String(d.name || "").length > 200) return "Dealer name too long";
    if (String(d.phone || "").length > 20) return "Phone number too long";
    if (String(d.address || "").length > 500) return "Address too long";
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid request body" }, 400);
    }

    // Visit tracking is intentionally public (no password) so every visitor's
    // page load can call it directly from the browser.
    if (body && body.action === "track") {
      try {
        await trackVisit(env, body.path);
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message || "Tracking failed" }, 500);
      }
    }

    const ip = clientIp(request);
    if (await isLockedOut(env, ip)) {
      return json({ error: "Too many failed attempts. Try again in 15 minutes." }, 429);
    }

    if (!body || body.password !== env.ADMIN_PASSWORD) {
      await recordFailedLogin(env, ip);
      return json({ error: "Invalid password" }, 401);
    }
    await clearFailedLogins(env, ip);

    try {
      if (body.action === "load") {
        const { data } = await loadData(env.GITHUB_TOKEN);
        return json({ ok: true, data });
      }

      if (body.action === "save") {
        if (!body.data) return json({ error: "Missing data" }, 400);
        const validationError = validateDealerData(body.data);
        if (validationError) return json({ error: validationError }, 400);
        await saveData(env.GITHUB_TOKEN, body.data, body.message);
        return json({ ok: true });
      }

      if (body.action === "stats") {
        const stats = await getVisitStats(env);
        return json({ ok: true, stats });
      }

      return json({ error: "Unknown action" }, 400);
    } catch (err) {
      return json({ error: err.message || "Unexpected error" }, 500);
    }
  },
};
