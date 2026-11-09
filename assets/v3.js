(() => {
  "use strict";

  /* ---------- Header ---------- */
  const top = document.getElementById("top");
  const burger = document.querySelector(".burger");
  const onScroll = () => top && top.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (burger) {
    burger.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    document.querySelectorAll("#menu a").forEach((a) =>
      a.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- Corridor graph (schematic coordinates, approximate road km) ---------- */
  const N = {
    paris:      { name: "Paris",      x: 265, y: 30,  side: "r" },
    madrid:     { name: "Madrid",     x: 265, y: 85, side: "r" },
    algeciras:  { name: "Algeciras",  x: 265, y: 140, side: "r" },
    tanger:     { name: "Tanger Med", x: 200, y: 205, side: "l", hub: true },
    kenitra:    { name: "Kénitra",    x: 200, y: 255, side: "l" },
    casa:       { name: "Casablanca", x: 200, y: 305, side: "l", hub: true },
    marrakech:  { name: "Marrakech",  x: 200, y: 360, side: "l" },
    ouarzazate: { name: "Ouarzazate", x: 250, y: 410, side: "r" },
    agadir:     { name: "Agadir",     x: 200, y: 425, side: "l", hub: true },
    laayoune:   { name: "Laâyoune",   x: 200, y: 485, side: "l" },
    dakhla:     { name: "Dakhla",     x: 200, y: 540, side: "l" },
    nouakchott: { name: "Nouakchott", x: 200, y: 595, side: "l" },
    dakar:      { name: "Dakar",      x: 200, y: 645, side: "l" },
  };
  const E = [
    ["paris", "madrid", 1270],
    ["madrid", "algeciras", 660],
    ["algeciras", "tanger", 40, "ferry"],
    ["tanger", "kenitra", 240],
    ["kenitra", "casa", 130],
    ["casa", "marrakech", 240],
    ["marrakech", "ouarzazate", 200],
    ["marrakech", "agadir", 250],
    ["agadir", "laayoune", 640],
    ["laayoune", "dakhla", 520],
    ["dakhla", "nouakchott", 800],
    ["nouakchott", "dakar", 500],
  ];
  const CROSS = {
    "algeciras|tanger": "Détroit (ferry)",
    "dakhla|nouakchott": "Frontière Guerguerat",
    "dakar|nouakchott": "Frontière Rosso",
  };
  const key = (a, b) => [a, b].sort().join("|");
  const adj = {};
  E.forEach(([a, b, km, type]) => {
    (adj[a] = adj[a] || []).push({ to: b, km, type });
    (adj[b] = adj[b] || []).push({ to: a, km, type });
  });

  const svgNS = "http://www.w3.org/2000/svg";
  const edgesG = document.getElementById("edges");
  const nodesG = document.getElementById("nodes");
  const routeEl = document.getElementById("route");
  const nodeEls = {};

  if (edgesG && nodesG) {
    E.forEach(([a, b, , type]) => {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", N[a].x); l.setAttribute("y1", N[a].y);
      l.setAttribute("x2", N[b].x); l.setAttribute("y2", N[b].y);
      l.setAttribute("class", "m-edge" + (type === "ferry" ? " ferry" : ""));
      edgesG.appendChild(l);
    });
    Object.entries(N).forEach(([id, n]) => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "m-node" + (n.hub ? " hub" : ""));
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", n.x); c.setAttribute("cy", n.y); c.setAttribute("r", n.hub ? 9 : 7);
      const t = document.createElementNS(svgNS, "text");
      t.textContent = n.name;
      t.setAttribute("y", n.y + 5);
      if (n.side === "l") { t.setAttribute("x", n.x - 20); t.setAttribute("text-anchor", "end"); }
      else { t.setAttribute("x", n.x + 20); }
      g.append(c, t);
      nodesG.appendChild(g);
      nodeEls[id] = g;
    });
  }

  const shortest = (from, to) => {
    const dist = { [from]: 0 }, prev = {}, seen = new Set();
    while (true) {
      let u = null;
      for (const k in dist) if (!seen.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || u === to) break;
      seen.add(u);
      (adj[u] || []).forEach(({ to: v, km }) => {
        const d = dist[u] + km;
        if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; }
      });
    }
    if (dist[to] === undefined) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    return { path, km: dist[to] };
  };

  /* ---------- Planner ---------- */
  const $ = (id) => document.getElementById(id);
  const form = $("planner");
  const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
  const num = (id) => {
    const v = parseFloat(String($(id).value).replace(",", "."));
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  let lastSummary = "";

  const assess = (L, W, H, P) => {
    if (L <= 13.6 && W <= 2.55 && H <= 3 && P <= 24) {
      return { level: 0, tag: "Gabarit standard", title: "Transport routier classique", text: "Votre charge tient sur une semi-remorque standard, sans autorisation particulière." };
    }
    if (L <= 30 && W <= 4.5 && H <= 4.5 && P <= 60) {
      return { level: 1, tag: "Transport exceptionnel", title: "Autorisation et balisage à prévoir", text: "Un dossier de transport exceptionnel est déposé et l’itinéraire adapté au gabarit." };
    }
    return { level: 2, tag: "Convoi lourd", title: "Étude d’itinéraire détaillée à prévoir", text: "Ponts, giratoires et lignes électriques sont vérifiés sur tout le trajet avant le départ." };
  };
  const equipment = (L, W, H, P) => {
    if (P > 60) return "Remorque modulaire";
    if (L > 30) return "Remorque extensible";
    if (H > 3) return "Porte-engins surbaissé";
    if (L > 13.6) return "Remorque extensible";
    return "Semi-remorque plateau";
  };

  const drawRoute = (path) => {
    if (!routeEl) return;
    const d = path.map((id, i) => (i ? "L" : "M") + N[id].x + " " + N[id].y).join(" ");
    routeEl.setAttribute("d", d);
    const len = routeEl.getTotalLength ? routeEl.getTotalLength() : 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    routeEl.style.transition = "none";
    routeEl.style.strokeDasharray = len;
    routeEl.style.strokeDashoffset = reduce ? 0 : len;
    routeEl.getBoundingClientRect();
    routeEl.style.transition = "";
    requestAnimationFrame(() => { routeEl.style.strokeDashoffset = 0; });
    Object.entries(nodeEls).forEach(([id, g]) => {
      g.classList.toggle("on", path.includes(id));
      g.classList.toggle("end", id === path[0] || id === path[path.length - 1]);
    });
  };

  let lastPathKey = "";
  const update = () => {
    if (!form) return;
    const from = $("from").value, to = $("to").value;
    const L = num("len"), W = num("wid"), H = num("hei"), P = num("wei");
    const a = assess(L, W, H, P);
    $("v-main").dataset.level = a.level;
    $("v-tag").textContent = a.tag;
    $("v-title").textContent = a.title;
    $("v-text").textContent = a.text;
    $("v-equip").textContent = equipment(L, W, H, P);
    $("v-escort").textContent = a.level === 2 ? "Probable" : W > 3 ? "Véhicule pilote" : "Non requise";

    const r = from === to ? { path: [from], km: 0 } : shortest(from, to);
    const crossings = [];
    if (r) for (let i = 1; i < r.path.length; i++) {
      const c = CROSS[key(r.path[i - 1], r.path[i])];
      if (c) crossings.push(c);
    }
    if (r && ["madrid", "paris", "algeciras"].includes(to)) crossings.push("Douane UE");
    $("v-dist").textContent = r && r.km ? "≈ " + fmt(r.km) + " km" : "Sur site";
    $("v-cross").textContent = crossings.length ? crossings.join(", ") : "Aucun";
    const label = N[from].name + " vers " + N[to].name;
    $("map-route").textContent = from === to ? "Livraison locale, " + N[from].name : label;

    const pk = from + ">" + to;
    if (r && pk !== lastPathKey) { drawRoute(r.path); lastPathKey = pk; }

    lastSummary =
      "Trajet : " + label + "\n" +
      "Dimensions : " + [L, W, H].map((v) => String(v).replace(".", ",")).join(" × ") + " m, " + String(P).replace(".", ",") + " t\n" +
      "Lecture indicative du site : " + a.tag + ", " + equipment(L, W, H, P).toLowerCase() + "\n" +
      "Date souhaitée : ";
  };

  if (form) {
    form.addEventListener("input", (e) => {
      if (e.target.matches("input")) document.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      update();
    });
    form.addEventListener("change", update);
    form.addEventListener("submit", (e) => e.preventDefault());
    document.querySelectorAll("[data-preset]").forEach((b, i) => {
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", () => {
        const [L, W, H, P] = b.dataset.preset.split(",");
        $("len").value = L; $("wid").value = W; $("hei").value = H; $("wei").value = P;
        document.querySelectorAll("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        update();
      });
    });
    $("send-plan").addEventListener("click", () => {
      const msg = $("q-msg");
      msg.value = lastSummary;
      document.getElementById("devis").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("q-name").focus({ preventScroll: true }), 500);
    });
    update();
  }

  /* ---------- Quote form (mailto) ---------- */
  const quote = $("quote");
  if (quote) {
    quote.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = $("q-status");
      const name = $("q-name").value.trim(), email = $("q-email").value.trim(), msg = $("q-msg").value.trim();
      if (!name || !email || !msg || !/^\S+@\S+\.\S+$/.test(email)) {
        status.textContent = "Indiquez votre nom, un email valide et la description de la charge.";
        status.classList.add("err");
        (!name ? $("q-name") : !email || !/^\S+@\S+\.\S+$/.test(email) ? $("q-email") : $("q-msg")).focus();
        return;
      }
      status.classList.remove("err");
      status.textContent = "Votre messagerie s’ouvre avec la demande prête à envoyer.";
      const body = [
        "Nom : " + name,
        "Société : " + $("q-company").value.trim(),
        "Email : " + email,
        "Téléphone : " + $("q-phone").value.trim(),
        "",
        msg,
      ].join("\n");
      window.location.href = "mailto:contact@econakl.com?subject=" + encodeURIComponent("Demande d’étude de route, " + (($("q-company").value.trim()) || name)) + "&body=" + encodeURIComponent(body);
    });
  }
})();
