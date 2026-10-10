// KVP Dealer Admin: saves dealer entries directly to GitHub via the Contents API,
// so the live site (which fetches assets/data/dealers.json) updates automatically
// after GitHub Pages rebuilds (usually within ~30-60 seconds).
(function () {
  "use strict";

  const GH_OWNER = "VaishnaviJilla11";
  const GH_REPO = "kvpcontrols";
  const GH_BRANCH = "main";
  const GH_PATH = "assets/data/dealers.json";
  const TOKEN_KEY = "kvp-admin-gh-token";

  const tokenInput = document.getElementById("fToken");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const clearTokenBtn = document.getElementById("clearTokenBtn");
  const connectionStatus = document.getElementById("connectionStatus");
  const districtSelect = document.getElementById("fDistrict");
  const nameInput = document.getElementById("fName");
  const phoneInput = document.getElementById("fPhone");
  const addressInput = document.getElementById("fAddress");
  const form = document.getElementById("dealerForm");
  const submitBtn = document.getElementById("submitBtn");
  const saveStatus = document.getElementById("saveStatus");
  const rowsBody = document.getElementById("adminDealerRows");
  const refreshBtn = document.getElementById("refreshBtn");
  const newDistrictInput = document.getElementById("fNewDistrict");
  const addDistrictBtn = document.getElementById("addDistrictBtn");
  const districtChips = document.getElementById("districtChips");
  const districtStatus = document.getElementById("districtStatus");

  let currentSha = null;
  let currentData = { districts: [], dealers: [] };

  phoneInput.addEventListener("input", function () {
    phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
  });

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setStatus(el, message, kind) {
    el.textContent = message;
    el.className = "admin-status" + (kind ? " admin-status-" + kind : "");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function apiUrl() {
    return "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + GH_PATH;
  }

  function b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function b64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  function renderDistricts() {
    districtSelect.querySelectorAll("option:not(:first-child)").forEach(function (o) { o.remove(); });
    (currentData.districts || []).forEach(function (district) {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });

    const districts = currentData.districts || [];
    districtChips.innerHTML = districts.length
      ? districts
          .map(function (district, index) {
            return (
              '<span class="district-chip">' + escapeHtml(district) +
              '<button type="button" data-remove-district="' + index + '" aria-label="Remove ' + escapeHtml(district) + '">&times;</button></span>'
            );
          })
          .join("")
      : '<span class="district-chips-empty">No districts yet — add one above.</span>';
  }

  function renderTable() {
    const dealers = currentData.dealers || [];
    if (dealers.length === 0) {
      rowsBody.innerHTML = '<tr class="dealer-empty-row"><td colspan="6">No dealers saved yet. Use the form above.</td></tr>';
      return;
    }
    rowsBody.innerHTML = dealers
      .map(function (dealer, index) {
        return (
          "<tr>" +
          "<td>" + (index + 1) + "</td>" +
          "<td>" + escapeHtml(dealer.district) + "</td>" +
          "<td>" + escapeHtml(dealer.name) + "</td>" +
          "<td>" + escapeHtml(dealer.phone) + "</td>" +
          "<td>" + escapeHtml(dealer.address) + "</td>" +
          '<td><button type="button" class="btn-text-danger" data-remove="' + index + '">Remove</button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  async function loadFromGitHub() {
    const token = getToken();
    if (!token) {
      setStatus(connectionStatus, "Not connected. Paste a token above and click Save Token.", "neutral");
      return;
    }
    setStatus(connectionStatus, "Loading dealers from GitHub...", "neutral");
    try {
      const res = await fetch(apiUrl() + "?ref=" + GH_BRANCH, {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid token." : "GitHub returned " + res.status);
      const json = await res.json();
      currentSha = json.sha;
      currentData = JSON.parse(b64DecodeUtf8(json.content.replace(/\n/g, "")));
      renderDistricts();
      renderTable();
      setStatus(connectionStatus, "Connected. Loaded " + (currentData.dealers || []).length + " dealer(s) from GitHub.", "success");
    } catch (err) {
      setStatus(connectionStatus, "Could not connect: " + err.message, "error");
    }
  }

  async function saveToGitHub(commitMessage) {
    const token = getToken();
    if (!token) {
      setStatus(saveStatus, "Connect with a GitHub token first (top of page).", "error");
      return false;
    }
    try {
      const res = await fetch(apiUrl(), {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: commitMessage,
          content: b64EncodeUtf8(JSON.stringify(currentData, null, 2)),
          sha: currentSha,
          branch: GH_BRANCH,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(function () { return {}; });
        throw new Error(body.message || "GitHub returned " + res.status);
      }
      const json = await res.json();
      currentSha = json.content.sha;
      return true;
    } catch (err) {
      setStatus(saveStatus, "Save failed: " + err.message, "error");
      return false;
    }
  }

  saveTokenBtn.addEventListener("click", function () {
    const value = tokenInput.value.trim();
    if (!value) return;
    try {
      localStorage.setItem(TOKEN_KEY, value);
    } catch (e) {
      // ignore
    }
    tokenInput.value = "";
    loadFromGitHub();
  });

  clearTokenBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      // ignore
    }
    currentSha = null;
    currentData = { districts: [], dealers: [] };
    renderDistricts();
    renderTable();
    setStatus(connectionStatus, "Token cleared.", "neutral");
  });

  refreshBtn.addEventListener("click", loadFromGitHub);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    submitBtn.disabled = true;
    setStatus(saveStatus, "Saving...", "neutral");

    const dealer = {
      district: districtSelect.value,
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
    };
    currentData.dealers = (currentData.dealers || []).concat([dealer]);

    const ok = await saveToGitHub("Add dealer: " + dealer.name + " (" + dealer.district + ")");
    submitBtn.disabled = false;
    if (ok) {
      renderTable();
      form.reset();
      districtSelect.selectedIndex = 0;
      setStatus(saveStatus, "Saved! The live site will update within about a minute.", "success");
    } else {
      currentData.dealers.pop();
    }
  });

  rowsBody.addEventListener("click", async function (event) {
    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    const index = Number(btn.dataset.remove);
    const removed = currentData.dealers[index];
    if (!confirm('Remove "' + removed.name + '"?')) return;

    const backup = currentData.dealers.slice();
    currentData.dealers.splice(index, 1);
    btn.closest("tr").style.opacity = "0.5";

    const ok = await saveToGitHub("Remove dealer: " + removed.name);
    if (ok) {
      renderTable();
      setStatus(saveStatus, "Removed. The live site will update within about a minute.", "success");
    } else {
      currentData.dealers = backup;
      renderTable();
    }
  });

  addDistrictBtn.addEventListener("click", async function () {
    const name = newDistrictInput.value.trim();
    if (!name) return;

    const districts = currentData.districts || [];
    const exists = districts.some(function (d) { return d.toLowerCase() === name.toLowerCase(); });
    if (exists) {
      setStatus(districtStatus, '"' + name + '" is already in the list.', "error");
      return;
    }

    addDistrictBtn.disabled = true;
    setStatus(districtStatus, "Saving...", "neutral");
    currentData.districts = districts.concat([name]);

    const ok = await saveToGitHub("Add district: " + name);
    addDistrictBtn.disabled = false;
    if (ok) {
      renderDistricts();
      newDistrictInput.value = "";
      setStatus(districtStatus, "Saved! The dropdown will update on the live site within about a minute.", "success");
    } else {
      currentData.districts = districts;
      setStatus(districtStatus, "Save failed. Please try again.", "error");
    }
  });

  districtChips.addEventListener("click", async function (event) {
    const btn = event.target.closest("[data-remove-district]");
    if (!btn) return;
    const index = Number(btn.dataset.removeDistrict);
    const district = currentData.districts[index];
    const inUse = (currentData.dealers || []).some(function (d) { return d.district === district; });
    if (inUse && !confirm('"' + district + '" has dealers assigned to it. Remove it from the district list anyway?')) return;
    if (!inUse && !confirm('Remove district "' + district + '"?')) return;

    const backup = currentData.districts.slice();
    currentData.districts.splice(index, 1);
    btn.closest(".district-chip").style.opacity = "0.5";

    const ok = await saveToGitHub("Remove district: " + district);
    if (ok) {
      renderDistricts();
      setStatus(districtStatus, "Removed.", "success");
    } else {
      currentData.districts = backup;
      renderDistricts();
    }
  });

  loadFromGitHub();
})();

