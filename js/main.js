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

  const productsCount = document.getElementById("productsCount");
  if (productsCount && productGrid) {
    const total = productGrid.querySelectorAll(".product-card").length;
    productsCount.textContent = total + (total === 1 ? " product" : " products");
  }

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
  const dealerGrid = document.getElementById("dealerGrid");
  const dealerSearch = document.getElementById("dealerSearch");
  const dealerState = document.getElementById("dealerState");
  const dealers = typeof KVP_DEALERS !== "undefined" ? KVP_DEALERS : [];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function dealerCardHtml(dealer) {
    const digits = String(dealer.phone || "").replace(/\D/g, "");
    return (
      '<article class="dealer-card">' +
      "<h4>" + escapeHtml(dealer.name) + "</h4>" +
      '<div class="location">' + escapeHtml(dealer.city) + ", " + escapeHtml(dealer.state) + "</div>" +
      '<div class="meta">' +
      (dealer.address ? "<span>" + escapeHtml(dealer.address) + "</span>" : "") +
      (digits ? '<a class="phone" href="tel:+91' + digits + '">+91 ' + escapeHtml(dealer.phone) + "</a>" : "") +
      "</div>" +
      "</article>"
    );
  }

  function emptyStateHtml(hasFilters) {
    return (
      '<div class="dealer-empty">' +
      '<div class="icon">🗺️</div>' +
      "<h4>" + (hasFilters ? "No dealers match your search" : "Dealer list coming soon") + "</h4>" +
      "<p>" +
      (hasFilters
        ? "Try a different city, state, or dealer name."
        : "We're adding our authorized dealers across Andhra Pradesh, Telangana &amp; Karnataka. Call " +
          '<a class="phone" href="tel:+919000933113">+91 90009 33113</a> and we\'ll connect you to the nearest one.')
      + "</p>" +
      "</div>"
    );
  }

  function populateStateFilter() {
    if (!dealerState) return;
    const states = Array.from(new Set(dealers.map(function (d) { return d.state; }))).sort();
    states.forEach(function (state) {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      dealerState.appendChild(option);
    });
  }

  function renderDealers() {
    if (!dealerGrid) return;

    const query = (dealerSearch && dealerSearch.value || "").trim().toLowerCase();
    const stateFilter = (dealerState && dealerState.value) || "";

    const filtered = dealers.filter(function (dealer) {
      const matchesQuery =
        !query ||
        [dealer.name, dealer.city, dealer.state].some(function (field) {
          return String(field || "").toLowerCase().includes(query);
        });
      const matchesState = !stateFilter || dealer.state === stateFilter;
      return matchesQuery && matchesState;
    });

    if (filtered.length === 0) {
      dealerGrid.innerHTML = emptyStateHtml(dealers.length > 0);
      return;
    }

    dealerGrid.innerHTML = filtered.map(dealerCardHtml).join("");
  }

  if (dealerGrid) {
    populateStateFilter();
    renderDealers();
    if (dealerSearch) dealerSearch.addEventListener("input", renderDealers);
    if (dealerState) dealerState.addEventListener("change", renderDealers);
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
