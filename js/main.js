// KVP site interactions: mobile nav, scrollspy, and dealer directory rendering.
(function () {
  "use strict";

  /* ---------------- D.O.L. starter six-sided 3D viewer ---------------- */
  const dolCarousel = document.getElementById("dolCarousel");
  if (dolCarousel) {
    const slides = Array.from(dolCarousel.querySelectorAll(".dol-carousel-slide"));
    const dots = Array.from(dolCarousel.querySelectorAll("[data-dol-slide]"));
    const viewerSlide = slides.findIndex(function (slide) { return slide.id === "dolViewerSlide"; });
    const productSlide = document.getElementById("dolProductSlide");
    let activeSlide = 0;

    function showDolSlide(index) {
      activeSlide = (index + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        const active = slideIndex === activeSlide;
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
      });
      dots.forEach(function (dot, dotIndex) {
        const active = dotIndex === activeSlide;
        dot.classList.toggle("active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    const show360 = document.getElementById("dolShow360");
    const previous = document.getElementById("dolPreviousSlide");
    const next = document.getElementById("dolNextSlide");
    if (productSlide) {
      let swipeStart = null;
      productSlide.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      });
      productSlide.addEventListener("pointerup", function (event) {
        if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
        const dx = event.clientX - swipeStart.x;
        const dy = event.clientY - swipeStart.y;
        swipeStart = null;
        if (activeSlide === 0 && dx < -45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          showDolSlide(viewerSlide);
          const stage = document.getElementById("dolViewerStage");
          if (stage) stage.focus();
        }
      });
      productSlide.addEventListener("pointercancel", function () { swipeStart = null; });
    }
    const viewerSlideElement = document.getElementById("dolViewerSlide");
    if (viewerSlideElement) {
      let swipeStart = null;
      viewerSlideElement.addEventListener("pointerdown", function (event) {
        swipeStart = null;
        if (event.pointerType !== "touch") return;
        // A drag that starts on the 3D stage is for rotating the box, never for changing slides.
        if (event.target.closest(".dol-viewer-stage")) return;
        swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      });
      viewerSlideElement.addEventListener("pointerup", function (event) {
        if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
        const dx = event.clientX - swipeStart.x;
        const dy = event.clientY - swipeStart.y;
        swipeStart = null;
        if (activeSlide === viewerSlide && dx < -45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          showDolSlide(0);
          if (dots[0]) dots[0].focus();
        }
      });
      viewerSlideElement.addEventListener("pointercancel", function () { swipeStart = null; });
    }
    if (show360) show360.addEventListener("click", function () {
      showDolSlide(viewerSlide);
      const stage = document.getElementById("dolViewerStage");
      if (stage) stage.focus();
    });
    if (previous) previous.addEventListener("click", function () { showDolSlide(activeSlide - 1); });
    if (next) next.addEventListener("click", function () { showDolSlide(activeSlide + 1); });
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () { showDolSlide(Number(dot.dataset.dolSlide)); });
    });
    showDolSlide(0);
  }

  const dolBox = document.getElementById("dolBox");
  const dolStage = document.getElementById("dolViewerStage");
  if (dolBox && dolStage) {
    let rotateX = -16;
    let rotateY = -28;
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;

    function paintDolBox() {
      dolBox.style.transform = "rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
    }

    function rotateBy(x, y) {
      rotateY += x;
      rotateX += y;
      paintDolBox();
    }

    dolStage.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      dolBox.classList.add("is-dragging");
      dolStage.setPointerCapture(event.pointerId);
    });

    dolStage.addEventListener("pointermove", function (event) {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      rotateBy(dx * 0.75, -dy * 0.65);
    });

    function stopDolDrag(event) {
      if (event.pointerId === pointerId) {
        pointerId = null;
        dolBox.classList.remove("is-dragging");
      }
    }
    dolStage.addEventListener("pointerup", stopDolDrag);
    dolStage.addEventListener("pointercancel", stopDolDrag);
    dolStage.addEventListener("lostpointercapture", stopDolDrag);

    dolStage.addEventListener("keydown", function (event) {
      const rotations = {
        ArrowLeft: [-15, 0], ArrowRight: [15, 0],
        ArrowUp: [0, -12], ArrowDown: [0, 12],
      };
      if (!rotations[event.key]) return;
      event.preventDefault();
      rotateBy(rotations[event.key][0], rotations[event.key][1]);
    });

    const leftButton = document.getElementById("dolRotateLeft");
    const rightButton = document.getElementById("dolRotateRight");
    const resetButton = document.getElementById("dolResetView");
    if (leftButton) leftButton.addEventListener("click", function () { rotateBy(-30, 0); });
    if (rightButton) rightButton.addEventListener("click", function () { rotateBy(30, 0); });
    if (resetButton) resetButton.addEventListener("click", function () {
      rotateX = -16;
      rotateY = -28;
      paintDolBox();
      dolStage.focus();
    });
  }

  /* ---------------- Visit tracking (one count per browser session) ---------------- */
  (function trackVisit() {
    // Only track real visits to the live domain — skip local file:// testing,
    // localhost, and any other preview/dev environment.
    const liveHosts = ["kvpcontrols.in", "www.kvpcontrols.in"];
    if (liveHosts.indexOf(location.hostname) === -1) return;

    // Only send once per tab session, so browsing multiple pages counts as one visit.
    try {
      if (sessionStorage.getItem("kvp_visit_tracked")) return;
      sessionStorage.setItem("kvp_visit_tracked", "1");
    } catch (e) {
      // sessionStorage blocked (private mode etc.) — fall through and track anyway.
    }

    const WORKER_URL = "https://kvp-dealer-admin.jillavaishnavi.workers.dev";
    const payload = JSON.stringify({ action: "track", path: location.pathname });
    try {
      if (navigator.sendBeacon) {
        // Use a CORS-safelisted content type (text/plain) so sendBeacon never
        // triggers a preflight — some browsers silently drop beacons that do.
        // The Worker parses the body as JSON regardless of this header.
        const blob = new Blob([payload], { type: "text/plain" });
        navigator.sendBeacon(WORKER_URL, blob);
      } else {
        fetch(WORKER_URL, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch (e) {
      // Tracking must never break the page.
    }
  })();

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

  /* ---------------- Scroll reveal animations ---------------- */
  document.querySelectorAll(".pd-hero, .pd-section").forEach(function (el) {
    el.classList.add("reveal");
  });

  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("reveal-visible");
      });
    }
  }

  /* ---------------- Back to top button ---------------- */
  const backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("visible", window.scrollY > 500);
    });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll(".faq-question").forEach(function (btn) {
    const panel = btn.nextElementSibling;
    if (!panel) return;
    btn.addEventListener("click", function () {
      const isOpen = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  });

  /* ---------------- FAQ phase tabs (Single Phase / Three Phase) ---------------- */
  const faqTabs = document.querySelectorAll(".faq-tab");
  if (faqTabs.length) {
    faqTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        faqTabs.forEach(function (t) {
          t.classList.toggle("active", t === tab);
        });
        const selected = tab.dataset.faqTab;
        document.querySelectorAll(".faq-list[data-faq-group]").forEach(function (list) {
          list.hidden = list.dataset.faqGroup !== selected;
        });
      });
    });
  }

  /* ---------------- Product detail language selector ---------------- */
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    const i18nEls = document.querySelectorAll("[data-te]");
    const faqSecondaryEls = document.querySelectorAll(".faq-secondary");
    const faqQSecondaryEls = document.querySelectorAll(".faq-q-te");
    const langLabels = { te: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41", ta: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd", hi: "\u0939\u093f\u0928\u094d\u0926\u0940", kn: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1" };

    function isCorruptedTranslation(value) {
      if (!value) return true;
      const compact = value.replace(/\s/g, "");
      const questionMarks = (compact.match(/\?/g) || []).length;
      return questionMarks >= 3 && questionMarks / compact.length > 0.1;
    }

    function getTranslation(el, lang) {
      const candidate = el.dataset[lang];
      if (lang !== "en" && candidate && !isCorruptedTranslation(candidate)) {
        return { text: candidate, label: langLabels[lang] };
      }
      return { text: el.dataset.en || "", label: "English" };
    }

    // These two product pages contain legacy question-mark placeholder text.
    // Preserve their actual English FAQ copy as a safe fallback instead.
    faqQSecondaryEls.forEach(function (el) {
      const englishQuestion = el.previousElementSibling;
      if (englishQuestion) {
        el.dataset.en = englishQuestion.textContent.trim();
        el.textContent = el.dataset.en;
        el.hidden = isCorruptedTranslation(el.dataset.te);
      }
    });
    faqSecondaryEls.forEach(function (el) {
      const englishAnswer = el.previousElementSibling;
      if (englishAnswer) {
        el.dataset.en = englishAnswer.textContent.replace(/^English:\s*/i, "").trim();
      }
      el.hidden = true;
    });

    langSelect.addEventListener("change", function () {
      const lang = langSelect.value;

      i18nEls.forEach(function (el) {
        el.dataset.en = el.dataset.en || el.textContent;
        el.textContent = getTranslation(el, lang).text;
      });

      faqQSecondaryEls.forEach(function (el) {
        const translation = getTranslation(el, lang);
        el.textContent = translation.text;
        el.hidden = translation.label === "English";
      });

      faqSecondaryEls.forEach(function (el) {
        const translation = getTranslation(el, lang);
        el.hidden = translation.label === "English";
        const label = document.createElement("strong");
        label.textContent = translation.label + ": ";
        el.replaceChildren(label, document.createTextNode(translation.text));
      });
    });
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
  const dealerResults = document.getElementById("dealerResults");
  const dealerState = document.getElementById("dealerState");
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
      "<h4>Select a state or district, or search by name</h4>" +
      "<p>Choose a state, then a district, or type a dealer name to search, to view KVP dealers.</p>" +
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

  function populateStateFilter() {
    if (!dealerState) return;
    const states = Array.from(new Set(districts.map(function (d) { return d.state; }).filter(Boolean))).sort();
    states.forEach(function (state) {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      dealerState.appendChild(option);
    });
  }

  function populateDistrictFilter(stateFilter) {
    if (!dealerDistrict) return;
    dealerDistrict.querySelectorAll("option:not(:first-child)").forEach(function (o) { o.remove(); });
    districts
      .filter(function (d) { return !stateFilter || d.state === stateFilter; })
      .forEach(function (d) {
        const option = document.createElement("option");
        option.value = d.name;
        option.textContent = d.name;
        dealerDistrict.appendChild(option);
      });
    dealerDistrict.value = "";
  }

  function renderDealers() {
    if (!dealerResults) return;

    const selectedState = (dealerState && dealerState.value) || "";
    const selectedDistrict = (dealerDistrict && dealerDistrict.value) || "";
    const query = ((dealerSearch && dealerSearch.value) || "").trim().toLowerCase();

    if (!selectedState && !selectedDistrict && !query) {
      dealerResults.innerHTML = promptStateHtml();
      return;
    }

    const districtsInState = selectedState
      ? districts.filter(function (d) { return d.state === selectedState; }).map(function (d) { return d.name; })
      : null;

    const filtered = dealers.filter(function (dealer) {
      const matchesState = !districtsInState || districtsInState.indexOf(dealer.district) !== -1;
      const matchesDistrict = !selectedDistrict || dealer.district === selectedDistrict;
      const matchesQuery = !query || String(dealer.name || "").toLowerCase().includes(query);
      return matchesState && matchesDistrict && matchesQuery;
    });

    let emptyMessage;
    if (query && selectedDistrict) {
      emptyMessage = "No dealers named \u201c" + escapeHtml(dealerSearch.value.trim()) + "\u201d found in " + escapeHtml(selectedDistrict) + ".";
    } else if (query) {
      emptyMessage = "No dealers found matching \u201c" + escapeHtml(dealerSearch.value.trim()) + "\u201d.";
    } else if (selectedDistrict) {
      emptyMessage = "No dealers listed yet for " + escapeHtml(selectedDistrict) + ".";
    } else {
      emptyMessage = "No dealers listed yet for " + escapeHtml(selectedState) + ".";
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
        districts = (data.districts || []).map(function (d) {
          return typeof d === "string" ? { name: d, state: "" } : d;
        });
        populateStateFilter();
        populateDistrictFilter("");
        renderDealers();
        if (dealerState) {
          dealerState.addEventListener("change", function () {
            populateDistrictFilter(dealerState.value);
            renderDealers();
          });
        }
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

  /* Keep fixed contact buttons from covering footer links on small screens. */
  const footer = document.querySelector(".site-footer");
  const floatingContact = document.querySelector(".float-contact");
  if (footer && floatingContact && "IntersectionObserver" in window) {
    const footerObserver = new IntersectionObserver(function (entries) {
      floatingContact.classList.toggle("is-footer-visible", entries[0].isIntersecting);
    });
    footerObserver.observe(footer);
  }
})();
