const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const year = document.querySelector("#year");
const revealElements = document.querySelectorAll(".reveal");
const consentTriggers = document.querySelectorAll(".cookie-settings-trigger");
const instagramShells = document.querySelectorAll(".instagram-shell");
const CONSENT_STORAGE_KEY = "trueformance_cookie_preferences";
const CONSENT_VERSION = "2026-06-19";
let instagramScriptPromise;

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.15,
    }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

function readConsent() {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CONSENT_VERSION) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(optional) {
  const payload = {
    version: CONSENT_VERSION,
    necessary: true,
    optional,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return payload;
  }

  return payload;
}

function applyConsentState(consent) {
  document.documentElement.dataset.cookieConsent = consent?.optional
    ? "all"
    : "necessary";

  renderInstagramEmbeds(consent);
}

function formatInstagramPermalink(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", "ig_embed");
    parsed.searchParams.set("utm_campaign", "loading");
    return parsed.toString();
  } catch {
    return url;
  }
}

function bindInstagramPlaceholderActions(shell) {
  const consentButton = shell.querySelector("[data-open-consent]");
  if (consentButton) {
    consentButton.addEventListener("click", () => {
      openConsentDialog(true);
    });
  }
}

function renderInstagramPlaceholder(shell, mode = "blocked") {
  const permalink = shell.dataset.instagramPermalink;
  const isError = mode === "error";

  shell.innerHTML = `
    <div class="instagram-placeholder">
      <p class="card-label">Datenschutz-Hinweis</p>
      <h3>Instagram-Video erst nach Einwilligung laden</h3>
      <p class="instagram-note">
        ${
          isError
            ? "Der externe Instagram-Inhalt konnte gerade nicht geladen werden. Du kannst es erneut versuchen oder den Beitrag direkt auf Instagram ansehen."
            : "Dieses externe Instagram-Video wird erst geladen, wenn du optionale Medien erlaubst. Vorher bleibt die Verbindung zu Instagram blockiert."
        }
      </p>
      <div class="instagram-placeholder__actions">
        <button type="button" class="instagram-action" data-open-consent>
          Externe Inhalte erlauben
        </button>
        <a class="instagram-action" href="${permalink}" target="_blank" rel="noreferrer">
          Direkt auf Instagram
        </a>
      </div>
    </div>
  `;

  shell.dataset.embedState = mode;
  bindInstagramPlaceholderActions(shell);
}

function renderInstagramBlockquote(shell) {
  const permalink = shell.dataset.instagramPermalink;

  shell.innerHTML = `
    <blockquote
      class="instagram-media"
      data-instgrm-permalink="${formatInstagramPermalink(permalink)}"
      data-instgrm-version="14"
    ></blockquote>
  `;
  shell.dataset.embedState = "embed";
}

function loadInstagramEmbeds() {
  if (window.instgrm?.Embeds?.process) {
    return Promise.resolve(window.instgrm);
  }

  if (instagramScriptPromise) {
    return instagramScriptPromise;
  }

  instagramScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector("[data-instagram-embed-script]");

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" && window.instgrm) {
        resolve(window.instgrm);
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          existingScript.dataset.loaded = "true";
          resolve(window.instgrm);
        },
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => {
          reject(new Error("Instagram-Embed-Skript konnte nicht geladen werden."));
        },
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.defer = true;
    script.dataset.instagramEmbedScript = "true";

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve(window.instgrm);
      },
      { once: true }
    );

    script.addEventListener(
      "error",
      () => {
        reject(new Error("Instagram-Embed-Skript konnte nicht geladen werden."));
      },
      { once: true }
    );

    document.body.appendChild(script);
  });

  return instagramScriptPromise;
}

function renderInstagramEmbeds(consent) {
  if (!instagramShells.length) {
    return;
  }

  if (!consent?.optional) {
    instagramShells.forEach((shell) => renderInstagramPlaceholder(shell));
    return;
  }

  instagramShells.forEach((shell) => renderInstagramBlockquote(shell));

  loadInstagramEmbeds()
    .then(() => {
      window.instgrm?.Embeds?.process();
    })
    .catch(() => {
      instagramShells.forEach((shell) => renderInstagramPlaceholder(shell, "error"));
    });
}

function removeConsentDialog() {
  const dialog = document.querySelector(".cookie-consent");
  if (dialog) {
    dialog.remove();
  }

  document.body.classList.remove("cookie-consent-open");
}

function buildConsentDialog() {
  const wrapper = document.createElement("div");
  wrapper.className = "cookie-consent";
  wrapper.setAttribute("role", "dialog");
  wrapper.setAttribute("aria-modal", "true");
  wrapper.setAttribute("aria-labelledby", "cookie-consent-title");

  wrapper.innerHTML = `
    <div class="cookie-consent__backdrop" aria-hidden="true"></div>
    <section class="cookie-consent__panel">
      <p class="card-label">Datenschutz & Cookies</p>
      <h2 class="cookie-consent__title" id="cookie-consent-title">Bitte Auswahl bestätigen</h2>
      <p class="cookie-consent__text">
        Wir setzen aktuell standardmäßig nur notwendige Speicherungen ein, damit die Website funktioniert
        und deine Datenschutzauswahl gespeichert werden kann. Externe Inhalte wie Instagram-Einblicke
        werden erst nach ausdrücklicher Einwilligung als optionale Medien geladen.
      </p>
      <ul class="cookie-consent__list">
        <li>Keine vorangekreuzten Einwilligungen.</li>
        <li>„Nur notwendige“ erlaubt nur die technisch erforderliche Speicherung deiner Auswahl.</li>
        <li>„Alle erlauben“ aktiviert zusätzlich externe Instagram-Inhalte dieser Website.</li>
      </ul>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__button" data-consent-choice="necessary">
          Nur notwendige
        </button>
        <button type="button" class="cookie-consent__button" data-consent-choice="all">
          Alle erlauben
        </button>
      </div>
      <p class="cookie-consent__meta">
        Mehr Details findest du in
        <a href="datenschutz.html">Datenschutz</a>
        und
        <a href="cookies.html">Cookies</a>.
      </p>
    </section>
  `;

  wrapper.querySelectorAll("[data-consent-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const optional = button.getAttribute("data-consent-choice") === "all";
      const consent = writeConsent(optional);
      applyConsentState(consent);
      removeConsentDialog();
    });
  });

  return wrapper;
}

function openConsentDialog(force = false) {
  if (!force && readConsent()) {
    applyConsentState(readConsent());
    return;
  }

  removeConsentDialog();
  document.body.classList.add("cookie-consent-open");

  const dialog = buildConsentDialog();
  document.body.appendChild(dialog);

  const firstButton = dialog.querySelector("[data-consent-choice]");
  if (firstButton) {
    firstButton.focus();
  }
}

const existingConsent = readConsent();
if (existingConsent) {
  applyConsentState(existingConsent);
} else {
  applyConsentState(null);
  openConsentDialog();
}

consentTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openConsentDialog(true);
  });
});
