/* ECONAKL Transport — scripts du site.
   1. Menu mobile accessible
   2. Formulaire de demande de devis (validation + email pré-rempli vers contact@econakl.com)
   Aucune animation, aucun observateur de défilement. Chaque bloc ne s'exécute que si
   les éléments existent sur la page. */
(() => {
  "use strict";

  const doc = document;
  const body = doc.body;
  const isEnglish = (doc.documentElement.lang || "").toLowerCase().startsWith("en");
  const MAIL_TO = "contact@econakl.com";

  /* ------------------------------------------------------------------
     1. Menu mobile
     - bouton placé AVANT les liens dans le DOM (Tab entre dans le menu)
     - aria-expanded / aria-controls / libellé ouvrir-fermer
     - menu fermé : liens masqués (visibility: hidden en CSS) et inert
     - Échap ferme et rend le focus au bouton ; clic hors du menu ferme
     - piège de focus léger : Tab boucle entre le bouton et les liens
     ------------------------------------------------------------------ */
  const nav = doc.querySelector(".navbar");
  const navLinks = doc.querySelector(".nav-links");

  if (nav && navLinks) {
    const mobileQuery = window.matchMedia("(max-width: 980px)");
    const labels = isEnglish
      ? { open: "Open menu", close: "Close menu" }
      : { open: "Ouvrir le menu", close: "Fermer le menu" };

    navLinks.id = navLinks.id || "navigation-principale";
    body.classList.add("has-mobile-nav");

    // Le HTML peut déjà contenir le bouton : on le réutilise, sinon on le crée.
    let toggle = nav.querySelector(".nav-toggle");
    if (!toggle) {
      toggle = doc.createElement("button");
      toggle.className = "nav-toggle";
      toggle.type = "button";
    }
    if (!toggle.querySelector(".nav-toggle-lines")) {
      const lines = doc.createElement("span");
      lines.className = "nav-toggle-lines";
      lines.setAttribute("aria-hidden", "true");
      toggle.appendChild(lines);
    }
    if (toggle.nextElementSibling !== navLinks) navLinks.parentNode.insertBefore(toggle, navLinks);
    toggle.setAttribute("aria-controls", navLinks.id);

    const isOpen = () => body.classList.contains("mobile-nav-open");
    const focusables = () =>
      [toggle, ...navLinks.querySelectorAll("a[href], button:not([disabled])")].filter(
        (el) => el.offsetParent !== null || el === toggle
      );

    const sync = () => {
      const open = isOpen();
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? labels.close : labels.open);
      // Sur mobile, menu fermé = inaccessible au clavier et aux lecteurs d'écran.
      if (mobileQuery.matches && !open) navLinks.setAttribute("inert", "");
      else navLinks.removeAttribute("inert");
    };

    const openMenu = () => {
      body.classList.add("mobile-nav-open");
      sync();
    };
    const closeMenu = (returnFocus) => {
      if (!isOpen()) return;
      body.classList.remove("mobile-nav-open");
      sync();
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => (isOpen() ? closeMenu(false) : openMenu()));

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu(false);
    });

    doc.addEventListener("click", (event) => {
      if (isOpen() && !nav.contains(event.target)) closeMenu(false);
    });

    doc.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && doc.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && doc.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // Retour au format bureau : le menu redevient une barre normale.
    const onBreakpoint = () => {
      if (!mobileQuery.matches) body.classList.remove("mobile-nav-open");
      sync();
    };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", onBreakpoint);
    else if (mobileQuery.addListener) mobileQuery.addListener(onBreakpoint);

    sync();
  }

  /* ------------------------------------------------------------------
     2. Formulaire de devis
     Formulaire structuré : form[data-quote-form] (champs de la spec 7.3 :
     type_demande, nom, societe, fonction, email, telephone, pays,
     cargo_description, nb_colis, longueur_m, largeur_m, hauteur_m, poids_t,
     dimensions_inconnues, chargement, depart, depart_type, arrivee,
     arrivee_type, date_dispo, date_souhaitee, besoins[], message,
     consentement, entreprise_site [piège à robots]).
     Compatible avec l'ancien form[data-contact-form] (name, email, scope, message).
     Envoi : ouverture de la messagerie avec un email pré-rempli vers
     contact@econakl.com (site statique, pas de service tiers).
     ------------------------------------------------------------------ */
  const form = doc.querySelector("[data-quote-form]") || doc.querySelector("[data-contact-form]");
  if (!form) return;

  const t = isEnglish
    ? {
        missing: "Please complete the required fields (*). They are outlined in red.",
        dims: "Give at least one dimension or the weight, or tick the box if you don't have them yet.",
        dates: "The requested delivery date must be on or after the availability date.",
        ready:
          "Your email app is opening with the request prepared. Send the email so that we receive it. If nothing opens, ",
        readyLink: "click here",
        readyEnd: ` or write to ${MAIL_TO}.`,
        subject: "Quote request",
        intro: "Hello Econakl,\n\nPlease find my transport request below.",
        yes: "Yes",
        sep: ": ",
        unknown: "to be confirmed",
      }
    : {
        missing: "Complétez les champs obligatoires (*). Ils sont signalés en rouge.",
        dims: "Indiquez au moins une dimension ou le poids, ou cochez la case si vous ne les avez pas encore.",
        dates: "La date de livraison souhaitée doit être postérieure ou égale à la date de disponibilité.",
        ready:
          "Votre messagerie s'ouvre avec la demande pré-remplie. Envoyez l'email pour que nous la recevions. Si rien ne s'ouvre, ",
        readyLink: "cliquez ici",
        readyEnd: ` ou écrivez à ${MAIL_TO}.`,
        subject: "Demande de devis",
        intro: "Bonjour Econakl,\n\nVoici ma demande de transport.",
        yes: "Oui",
        sep: " : ",
        unknown: "à confirmer",
      };

  // Validation gérée ici, dans la langue de la page (pas les bulles du navigateur).
  form.noValidate = true;

  const status =
    form.querySelector("[data-form-status]") ||
    (() => {
      const p = doc.createElement("p");
      p.className = "form-status";
      p.setAttribute("data-form-status", "");
      const btn = form.querySelector('[type="submit"]');
      form.insertBefore(p, btn || null);
      return p;
    })();
  status.setAttribute("aria-live", "polite");

  const field = (name) => form.elements.namedItem(name);
  const SKIP = new Set(["access_key", "subject", "from_name", "entreprise_site", "consentement", "redirect", "botcheck"]);
  const DIMS = ["longueur_m", "largeur_m", "hauteur_m", "poids_t"];

  // Date minimale = aujourd'hui (date locale)
  const today = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  })();
  ["date_dispo", "date_souhaitee"].forEach((n) => {
    const el = field(n);
    if (el && el.type === "date" && !el.min) el.min = today;
  });
  const dispo = field("date_dispo");
  const souhaitee = field("date_souhaitee");
  if (dispo && souhaitee) {
    dispo.addEventListener("change", () => {
      souhaitee.min = dispo.value || today;
    });
  }

  // Pré-sélection du type via ?type=partenaire
  const typeParam = new URLSearchParams(window.location.search).get("type");
  const typeSelect = field("type_demande");
  if (typeParam && typeSelect && typeSelect.options) {
    const match = [...typeSelect.options].find((o) => o.value === typeParam);
    if (match) typeSelect.value = typeParam;
  }

  // Pré-remplissage depuis la demande rapide de l'accueil (?depart=…&arrivee=…&poids_t=…)
  const quickParams = new URLSearchParams(window.location.search);
  ["depart", "arrivee", "poids_t"].forEach((name) => {
    const v = quickParams.get(name);
    const el = field(name);
    if (v && el && !el.value) el.value = v.slice(0, 120);
  });

  const showStatus = (content, isError) => {
    status.textContent = "";
    if (typeof content === "string") status.textContent = content;
    else status.appendChild(content);
    status.classList.add("is-visible");
    status.classList.toggle("is-error", Boolean(isError));
    // Erreur : annonce immédiate ; information : annonce polie
    status.setAttribute("role", isError ? "alert" : "status");
  };

  const clearInvalid = (el) => {
    el.removeAttribute("aria-invalid");
  };
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) clearInvalid(e.target);
    if (DIMS.includes(e.target.name) || e.target.name === "dimensions_inconnues") {
      DIMS.forEach((n) => field(n) && clearInvalid(field(n)));
    }
  });
  form.addEventListener("change", (e) => {
    if (e.target.type === "checkbox" && e.target.getAttribute("aria-invalid")) clearInvalid(e.target);
    if (e.target.name === "dimensions_inconnues") DIMS.forEach((n) => field(n) && clearInvalid(field(n)));
  });

  // Libellé lisible d'un champ, pour le corps de l'email
  const labelOf = (el) => {
    let text = "";
    if (el.id) {
      const l = form.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) text = l.textContent;
    }
    if (!text) {
      const wrap = el.closest("label");
      if (wrap) text = wrap.textContent;
    }
    if (!text) text = el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name;
    return text.replace(/\s*\*\s*/g, " ").replace(/\s+/g, " ").trim();
  };
  const groupLabelOf = (el) => {
    const group = el.closest(".field");
    const gl = group && group.querySelector(".field-label");
    return gl ? gl.textContent.trim() : labelOf(el);
  };

  const buildBody = () => {
    const lines = [t.intro, ""];
    let section = null;
    const multi = new Map();
    [...form.elements].forEach((el) => {
      if (!el.name || SKIP.has(el.name) || el.disabled) return;
      if (["hidden", "submit", "button", "reset", "file"].includes(el.type)) return;

      const legend = el.closest("fieldset") && el.closest("fieldset").querySelector("legend");
      const sectionName = legend ? legend.textContent.trim().toUpperCase() : null;
      if (sectionName && sectionName !== section) {
        section = sectionName;
        lines.push("", `— ${section} —`);
      }

      if (el.type === "checkbox") {
        if (!el.checked) return;
        if (el.name.endsWith("[]") || form.querySelectorAll(`[name="${CSS.escape(el.name)}"]`).length > 1) {
          const key = groupLabelOf(el);
          if (!multi.has(key)) {
            multi.set(key, []);
            lines.push({ multi: key });
          }
          multi.get(key).push(labelOf(el));
        } else {
          lines.push(`${labelOf(el)}${t.sep}${t.yes}`);
        }
        return;
      }
      if (el.type === "radio" && !el.checked) return;

      let value = String(el.value || "").trim();
      if (el.tagName === "SELECT" && el.selectedIndex >= 0 && value) {
        value = el.options[el.selectedIndex].text.trim();
      }
      if (!value) return;
      if (el.tagName === "TEXTAREA") lines.push(`${labelOf(el)}${t.sep.trimEnd()}`, value);
      else lines.push(`${labelOf(el)}${t.sep}${value}`);
    });
    return lines
      .map((l) => (typeof l === "string" ? l : `${l.multi}${t.sep}${multi.get(l.multi).join(", ")}`))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const buildSubject = () => {
    const parts = [t.subject];
    const type = typeSelect && typeSelect.value ? typeSelect.options[typeSelect.selectedIndex].text.trim() : "";
    const scope = field("scope") && field("scope").value ? field("scope").value.trim() : "";
    if (type || scope) parts.push(type || scope);
    const dep = field("depart") && field("depart").value.trim();
    const arr = field("arrivee") && field("arrivee").value.trim();
    if (dep && arr) parts.push(`${dep} → ${arr}`);
    const soc = (field("societe") && field("societe").value.trim()) || (field("nom") && field("nom").value.trim()) || (field("name") && field("name").value.trim());
    if (soc) parts.push(soc);
    return `Econakl — ${parts.join(" — ")}`;
  };

  // Secours si aucune messagerie ne s'ouvre : copier la demande dans le presse-papiers
  const copyBtn = form.querySelector("[data-copy-quote]");
  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener("click", () => {
      const text = `${buildSubject()}\n\n${buildBody()}`;
      navigator.clipboard.writeText(text).then(
        () => showStatus(isEnglish ? `Request copied. Paste it into an email to ${MAIL_TO}.` : `Demande copiée. Collez-la dans un e-mail adressé à ${MAIL_TO}.`, false),
        () => showStatus(isEnglish ? `Copy failed. Write to ${MAIL_TO}.` : `La copie a échoué. Écrivez à ${MAIL_TO}.`, true)
      );
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Piège à robots : rempli = envoi ignoré sans message
    const hp = field("entreprise_site");
    if (hp && hp.value) return;

    form.querySelectorAll("[aria-invalid]").forEach(clearInvalid);

    let valid = true;
    let message = t.missing;

    // Champs obligatoires et formats (email, téléphone, bornes numériques…)
    [...form.elements].forEach((el) => {
      if (!el.willValidate || el.type === "hidden" || el.name === "entreprise_site") return;
      // Un champ obligatoire rempli uniquement d'espaces est vide
      if (el.required && el.type !== "checkbox" && el.type !== "radio" && !String(el.value).trim()) {
        el.setAttribute("aria-invalid", "true");
        valid = false;
        return;
      }
      // L'ordre des dates est vérifié plus bas, avec son propre message
      if (el === souhaitee && el.validity.rangeUnderflow && !el.validity.badInput) return;
      if (!el.checkValidity()) {
        el.setAttribute("aria-invalid", "true");
        valid = false;
      }
    });

    // Au moins une dimension ou le poids, ou la case « je ne sais pas encore »
    const dimFields = DIMS.map(field).filter(Boolean);
    const unknown = field("dimensions_inconnues");
    if (dimFields.length && unknown) {
      const hasDim = dimFields.some((el) => String(el.value).trim());
      if (!hasDim && !unknown.checked) {
        dimFields.forEach((el) => el.setAttribute("aria-invalid", "true"));
        if (valid) message = t.dims;
        else message = `${t.missing} ${t.dims}`;
        valid = false;
      }
    }

    // Livraison souhaitée ≥ disponibilité
    if (dispo && souhaitee && dispo.value && souhaitee.value && souhaitee.value < dispo.value) {
      souhaitee.setAttribute("aria-invalid", "true");
      message = valid ? t.dates : `${message} ${t.dates}`;
      valid = false;
    }

    if (!valid) {
      showStatus(message, true);
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(buildSubject())}&body=${encodeURIComponent(buildBody())}`;

    // Confirmation honnête : l'email est préparé, il reste à l'envoyer.
    const frag = doc.createDocumentFragment();
    frag.append(t.ready);
    const link = doc.createElement("a");
    link.href = href;
    link.textContent = t.readyLink;
    frag.append(link, t.readyEnd);
    showStatus(frag, false);

    window.location.href = href;
  });
})();
