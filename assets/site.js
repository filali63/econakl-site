const storyBlocks = document.querySelectorAll("[data-reveal-stories]");

if ("IntersectionObserver" in window) {
  const storyObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("stories-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.24 }
  );

  storyBlocks.forEach((block) => storyObserver.observe(block));
} else {
  storyBlocks.forEach((block) => block.classList.add("stories-visible"));
}

const body = document.body;
const nav = document.querySelector(".navbar");
const navPill = document.querySelector(".nav-pill");
const navLinks = document.querySelector(".nav-links");
const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
const labels = {
  openMenu: isEnglish ? "Open menu" : "Ouvrir le menu",
  closeMenu: isEnglish ? "Close menu" : "Fermer le menu",
  missingForm: isEnglish
    ? "Add your name, email and shipment details before sending."
    : "Ajoutez votre nom, votre email et les details de l'expédition avant l'envoi.",
  emailReady: isEnglish
    ? "Your email app will open with the request prepared. You can send it from your mailbox."
    : "Votre application email va s'ouvrir avec la demande preparee. Vous pourrez l'envoyer depuis votre messagerie.",
  subject: isEnglish ? "ECONAKL request" : "Demande ECONAKL",
  defaultScope: isEnglish ? "Shipment review" : "Revue d'expédition",
  unspecifiedScope: isEnglish ? "Not specified" : "Non precise",
  name: isEnglish ? "Name" : "Nom",
  professionalEmail: isEnglish ? "Professional email" : "Email professionnel",
  requestType: isEnglish ? "Request type" : "Type de demande",
  shipmentDetails: isEnglish ? "Shipment details" : "Details expédition",
};

if (nav && navPill && navLinks) {
  body.classList.add("has-mobile-nav");
  navLinks.id = navLinks.id || "main-navigation";

  if (!document.querySelector(".nav-toggle")) {
    const navToggle = document.createElement("button");
    navToggle.className = "nav-toggle";
    navToggle.type = "button";
    navToggle.setAttribute("aria-label", labels.openMenu);
    navToggle.setAttribute("aria-controls", navLinks.id);
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.innerHTML = '<span class="nav-toggle-lines" aria-hidden="true"></span>';
    navPill.appendChild(navToggle);

    const closeMenu = () => {
      body.classList.remove("mobile-nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", labels.openMenu);
    };

    const openMenu = () => {
      body.classList.add("mobile-nav-open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", labels.closeMenu);
    };

    navToggle.addEventListener("click", () => {
      if (body.classList.contains("mobile-nav-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!body.classList.contains("mobile-nav-open")) return;
      if (nav.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }
}

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const mailTarget = contactForm.dataset.mailto || "contact@econakl.com";

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const scope = String(formData.get("scope") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      if (status) {
        status.textContent = labels.missingForm;
        status.classList.add("is-visible");
      }
      return;
    }

    const subject = encodeURIComponent(`${labels.subject} - ${scope || labels.defaultScope}`);
    const bodyLines = [
      `${labels.name}: ${name}`,
      `${labels.professionalEmail}: ${email}`,
      `${labels.requestType}: ${scope || labels.unspecifiedScope}`,
      "",
      `${labels.shipmentDetails}:`,
      message,
    ];
    const mailto = `mailto:${mailTarget}?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    if (status) {
      status.textContent = labels.emailReady;
      status.classList.add("is-visible");
    }

    window.location.href = mailto;
  });
}
