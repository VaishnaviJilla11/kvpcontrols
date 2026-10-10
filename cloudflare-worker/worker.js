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

    if (!body || body.password !== env.ADMIN_PASSWORD) {
      return json({ error: "Invalid password" }, 401);
    }

    try {
      if (body.action === "load") {
        const { data } = await loadData(env.GITHUB_TOKEN);
        return json({ ok: true, data });
      }

      if (body.action === "save") {
        if (!body.data) return json({ error: "Missing data" }, 400);
        await saveData(env.GITHUB_TOKEN, body.data, body.message);
        return json({ ok: true });
      }

      return json({ error: "Unknown action" }, 400);
    } catch (err) {
      return json({ error: err.message || "Unexpected error" }, 500);
    }
  },
};
