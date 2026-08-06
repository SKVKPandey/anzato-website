/* =================================================================
   ANZATO — script.js
   Vanilla JS. No dependencies. Handles: mobile nav, nav shadow on
   scroll, scroll reveal, contact form (endpoint POST or mailto
   fallback), dynamic year.
   ================================================================= */
(function () {
  "use strict";

  /* ---------- Dynamic year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    // Close after clicking a link (mobile)
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Motion preferences ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Nav border + scroll progress ---------- */
  var nav = document.getElementById("nav");
  var progress = document.querySelector(".scroll-progress");
  function onScroll() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty("--scroll", max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Hero title splitting was removed. Revealing it word by word kept the
     page's largest text block invisible for ~1.4s, which pushed out both
     LCP and Speed Index for a decorative effect. */

  /* ---------- Scrollspy: highlight active nav link ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__menu a[href^="#"]:not(.btn)')
  );
  var spySections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if (spySections.length && "IntersectionObserver" in window) {
    var spyIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    spySections.forEach(function (s) { spyIo.observe(s); });
  }

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // Fallback: just show everything
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Before/After compare slider ---------- */
  var cmp = document.getElementById("compareRedesign");
  if (cmp) {
    var rng = cmp.querySelector(".compare__range");
    var setPos = function (v) { cmp.style.setProperty("--pos", v + "%"); };
    setPos(rng.value);
    rng.addEventListener("input", function () { setPos(rng.value); });
  }

  /* ---------- Instant site check (Google PageSpeed Insights) ---------- */
  // ============================================================
  // API KEY SLOT — paste a Google PageSpeed Insights API key here.
  // Get one free at: https://developers.google.com/speed/docs/insights/v5/get-started
  // The tool will attempt to run without a key (low quota); a key is
  // strongly recommended for reliability once the site is live.
  // ============================================================
  var PSI_API_KEY = "REDACTED";

  // ============================================================
  // BACKEND_URL — set this to your deployed Anzato backend (Flask)
  // and the instant check runs through it instead of calling Google
  // directly, which keeps the PageSpeed key off the client entirely.
  // Leave empty to keep the site fully standalone (the check still
  // works, using PSI_API_KEY above).
  // Example: "https://api.anzato.com"  (no trailing slash)
  // ============================================================
  var BACKEND_URL = "";

  var lastAuditUrl = "";

  var auditForm = document.getElementById("auditForm");
  if (auditForm) {
    var urlInput = document.getElementById("auditUrl");
    var btn = document.getElementById("auditBtn");
    var hint = document.getElementById("auditHint");
    var results = document.getElementById("auditResults");
    var grid = document.getElementById("scoreGrid");
    var metricsEl = document.getElementById("auditMetrics");
    var summary = document.getElementById("auditSummary");

    var setHint = function (msg, isError) {
      hint.textContent = msg;
      hint.className = "check__hint" + (isError ? " is-error" : "");
    };

    var normalizeUrl = function (u) {
      u = u.trim();
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      return u;
    };

    var scoreColor = function (pct) {
      if (pct >= 90) return "var(--accent)";
      if (pct >= 50) return "#e0a02e";
      return "#d9534f";
    };

    var scoreCard = function (label, sub, pct) {
      if (pct == null) {
        return '<div class="score"><div class="score__ring" style="--v:0;--c:var(--line-2)"><span>—</span></div>' +
               '<div class="score__label">' + label + '<small>' + sub + '</small></div></div>';
      }
      return '<div class="score"><div class="score__ring" style="--v:' + pct + ';--c:' + scoreColor(pct) + '">' +
             '<span>' + pct + '</span></div>' +
             '<div class="score__label">' + label + '<small>' + sub + '</small></div></div>';
    };

    var metricCard = function (label, value) {
      return '<div class="metric"><span>' + label + '</span><strong>' + value + '</strong></div>';
    };

    auditForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!urlInput.value.trim()) { setHint("Enter a website URL to check.", true); return; }

      var target = normalizeUrl(urlInput.value);
      lastAuditUrl = target;

      btn.disabled = true;
      var oldLabel = btn.textContent;
      btn.innerHTML = '<span class="check__spinner" aria-hidden="true"></span>Checking…';
      setHint("Running a live audit. This can take 15–30 seconds…", false);

      // Paint the results panel from a normalized {scores, metrics} shape,
      // so the backend path and the direct-to-Google path share one renderer.
      var render = function (scores, metrics) {
        grid.innerHTML =
          scoreCard("Performance", "Speed", scores.performance) +
          scoreCard("SEO", "Search-ready", scores.seo) +
          scoreCard("Accessibility", "Usability", scores.accessibility) +
          scoreCard("Best practices", "Quality", scores.best_practices);

        metricsEl.innerHTML =
          metricCard("Largest paint", metrics.lcp) +
          metricCard("Total blocking", metrics.tbt) +
          metricCard("Layout shift", metrics.cls) +
          metricCard("Speed index", metrics.si);

        var perf = scores.performance;
        var verdict = perf == null ? "Here's your snapshot." :
          perf >= 90 ? "Strong foundation, and there's still room to convert more of that traffic." :
          perf >= 50 ? "Decent, but real speed and SEO gains are on the table." :
          "There's significant upside here: speed and SEO are costing you visitors.";
        summary.textContent = verdict + " The full audit shows exactly what to fix and why.";

        results.hidden = false;
        setHint("Checked " + target + " · mobile. Want the full breakdown with fixes? Book the free audit.", false);
      };

      var request;
      if (BACKEND_URL) {
        // Backend path: the PageSpeed key stays server-side.
        request = fetch(BACKEND_URL + "/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target, strategy: "mobile" })
        })
          .then(function (res) {
            if (!res.ok) throw new Error("audit " + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data.ok) throw new Error(data.error || "audit failed");
            render(data.scores || {}, data.metrics || {});
          });
      } else {
        // Standalone path: call Google directly with the client key.
        var api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
        var params = "?url=" + encodeURIComponent(target) +
                     "&strategy=mobile" +
                     "&category=performance&category=seo&category=accessibility&category=best-practices";
        if (PSI_API_KEY) params += "&key=" + PSI_API_KEY;

        request = fetch(api + params)
          .then(function (res) {
            if (!res.ok) throw new Error("PSI " + res.status);
            return res.json();
          })
          .then(function (data) {
            var lh = data.lighthouseResult;
            if (!lh) throw new Error("No result");
            var cats = lh.categories || {};
            var au = lh.audits || {};
            var pct = function (c) { return c && typeof c.score === "number" ? Math.round(c.score * 100) : null; };
            var dv = function (k) { return au[k] && au[k].displayValue ? au[k].displayValue : "—"; };

            render({
              performance: pct(cats.performance),
              seo: pct(cats.seo),
              accessibility: pct(cats.accessibility),
              best_practices: pct(cats["best-practices"])
            }, {
              lcp: dv("largest-contentful-paint"),
              tbt: dv("total-blocking-time"),
              cls: dv("cumulative-layout-shift"),
              si: dv("speed-index")
            });
          });
      }

      request
        .catch(function () {
          setHint("Couldn't run the live check right now (the free API has limits, and a key may be needed). Send your URL via the form below and we'll run the full audit for you.", true);
          results.hidden = true;
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = oldLabel;
        });
    });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  var submitBtn = document.getElementById("cf-submit");

  function setStatus(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form__status" + (type ? " is-" + type : "");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Native validation
      if (!form.checkValidity()) {
        setStatus("Please fill in all required fields with valid info.", "error");
        form.reportValidity();
        return;
      }

      var data = {
        name: form.name.value.trim(),
        business: form.business.value.trim(),
        email: form.email.value.trim(),
        website: form.website.value.trim(),
        message: form.message.value.trim()
      };

      // ---------------------------------------------------------
      // ENDPOINT: set data-endpoint="..." on the <form> in HTML to
      // POST submissions (Formspree / Web3Forms / Netlify, etc.).
      // If empty, falls back to opening the user's email client.
      // ---------------------------------------------------------
      var endpoint = form.getAttribute("data-endpoint");

      if (endpoint) {
        if (submitBtn) submitBtn.disabled = true;
        setStatus("Sending…", "");
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(data)
        })
          .then(function (res) {
            if (!res.ok) throw new Error("Request failed");
            form.reset();
            setStatus("Thanks, your message is on its way. We'll reply within one business day.", "success");
          })
          .catch(function () {
            setStatus("Something went wrong. Please email skvkpandey@gmail.com directly.", "error");
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      } else {
        // mailto fallback
        var subject = "Website enquiry: " + (data.business || data.name);
        var body =
          "Name: " + data.name + "\n" +
          "Business: " + data.business + "\n" +
          "Email: " + data.email + "\n" +
          "Website: " + (data.website || "—") + "\n\n" +
          data.message;
        window.location.href =
          "mailto:skvkpandey@gmail.com?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
        setStatus("Opening your email app… If nothing happens, write to skvkpandey@gmail.com.", "success");
      }
    });
  }

  /* ---------- Play case-study video only while it's on screen ----------
     The clip ships with preload="none" and a poster, so nothing downloads
     until the card scrolls into view. Pausing on exit keeps it off the
     main thread for the rest of the page. Respects reduced-motion. */
  var lazyVideos = document.querySelectorAll("video[data-autoplay-in-view]");
  if (lazyVideos.length && "IntersectionObserver" in window) {
    if (reduceMotion) {
      // Leave the poster showing and give the visitor manual controls.
      Array.prototype.forEach.call(lazyVideos, function (v) { v.setAttribute("controls", ""); });
    } else {
      var vidIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            if (v.preload !== "auto") v.preload = "auto";
            var p = v.play();
            if (p && p.catch) p.catch(function () { v.setAttribute("controls", ""); });
          } else if (!v.paused) {
            v.pause();
          }
        });
      }, { threshold: 0.25 });
      Array.prototype.forEach.call(lazyVideos, function (v) { vidIo.observe(v); });
    }
  }
})();
