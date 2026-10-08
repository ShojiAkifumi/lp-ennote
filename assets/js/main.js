/* ENNOTE 価値観診断LP */
(function () {
  "use strict";

  var DIAGNOSIS_URL = "https://ennote.com/diagnosis";
  var KEEP_PARAMS = /^(utm_|gclid$|fbclid$|yclid$|ldtag_cl$)/;

  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var data = { event: event };
    for (var k in params) data[k] = params[k];
    window.dataLayer.push(data);
  }

  // 申し込みボタン：広告パラメータを診断ページへ引き継ぐ
  function buildDiagnosisUrl() {
    var src = new URLSearchParams(location.search);
    var url = new URL(DIAGNOSIS_URL);
    src.forEach(function (v, k) {
      if (KEEP_PARAMS.test(k)) url.searchParams.set(k, v);
    });
    return url.toString();
  }

  var ctaHref = buildDiagnosisUrl();
  document.querySelectorAll("a[data-cta]").forEach(function (a) {
    a.href = ctaHref;
    a.addEventListener("click", function () {
      track("cta_click", { cta_position: a.getAttribute("data-cta") });
    });
  });

  // ヘッダー：スクロールしたら白背景に
  var header = document.querySelector(".hdr");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // スマホ追従ボタン：ファーストビューのボタンが見えなくなったら表示。
  // 最後の呼びかけのボタンとフッターが見えている間は隠す
  var spf = document.querySelector(".spf");
  if (spf && "IntersectionObserver" in window) {
    var state = { fv: true, closing: false, footer: false };
    var targets = {
      fv: document.querySelector('[data-cta-area="fv"]'),
      closing: document.querySelector('[data-cta-area="closing"]'),
      footer: document.getElementById("footer"),
    };
    var update = function () {
      var show = !state.fv && !state.closing && !state.footer;
      spf.classList.toggle("is-show", show);
      spf.setAttribute("aria-hidden", show ? "false" : "true");
      spf.tabIndex = show ? 0 : -1;
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var key = e.target.getAttribute("data-spf-key");
        // ファーストビューは「画面より上に抜けたら」非表示扱いを解除
        state[key] = key === "fv" ? e.isIntersecting || e.boundingClientRect.top > 0 : e.isIntersecting;
      });
      update();
    });
    Object.keys(targets).forEach(function (k) {
      if (targets[k]) {
        targets[k].setAttribute("data-spf-key", k);
        io.observe(targets[k]);
      }
    });
  }

  // よくある質問：開いた質問を計測
  document.querySelectorAll(".fq details").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) track("faq_open", { faq_question: d.querySelector("summary").textContent.replace(/^Q/, "").trim() });
    });
  });

  // スクロール量（25・50・75・90%）を計測
  var marks = [25, 50, 75, 90],
    sent = {};
  window.addEventListener(
    "scroll",
    function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      var p = (window.scrollY / h) * 100;
      marks.forEach(function (m) {
        if (p >= m && !sent[m]) {
          sent[m] = true;
          track("scroll_depth", { percent: m });
        }
      });
    },
    { passive: true },
  );

  // 期限付きの要素（LP限定特典）を期限後に非表示
  var now = Date.now();
  document.querySelectorAll("[data-expire]").forEach(function (el) {
    var t = Date.parse(el.getAttribute("data-expire"));
    if (!isNaN(t) && now >= t) el.classList.add("is-expired");
  });

  // 数字のカウントアップ（動きを減らす設定の人には行わない）
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nums = document.querySelectorAll("[data-count]");
  if (!reduce && nums.length && "IntersectionObserver" in window) {
    var countIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          countIo.unobserve(e.target);
          var el = e.target,
            to = parseFloat(el.getAttribute("data-count"));
          var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
          var start = null,
            dur = 1200;
          var step = function (ts) {
            if (!start) start = ts;
            var r = Math.min(1, (ts - start) / dur);
            el.textContent = (to * (1 - Math.pow(1 - r, 3))).toFixed(dec);
            if (r < 1) requestAnimationFrame(step);
            else el.textContent = el.getAttribute("data-count");
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.6 },
    );
    nums.forEach(function (n) {
      countIo.observe(n);
    });
  }
})();
