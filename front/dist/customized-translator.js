(function () {
  const DEFAULT_LANG = "az";
  const SUPPORTED_LANGS = ["az", "ru", "en"];
  const SCRIPT_URL = "https://cdn.gtranslate.net/widgets/latest/flags.js";

  const flags = {
    az: "https://flagcdn.com/w40/az.png",
    ru: "https://flagcdn.com/w40/ru.png",
    en: "https://flagcdn.com/w40/us.png"
  };
  const LANGUAGE_LABELS = {
    az: "AZ",
    ru: "RU",
    en: "EN"
  };

  let currentLang = DEFAULT_LANG;
  let scriptLoadPromise = null;

  function setGoogTransCookie(lang) {
    const value = `/${DEFAULT_LANG}/${lang}`;
    const domain = location.hostname.split(".").slice(-2).join(".");
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; path=/; domain=.${domain}`;
    document.cookie = `googtrans=${value}; path=/; domain=${location.hostname}`;
  }

  function clearGoogTransCookies() {
    const domain = location.hostname.split(".").slice(-2).join(".");
    const cookies = [
      "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
      `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`,
      `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname}`
    ];
    cookies.forEach(c => document.cookie = c);
  }

  function getGoogTransTargetFromCookie() {
    const cookie = document.cookie.split("; ").find(c => c.startsWith("googtrans="));
    if (!cookie) return "";
    const parts = decodeURIComponent(cookie.split("=")[1]).split("/");
    return (parts[parts.length - 1] || "").toLowerCase();
  }

  function applyLanguageClass(lang) {
    const body = document.body;
    if (!body) return;
    body.classList.remove("cg-lang-az", "cg-lang-ru", "cg-lang-en");
    body.classList.add(`cg-lang-${lang}`);
  }

  function getLanguageLabel(lang) {
    const code = String(lang || "").toLowerCase();
    return LANGUAGE_LABELS[code] || code.toUpperCase();
  }

  function renderButtons() {
    const hosts = Array.from(document.querySelectorAll(".custom-gtranslate"));
    if (!hosts.length) return;

    hosts.forEach((host) => {
      host.innerHTML = "";

      if (host.classList.contains("full")) {
        const dropdown = document.createElement("div");
        dropdown.className = "cg-dropdown";

        const trigger = document.createElement("div");
        trigger.className = "cg-dropdown-trigger";
        trigger.innerHTML = `
          <img src="${flags[currentLang]}" class="cg-flag-img-small">
          <span class="notranslate" translate="no" data-lang-code="${currentLang}">${getLanguageLabel(currentLang)}</span>
          <span class="cg-arrow">▾</span>
        `;

        const list = document.createElement("div");
        list.className = "cg-dropdown-list";

        SUPPORTED_LANGS.forEach((lang) => {
          const item = document.createElement("div");
          item.className = "cg-dropdown-item" + (lang === currentLang ? " active" : "");
          item.dataset.langCode = lang;
          item.setAttribute("translate", "no");
          item.innerHTML = `
            <img src="${flags[lang]}" class="cg-flag-img-small">
            <span class="notranslate" translate="no" data-lang-code="${lang}">${getLanguageLabel(lang)}</span>
          `;
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            handleLangChange(lang);
            dropdown.classList.remove("open");
          });
          list.appendChild(item);
        });

        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("open");
        });

        document.addEventListener("click", () => dropdown.classList.remove("open"));
        dropdown.appendChild(trigger);
        dropdown.appendChild(list);
        host.appendChild(dropdown);
      } else {
        SUPPORTED_LANGS.forEach((lang) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cg-btn";
          if (lang === currentLang) btn.classList.add("active");
          btn.innerHTML = `<img src="${flags[lang]}" alt="${lang}" class="cg-flag-img" loading="lazy">`;
          btn.onclick = () => handleLangChange(lang);
          host.appendChild(btn);
        });
      }
    });
  }

  function setActive(lang) {
    currentLang = lang;
    applyLanguageClass(lang);
    try {
      window.dispatchEvent(new CustomEvent("custom-gtranslate-language-changed", { detail: { lang } }));
    } catch (e) { }

    document.querySelectorAll(".cg-btn").forEach((btn) => {
      const isMatch = btn.querySelector('img')?.alt === lang;
      btn.classList.toggle("active", isMatch);
    });

    document.querySelectorAll(".cg-dropdown").forEach((dropdown) => {
      const trigger = dropdown.querySelector(".cg-dropdown-trigger");
      if (trigger) {
        trigger.innerHTML = `
          <img src="${flags[lang]}" class="cg-flag-img-small">
          <span class="notranslate" translate="no" data-lang-code="${lang}">${getLanguageLabel(lang)}</span>
          <span class="cg-arrow">▾</span>
        `;
      }
      dropdown.querySelectorAll(".cg-dropdown-item").forEach((item) => {
        const itemLang = String((item.dataset.langCode || "").toLowerCase());
        const labelNode = item.querySelector(".notranslate[data-lang-code]");
        if (labelNode) {
          labelNode.textContent = getLanguageLabel(itemLang);
        }
        item.classList.toggle("active", itemLang === lang);
      });
    });
  }

  function loadScript() {
    if (scriptLoadPromise) return scriptLoadPromise;

    if (window.doGTranslate || document.querySelector("select.goog-te-combo")) {
      return Promise.resolve();
    }

    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoadPromise = null;
        reject();
      };
      document.head.appendChild(script);
    });
    return scriptLoadPromise;
  }

  function applyLang(lang) {
    if (window.doGTranslate) {
      try {
        window.doGTranslate(`${DEFAULT_LANG}|${lang}`);
        return true;
      } catch (e) { }
    }
    const combo = document.querySelector("select.goog-te-combo");
    if (combo) {
      combo.value = lang === DEFAULT_LANG ? "" : lang;
      combo.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  async function handleLangChange(lang) {
    if (!lang) return;
    if (lang === currentLang) return;

    if (lang === DEFAULT_LANG) {
      clearGoogTransCookies();
      applyLang(DEFAULT_LANG);
      setActive(DEFAULT_LANG);
    } else {
      setGoogTransCookie(lang);
      setActive(lang);

      let ok = applyLang(lang);
      if (!ok) {
        await loadScript();
        let retries = 0;
        while (!document.querySelector("select.goog-te-combo") && !window.doGTranslate && retries < 40) {
          await new Promise(r => setTimeout(r, 100));
          retries++;
        }
        applyLang(lang);
      }
    }
  }

  function init() {
    window.customGTranslateSetLang = (nextLang) => {
      const lang = String(nextLang || "").toLowerCase();
      if (SUPPORTED_LANGS.includes(lang)) {
        handleLangChange(lang);
      }
    };
    window.customGTranslateGetLang = () => currentLang;
    window.customGTranslateSyncCurrentView = () => Promise.resolve();

    const cookieLang = getGoogTransTargetFromCookie();
    if (SUPPORTED_LANGS.includes(cookieLang) && cookieLang && cookieLang !== DEFAULT_LANG) {
      currentLang = cookieLang;
      applyLanguageClass(currentLang);

      loadScript().then(async () => {
        let retries = 0;
        while (!document.querySelector("select.goog-te-combo") && !window.doGTranslate && retries < 40) {
          await new Promise(r => setTimeout(r, 100));
          retries++;
        }
        applyLang(currentLang);
      });
    } else {
      currentLang = DEFAULT_LANG;
      clearGoogTransCookies();
    }

    renderButtons();
    setActive(currentLang);

    try {
      window.dispatchEvent(new CustomEvent("custom-gtranslate-ready"));
    } catch (e) { }

    document.body.classList.remove("cg-boot-pending");
    document.body.classList.add("cg-boot-ready");
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
