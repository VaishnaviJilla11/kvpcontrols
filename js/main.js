// KVP site interactions: mobile nav, scrollspy, and dealer directory rendering.
(function () {
  "use strict";

  /* ---------------- Mobile nav toggle ---------------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
      });
    });

    // Close the menu on any click/tap outside the nav or toggle button.
    document.addEventListener("click", function (event) {
      if (!navLinks.classList.contains("open")) return;
      if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
      navLinks.classList.remove("open");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") navLinks.classList.remove("open");
    });
  }

  /* ---------------- Product grid/list view toggle ---------------- */
  const productGrid = document.getElementById("productGrid");
  const viewButtons = document.querySelectorAll(".view-btn");
  const VIEW_STORAGE_KEY = "kvp-product-view";

  function setProductView(view) {
    if (!productGrid) return;
    productGrid.classList.toggle("view-grid", view === "grid");
    productGrid.classList.toggle("view-list", view === "list");

    viewButtons.forEach(function (btn) {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch (e) {
      // localStorage unavailable (private browsing etc.) — ignore.
    }
  }

  if (productGrid && viewButtons.length) {
    viewButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setProductView(btn.dataset.view);
      });
    });

    let savedView = "grid";
    try {
      savedView = localStorage.getItem(VIEW_STORAGE_KEY) || "grid";
    } catch (e) {
      // ignore
    }
    setProductView(savedView);
  }

  /* ---------------- Product card "View Details" toggle ---------------- */
  document.querySelectorAll(".details-toggle").forEach(function (btn) {
    const panel = btn.nextElementSibling;
    if (!panel) return;
    btn.addEventListener("click", function () {
      const isOpen = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
      btn.querySelector(".label").textContent = isOpen ? "Hide Details" : "View Details";
    });
  });

  /* ---------------- Scrollspy for active nav link ---------------- */
  const sections = document.querySelectorAll("main section[id]");
  const navAnchors = document.querySelectorAll(".nav-links a[href^='#']");

  function setActiveLink() {
    let currentId = "";
    const scrollPos = window.scrollY + 120;

    sections.forEach(function (section) {
      if (scrollPos >= section.offsetTop) {
        currentId = section.id;
      }
    });

    navAnchors.forEach(function (anchor) {
      anchor.classList.toggle("active", anchor.getAttribute("href") === "#" + currentId);
    });
  }

  window.addEventListener("scroll", setActiveLink);
  setActiveLink();

  /* ---------------- Dealer directory ---------------- */
  const dealerResults = document.getElementById("dealerResults");
  const dealerDistrict = document.getElementById("dealerDistrict");
  const dealerSearch = document.getElementById("dealerSearch");
  let dealers = [];
  let districts = [];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function dealerRowHtml(dealer, index) {
    const digits = String(dealer.phone || "").replace(/\D/g, "");
    return (
      "<tr>" +
      "<td>" + (index + 1) + "</td>" +
      "<td>" + escapeHtml(dealer.name) + "</td>" +
      "<td>" + (digits ? '<a class="phone" href="tel:+91' + digits + '">+91 ' + escapeHtml(dealer.phone) + "</a>" : "&mdash;") + "</td>" +
      "<td>" + escapeHtml(dealer.address || "") + "</td>" +
      "</tr>"
    );
  }

  function promptStateHtml() {
    return (
      '<div class="dealer-empty">' +
      '<div class="icon">🗺️</div>' +
      "<h4>Select a district or search by name</h4>" +
      "<p>Choose a district from the dropdown, or type a dealer name to search, to view KVP dealers.</p>" +
      "</div>"
    );
  }

  function dealerTableHtml(districtDealers, emptyMessage) {
    const rows = districtDealers.length
      ? districtDealers.map(dealerRowHtml).join("")
      : '<tr class="dealer-empty-row"><td colspan="4">' + emptyMessage + "</td></tr>";

    return (
      '<div class="dealer-table-wrap">' +
      "<table class=\"dealer-table\">" +
      "<thead><tr><th>S.No</th><th>Dealer Name</th><th>Phone Number</th><th>Address</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
      "</table>" +
      "</div>"
    );
  }

  function populateDistrictFilter() {
    if (!dealerDistrict) return;
    districts.forEach(function (district) {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      dealerDistrict.appendChild(option);
    });
  }

  function renderDealers() {
    if (!dealerResults) return;

    const selectedDistrict = (dealerDistrict && dealerDistrict.value) || "";
    const query = ((dealerSearch && dealerSearch.value) || "").trim().toLowerCase();

    if (!selectedDistrict && !query) {
      dealerResults.innerHTML = promptStateHtml();
      return;
    }

    const filtered = dealers.filter(function (dealer) {
      const matchesDistrict = !selectedDistrict || dealer.district === selectedDistrict;
      const matchesQuery = !query || String(dealer.name || "").toLowerCase().includes(query);
      return matchesDistrict && matchesQuery;
    });

    let emptyMessage;
    if (query && selectedDistrict) {
      emptyMessage = "No dealers named \u201c" + escapeHtml(dealerSearch.value.trim()) + "\u201d found in " + escapeHtml(selectedDistrict) + ".";
    } else if (query) {
      emptyMessage = "No dealers found matching \u201c" + escapeHtml(dealerSearch.value.trim()) + "\u201d.";
    } else {
      emptyMessage = "No dealers listed yet for " + escapeHtml(selectedDistrict) + ".";
    }
    emptyMessage += ' Call <a class="phone" href="tel:+919951773344">+91 99517 73344</a> and we\'ll connect you to the nearest one.';

    dealerResults.innerHTML = dealerTableHtml(filtered, emptyMessage);
  }

  if (dealerResults) {
    dealerResults.innerHTML = '<div class="dealer-empty"><div class="icon">\u23f3</div><h4>Loading dealers...</h4></div>';
    fetch("assets/data/dealers.json", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        dealers = data.dealers || [];
        districts = data.districts || [];
        populateDistrictFilter();
        renderDealers();
        if (dealerDistrict) dealerDistrict.addEventListener("change", renderDealers);
        if (dealerSearch) dealerSearch.addEventListener("input", renderDealers);
      })
      .catch(function () {
        dealerResults.innerHTML = '<div class="dealer-empty"><div class="icon">\u26a0\ufe0f</div><h4>Couldn\u2019t load dealer data</h4><p>Please refresh the page or try again shortly.</p></div>';
      });
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
