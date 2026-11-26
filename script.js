/* Anzato · script.js · no dependencies */
(function () {
  "use strict";

  /* ---------- Settings you may want to change ---------- */
  var CONTACT_EMAIL = "contact@ansatzalgo.com";
  var BOOKING_URL = "https://calendly.com/skvkpandey/30min";

  // PageSpeed Insights key (restrict it to anzato.com in Google Cloud).
  var PSI_API_KEY = ""; // set your own key, restricted to your domain (see README)
  // Optional: your deployed Anzato backend, e.g. "https://api.anzato.com".
  // When set, the check runs through it and the key never reaches the browser.
  var BACKEND_URL = "";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Year ---------- */
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Nav ---------- */
  var nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
  var mobileCta = $(".mobile-cta"), hero = $("#top"), contact = $("#contact");
  function onScroll() {
    var yPos = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", yPos > 8);
    if (mobileCta && hero && contact) {
      var pastHero = yPos > hero.offsetHeight - 80;
      var atContact = yPos + window.innerHeight > contact.offsetTop + 120;
      mobileCta.classList.toggle("is-shown", pastHero && !atContact);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("is-open", !open);
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
      });
    });
  }

  /* ---------- Before / after slider ---------- */
  var compare = $("#compare"), range = $("#compareRange");
  if (compare && range) {
    var setPos = function () { compare.style.setProperty("--pos", range.value + "%"); };
    range.addEventListener("input", setPos);
    setPos();
  }

  /* ---------- Free site check (Google PageSpeed Insights) ---------- */
  var auditForm = $("#auditForm");
  if (auditForm) {
    var input = $("#auditUrl"), btn = $("#auditBtn"), hint = $("#auditHint");
    var panel = auditForm.closest(".check"), next = $("#auditNext");
    var defaultHint = hint.textContent;

    var normalise = function (v) {
      v = (v || "").trim();
      if (!v) return "";
      if (!/^https?:\/\//i.test(v)) v = "https://" + v;
      try { var u = new URL(v); return u.hostname.indexOf(".") > 0 ? u.href : ""; } catch (e) { return ""; }
    };
    var grade = function (n) { return n == null ? "" : n >= 90 ? "good" : n >= 50 ? "ok" : "bad"; };
    var setHint = function (t, err) { hint.textContent = t; hint.classList.toggle("is-error", !!err); };

    var render = function (scores, metrics, target) {
      $$(".score", panel).forEach(function (el) {
        var v = scores[el.getAttribute("data-key")];
        el.classList.remove("good", "ok", "bad");
        if (v != null) el.classList.add(grade(v));
        $("b", el).textContent = v == null ? "–" : v;
      });
      ["lcp", "cls", "tbt"].forEach(function (k) {
        var el = $('[data-m="' + k + '"]', panel); if (el) el.textContent = metrics[k] || "–";
      });
      var p = scores.performance;
      var verdict = p == null ? "Here is your snapshot." :
        p >= 90 ? "Fast. The next gains are in search visibility and conversion." :
        p >= 50 ? "Middling. Visitors on phones are waiting longer than they should." :
        "Slow on mobile. This is very likely costing you enquiries.";
      setHint(verdict + " Checked " + new URL(target).hostname + " on mobile.", false);
      if (next) next.hidden = false;
    };

    var runDirect = function (target) {
      var q = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=" + encodeURIComponent(target) +
        "&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices";
      if (PSI_API_KEY) q += "&key=" + PSI_API_KEY;
      return fetch(q).then(function (r) { if (!r.ok) throw new Error("PSI " + r.status); return r.json(); })
        .then(function (d) {
          var lh = d.lighthouseResult; if (!lh) throw new Error("no result");
          var c = lh.categories || {}, a = lh.audits || {};
          var pct = function (x) { return x && typeof x.score === "number" ? Math.round(x.score * 100) : null; };
          var dv = function (k) { return a[k] && a[k].displayValue ? a[k].displayValue.replace(/ /g, " ") : "–"; };
          return {
            scores: { performance: pct(c.performance), seo: pct(c.seo), accessibility: pct(c.accessibility), "best-practices": pct(c["best-practices"]) },
            metrics: { lcp: dv("largest-contentful-paint"), cls: dv("cumulative-layout-shift"), tbt: dv("total-blocking-time") }
          };
        });
    };
    var runBackend = function (target) {
      return fetch(BACKEND_URL + "/api/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, strategy: "mobile" })
      }).then(function (r) { if (!r.ok) throw new Error("audit " + r.status); return r.json(); })
        .then(function (d) { if (!d.ok) throw new Error(d.error || "audit failed"); return { scores: d.scores || {}, metrics: d.metrics || {} }; });
    };

    auditForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var target = normalise(input.value);
      if (!target) { setHint("Enter a full web address, for example yourcompany.com.", true); input.focus(); return; }
      btn.disabled = true; btn.textContent = "Checking…";
      panel.classList.add("is-loading");
      setHint("Running Lighthouse on mobile. This usually takes 20 to 40 seconds.", false);
      (BACKEND_URL ? runBackend(target) : runDirect(target))
        .then(function (res) { render(res.scores, res.metrics, target); })
        .catch(function () {
          setHint("The check could not reach that site, or Google's free quota is busy. Try again in a minute, or book a call and we will run a full audit.", true);
          if (next) next.hidden = false;
        })
        .finally(function () {
          btn.disabled = false; btn.textContent = "Check my site";
          panel.classList.remove("is-loading");
        });
    });
    input.addEventListener("input", function () { if (hint.classList.contains("is-error")) setHint(defaultHint, false); });
  }

  /* ---------- Currency switch (USD / INR) ----------
     Prices live in data-usd / data-inr attributes in index.html.
     Visitors whose browser is set to Indian time see INR first. */
  var curButtons = $$(".cur button");
  if (curButtons.length) {
    var setCurrency = function (c) {
      $$("[data-usd]").forEach(function (el) {
        var v = el.getAttribute("data-" + c); if (v) el.textContent = v;
      });
      curButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cur") === c)); });
      try { localStorage.setItem("anzato-cur", c); } catch (e) {}
    };
    var start = "usd";
    try {
      var saved = localStorage.getItem("anzato-cur");
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      start = saved || (/^Asia\/(Kolkata|Calcutta)$/.test(tz) ? "inr" : "usd");
    } catch (e) {}
    if (start !== "usd") setCurrency(start);
    curButtons.forEach(function (b) {
      b.addEventListener("click", function () { setCurrency(b.getAttribute("data-cur")); });
    });
  }

  /* ---------- Copy email address buttons ---------- */
  $$(".copy[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy this address:", text); });
      } else {
        window.prompt("Copy this address:", text);
      }
    });
  });
})();
