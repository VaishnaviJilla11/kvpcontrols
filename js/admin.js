// KVP Dealer Admin: saves dealer entries via a private Cloudflare Worker relay,
// so the live site (which fetches assets/data/dealers.json) updates automatically
// after GitHub Pages rebuilds (usually within ~30-60 seconds). The real GitHub
// token lives only in the Worker's encrypted environment — never in this file.
(function () {
  "use strict";

  const WORKER_URL_KEY = "kvp-admin-worker-url";
  const PASSWORD_KEY = "kvp-admin-worker-password";

  const workerUrlInput = document.getElementById("fWorkerUrl");
  const passwordInput = document.getElementById("fPassword");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const clearTokenBtn = document.getElementById("clearTokenBtn");
  const connectionStatus = document.getElementById("connectionStatus");
  const districtSelect = document.getElementById("fDistrict");
  const nameInput = document.getElementById("fName");
  const phoneInput = document.getElementById("fPhone");
  const addressInput = document.getElementById("fAddress");
  const form = document.getElementById("dealerForm");
  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveStatus = document.getElementById("saveStatus");
  const rowsBody = document.getElementById("adminDealerRows");
  const refreshBtn = document.getElementById("refreshBtn");
  const newDistrictInput = document.getElementById("fNewDistrict");
  const addDistrictBtn = document.getElementById("addDistrictBtn");
  const districtChips = document.getElementById("districtChips");
  const districtStatus = document.getElementById("districtStatus");

  let currentData = { districts: [], dealers: [] };
  let editingIndex = null;

  phoneInput.addEventListener("input", function () {
    phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
  });

  function enterEditMode(index) {
    const dealer = currentData.dealers[index];
    editingIndex = index;
    districtSelect.value = dealer.district;
    nameInput.value = dealer.name;
    phoneInput.value = dealer.phone;
    addressInput.value = dealer.address;
    submitBtn.textContent = "Update Dealer";
    cancelEditBtn.hidden = false;
    setStatus(saveStatus, "Editing \u201c" + dealer.name + "\u201d.", "neutral");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function exitEditMode() {
    editingIndex = null;
    form.reset();
    districtSelect.selectedIndex = 0;
    submitBtn.textContent = "Save Dealer to Website";
    cancelEditBtn.hidden = true;
  }

  cancelEditBtn.addEventListener("click", function () {
    exitEditMode();
    setStatus(saveStatus, "", "");
  });

  function getCreds() {
    try {
      return {
        workerUrl: localStorage.getItem(WORKER_URL_KEY) || "",
        password: localStorage.getItem(PASSWORD_KEY) || "",
      };
    } catch (e) {
      return { workerUrl: "", password: "" };
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

  async function callWorker(action, extra) {
    const { workerUrl, password } = getCreds();
    if (!workerUrl || !password) {
      throw new Error("Connect with your Worker URL and password first (top of page).");
    }
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ password: password, action: action }, extra || {})),
    });
    const body = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !body.ok) {
      throw new Error(body.error || "Worker returned " + res.status);
    }
    return body;
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
          "<td>" +
          '<button type="button" class="btn-text-navy" data-edit="' + index + '">Edit</button> ' +
          '<button type="button" class="btn-text-danger" data-remove="' + index + '">Remove</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function loadFromWorker() {
    const { workerUrl, password } = getCreds();
    if (!workerUrl || !password) {
      setStatus(connectionStatus, "Not connected. Enter your Worker URL and password above.", "neutral");
      return;
    }
    setStatus(connectionStatus, "Loading dealers...", "neutral");
    try {
      const body = await callWorker("load");
      currentData = body.data || { districts: [], dealers: [] };
      renderDistricts();
      renderTable();
      setStatus(connectionStatus, "Connected. Loaded " + (currentData.dealers || []).length + " dealer(s).", "success");
    } catch (err) {
      setStatus(connectionStatus, "Could not connect: " + err.message, "error");
    }
  }

  async function saveToWorker(commitMessage) {
    try {
      await callWorker("save", { data: currentData, message: commitMessage });
      return true;
    } catch (err) {
      setStatus(saveStatus, "Save failed: " + err.message, "error");
      return false;
    }
  }

  saveTokenBtn.addEventListener("click", function () {
    const url = workerUrlInput.value.trim().replace(/\/$/, "");
    const pwd = passwordInput.value;
    if (!url || !pwd) return;
    try {
      localStorage.setItem(WORKER_URL_KEY, url);
      localStorage.setItem(PASSWORD_KEY, pwd);
    } catch (e) {
      // ignore
    }
    passwordInput.value = "";
    loadFromWorker();
  });

  clearTokenBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(WORKER_URL_KEY);
      localStorage.removeItem(PASSWORD_KEY);
    } catch (e) {
      // ignore
    }
    currentData = { districts: [], dealers: [] };
    renderDistricts();
    renderTable();
    setStatus(connectionStatus, "Disconnected.", "neutral");
  });

  refreshBtn.addEventListener("click", loadFromWorker);

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

    const isEditing = editingIndex !== null;
    const backup = currentData.dealers.slice();
    if (isEditing) {
      currentData.dealers[editingIndex] = dealer;
    } else {
      currentData.dealers = (currentData.dealers || []).concat([dealer]);
    }

    const message = isEditing
      ? "Update dealer: " + dealer.name + " (" + dealer.district + ")"
      : "Add dealer: " + dealer.name + " (" + dealer.district + ")";
    const ok = await saveToWorker(message);
    submitBtn.disabled = false;
    if (ok) {
      renderTable();
      exitEditMode();
      setStatus(saveStatus, (isEditing ? "Updated! " : "Saved! ") + "The live site will update within about a minute.", "success");
    } else {
      currentData.dealers = backup;
    }
  });

  rowsBody.addEventListener("click", async function (event) {
    const editBtn = event.target.closest("[data-edit]");
    if (editBtn) {
      enterEditMode(Number(editBtn.dataset.edit));
      return;
    }

    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    const index = Number(btn.dataset.remove);
    const removed = currentData.dealers[index];
    if (!confirm('Remove "' + removed.name + '"?')) return;

    const backup = currentData.dealers.slice();
    currentData.dealers.splice(index, 1);
    btn.closest("tr").style.opacity = "0.5";

    const ok = await saveToWorker("Remove dealer: " + removed.name);
    if (ok) {
      renderTable();
      if (editingIndex === index) exitEditMode();
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

    const ok = await saveToWorker("Add district: " + name);
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

    const ok = await saveToWorker("Remove district: " + district);
    if (ok) {
      renderDistricts();
      setStatus(districtStatus, "Removed.", "success");
    } else {
      currentData.districts = backup;
      renderDistricts();
    }
  });

  loadFromWorker();
})();

