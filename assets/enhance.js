(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const root = document.documentElement;

  /* ---------- Défilement fluide (Lenis, ordinateur uniquement) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Barre de progression ---------- */
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  /* ---------- Navigation qui se cache en descendant ---------- */
  const nav = document.querySelector(".navbar");
  let lastY = window.scrollY;

  /* ---------- Parallaxe ---------- */
  const heroImg = document.querySelector(".hero-photo img");
  const stage = document.querySelector(".glass-stage");
  const stageImg = stage && stage.querySelector(":scope > img");

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";

    if (nav) {
      nav.classList.toggle("is-scrolled", y > 40);
      const menuOpen = document.body.classList.contains("mobile-nav-open");
      if (!reduce && !menuOpen && y > 260 && y > lastY + 4) nav.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 260) nav.classList.remove("is-hidden");
    }
    lastY = y;

    if (reduce) return;
    if (heroImg && y < window.innerHeight * 1.4) {
      heroImg.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0) scale(1.12)";
    }
    if (stageImg) {
      const r = stage.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - r.top / window.innerHeight));
      stageImg.style.transform = "scale(" + (1.15 - 0.15 * p).toFixed(3) + ")";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (reduce) return;
  root.classList.add("fx");

  /* ---------- Apparitions au défilement ---------- */
  const wrapLines = (el) => {
    // Coupe le titre en mots pour une révélation ligne par ligne, sans casser le HTML interne.
    if (el.dataset.split) return;
    el.dataset.split = "1";
    const words = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => words.push(w));
      else words.push(n);
    });
    el.textContent = "";
    let i = 0;
    words.forEach((w) => {
      if (typeof w === "string") {
        if (!w) return;
        if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(" ")); return; }
        const o = document.createElement("span"); o.className = "rv-line";
        const s = document.createElement("span"); s.textContent = w; s.style.setProperty("--d", i++ * 35 + "ms");
        o.appendChild(s); el.appendChild(o);
      } else {
        const o = document.createElement("span"); o.className = "rv-line";
        const s = document.createElement("span"); s.style.setProperty("--d", i++ * 35 + "ms");
        s.appendChild(w); o.appendChild(s); el.appendChild(o);
      }
    });
  };

  document.querySelectorAll(".section h2:not(.glass-panel h2), .page-hero h1").forEach((h) => {
    if (h.closest(".hero")) return;
    wrapLines(h);
    h.classList.add("rv-title");
  });

  const groups = [
    ".section-header > p", ".section-header .kicker",
    ".service-card", ".metric", ".panel", ".city-card", ".timeline-step",
    ".route-table-wrap", ".product-card", ".callout", ".map-info", ".visual-caption", ".office-card", ".contact-card"
  ];
  document.querySelectorAll(groups.join(",")).forEach((el) => {
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(groups.join(","))) : [];
    el.classList.add("rv");
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6) * 90 + "ms");
  });
  document.querySelectorAll(".visual-tile img, .product-card > img, .world-map-card").forEach((el) => el.classList.add("rv-img"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".rv, .rv-img, .rv-title").forEach((el) => io.observe(el));

  if (!finePointer) return;

  /* ---------- Hero : cartes qui suivent légèrement la souris ---------- */
  const hero = document.querySelector(".hero");
  const cards = [...document.querySelectorAll(".hero-card, .floating-card")];
  if (hero && cards.length) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach((c, i) => {
        const k = i ? -14 : 18;
        c.style.transform = "translate3d(" + (x * k).toFixed(1) + "px," + (y * k).toFixed(1) + "px,0)";
      });
    });
    hero.addEventListener("pointerleave", () => cards.forEach((c) => (c.style.transform = "")));
  }

  /* ---------- Lumière qui suit le curseur sur les cartes ---------- */
  document.querySelectorAll(".service-card, .panel, .city-card").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ---------- Boutons magnétiques ---------- */
  document.querySelectorAll(".btn-primary, .btn-light").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      b.style.transform = "translate(" + (x * 0.18).toFixed(1) + "px," + (y * 0.28).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });
})();
