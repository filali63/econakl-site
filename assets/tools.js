/* ECONAKL Transport — petits outils de page (aucune dépendance).
   1. Vérification indicative du gabarit : form[data-gabarit-check]
      Limites : décret n° 2-10-421 (largeur 2,55 m, hauteur 4 m, longueur 16,50 m
      pour un véhicule articulé, 40 t de poids total roulant).
      Catégories autoroute : classification d'Autoroutes du Maroc.
   2. Bouton d'impression : [data-print]
   3. Pré-remplissage du formulaire de devis depuis l'adresse (?l=&w=&h=&p=) */
(() => {
  "use strict";
  const doc = document;
  const en = (doc.documentElement.lang || "fr").toLowerCase().startsWith("en");
  const LIMITS = { longueur: 16.5, largeur: 2.55, hauteur: 4, poids: 40 };
  const UNIT = { longueur: "m", largeur: "m", hauteur: "m", poids: "t" };

  const t = en
    ? {
        names: { longueur: "Length", largeur: "Width", hauteur: "Height", poids: "Weight" },
        over: (n, v, l) => `${n} ${v}: over the ${l} limit`,
        ok: (n, v, l) => `${n} ${v}: within the ${l} limit`,
        empty: "Enter at least one measurement of your cargo.",
        exTitle: "Abnormal load: a permit is required",
        okTitle: "Your cargo alone is within the road limits",
        okText: "To be confirmed once loaded: the height of the trailer deck and the weight of the truck are added to those of the cargo.",
        exText: "These limits apply to the loaded convoy. The height of the trailer deck and the weight of the truck are added to those of the cargo.",
        cat: (c) => `On the motorway (Autoroutes du Maroc classification): category ${c}.`,
        cta: "Request a quote with these measurements",
        fmt: (v) => String(v),
      }
    : {
        names: { longueur: "Longueur", largeur: "Largeur", hauteur: "Hauteur", poids: "Poids" },
        over: (n, v, l) => `${n} ${v} : dépasse la limite de ${l}`,
        ok: (n, v, l) => `${n} ${v} : dans la limite de ${l}`,
        empty: "Indiquez au moins une mesure de votre colis.",
        exTitle: "Transport exceptionnel : une autorisation est nécessaire",
        okTitle: "Votre colis seul reste dans les limites routières",
        okText: "À confirmer une fois chargé : la hauteur du plateau de la remorque et le poids du camion s’ajoutent à ceux du colis.",
        exText: "Ces limites concernent le convoi chargé. La hauteur du plateau de la remorque et le poids du camion s’ajoutent à ceux du colis.",
        cat: (c) => `Sur autoroute (classification d’Autoroutes du Maroc) : ${c === 1 ? "1re" : c + "e"} catégorie.`,
        cta: "Demander un devis avec ces mesures",
        fmt: (v) => String(v).replace(".", ","),
      };

  const num = (v) => {
    const n = parseFloat(String(v || "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  /* ---------- 1. Vérification du gabarit ---------- */
  const check = doc.querySelector("[data-gabarit-check]");
  if (check) {
    const out = check.querySelector("[data-check-result]");
    check.addEventListener("submit", (event) => {
      event.preventDefault();
      const v = {};
      Object.keys(LIMITS).forEach((k) => (v[k] = num(check.elements[k] && check.elements[k].value)));
      out.hidden = false;
      out.replaceChildren();
      out.classList.remove("is-over", "is-ok");
      if (!Object.values(v).some(Boolean)) {
        out.append(el("p", "", t.empty));
        return;
      }
      const over = Object.keys(LIMITS).filter((k) => v[k] && v[k] > LIMITS[k]);
      out.classList.add(over.length ? "is-over" : "is-ok");
      out.append(el("h3", "", over.length ? t.exTitle : t.okTitle));
      const ul = el("ul", "checker-list");
      Object.keys(LIMITS).forEach((k) => {
        if (!v[k]) return;
        const isOver = v[k] > LIMITS[k];
        const txt = (isOver ? t.over : t.ok)(t.names[k], `${t.fmt(v[k])} ${UNIT[k]}`, `${t.fmt(LIMITS[k])} ${UNIT[k]}`);
        ul.append(el("li", isOver ? "over" : "", txt));
      });
      out.append(ul);
      if (over.length) {
        // Catégorie autoroute : la plus élevée des trois mesures classées (longueur, largeur, masse)
        const c = Math.max(
          v.longueur ? (v.longueur > 26 ? 3 : v.longueur >= 18 ? 2 : 1) : 1,
          v.largeur ? (v.largeur > 3.5 ? 3 : v.largeur >= 3 ? 2 : 1) : 1,
          v.poids ? (v.poids > 70 ? 3 : v.poids >= 45 ? 2 : 1) : 1
        );
        out.append(el("p", "", t.cat(c)));
      }
      out.append(el("p", "", over.length ? t.exText : t.okText));
      const q = new URLSearchParams();
      if (v.longueur) q.set("l", v.longueur);
      if (v.largeur) q.set("w", v.largeur);
      if (v.hauteur) q.set("h", v.hauteur);
      if (v.poids) q.set("p", v.poids);
      const a = el("a", "btn btn-primary", t.cta);
      a.href = `./contact.html?${q.toString()}#devis`;
      out.append(a);
    });
  }

  /* ---------- 2. Impression ---------- */
  doc.querySelectorAll("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));

  /* ---------- 3. Pré-remplissage du devis ---------- */
  const quote = doc.querySelector("[data-quote-form]");
  if (quote && window.location.search) {
    const p = new URLSearchParams(window.location.search);
    const map = { l: "longueur_m", w: "largeur_m", h: "hauteur_m", p: "poids_t" };
    Object.keys(map).forEach((k) => {
      const n = num(p.get(k));
      const f = quote.elements[map[k]];
      if (n && f && !f.value) f.value = n;
    });
  }
})();
