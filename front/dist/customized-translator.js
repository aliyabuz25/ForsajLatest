(function () {
  const STORAGE_KEY = "custom_gtranslate_lang";
  const DEFAULT_LANG = "az";
  const SUPPORTED_LANGS = ["az", "ru", "en"];
  const SCRIPT_URL = "https://cdn.gtranslate.net/widgets/latest/flags.js";
  const MAX_SCRIPT_RETRIES = 3;
  const RETRY_DELAY_MS = 500;
  const READY_TIMEOUT_MS = 10000;
  const SWITCH_TIMEOUT_MS = 6000;

  const flags = {
    az: "https://flagcdn.com/w40/az.png",
    ru: "https://flagcdn.com/w40/ru.png",
    en: "https://flagcdn.com/w40/us.png"
  };

  let currentLang = (localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG).toLowerCase();
  if (!SUPPORTED_LANGS.includes(currentLang)) currentLang = DEFAULT_LANG;

  function setGoogTransCookie(lang) {
    const value = `/${DEFAULT_LANG}/${lang}`;
    const domain = location.hostname.split(".").slice(-2).join(".");

    // Set for current path, root path, and domain to ensure it sticks
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

  function getHosts() {
    return Array.from(document.querySelectorAll(".custom-gtranslate"));
  }

  function setButtonsDisabled(disabled) {
    document.querySelectorAll(".cg-btn, .cg-dropdown-trigger, .cg-dropdown-item").forEach((el) => {
      el.style.pointerEvents = disabled ? "none" : "auto";
      el.style.opacity = disabled ? "0.6" : "1";
    });
  }

  function renderButtons() {
    const hosts = getHosts();
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
          <span class="notranslate">${currentLang.toUpperCase()}</span>
          <span class="cg-arrow">▾</span>
        `;

        const list = document.createElement("div");
        list.className = "cg-dropdown-list";

        SUPPORTED_LANGS.forEach((lang) => {
          const item = document.createElement("div");
          item.className = "cg-dropdown-item" + (lang === currentLang ? " active" : "");
          item.innerHTML = `
            <img src="${flags[lang]}" class="cg-flag-img-small">
            <span class="notranslate">${lang.toUpperCase()}</span>
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

  async function handleLangChange(lang) {
    if (!lang) return;

    setButtonsDisabled(true);
    try {
      if (lang === DEFAULT_LANG) {
        clearGoogTransCookies();
      } else {
        setGoogTransCookie(lang);
      }

      const ok = applyLang(lang);
      if (ok) {
        // Wait a bit for Google to react
        await new Promise(r => setTimeout(r, 300));

        if (lang === DEFAULT_LANG) {
          // Force original content if Google combo is present
          const combo = document.querySelector("select.goog-te-combo");
          if (combo) {
            combo.selectedIndex = 0;
            combo.dispatchEvent(new Event("change", { bubbles: true }));
          }
          setActive(lang);
        } else {
          const applied = await waitForLanguageApplied(lang);
          if (applied) setActive(lang);
        }
      }
    } catch (err) {
      console.error("Translation switch error:", err);
    } finally {
      // Small safety delay before re-enabling
      setTimeout(() => setButtonsDisabled(false), 200);
    }
  }

  function setActive(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    document.querySelectorAll(".cg-btn").forEach((btn) => {
      const isMatch = btn.querySelector('img')?.alt === lang;
      btn.classList.toggle("active", isMatch);
    });

    document.querySelectorAll(".cg-dropdown").forEach((dropdown) => {
      const trigger = dropdown.querySelector(".cg-dropdown-trigger");
      if (trigger) {
        trigger.innerHTML = `
          <img src="${flags[lang]}" class="cg-flag-img-small">
          <span class="notranslate">${lang.toUpperCase()}</span>
          <span class="cg-arrow">▾</span>
        `;
      }
      dropdown.querySelectorAll(".cg-dropdown-item").forEach((item) => {
        const itemText = item.querySelector(".notranslate")?.textContent?.toLowerCase();
        item.classList.toggle("active", itemText === lang);
      });
    });
  }

  function getCookieValue(name) {
    const cookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
  }

  function getGoogTransTargetFromCookie() {
    const value = getCookieValue("googtrans");
    if (!value) return "";
    const parts = decodeURIComponent(value).split("/");
    return (parts[parts.length - 1] || "").toLowerCase();
  }

  function getCurrentTranslatorLang() {
    const combo = document.querySelector("select.goog-te-combo");
    if (combo && combo.value) return combo.value;
    const cookie = document.cookie.split("; ").find(r => r.startsWith("googtrans="));
    if (cookie) {
      const parts = decodeURIComponent(cookie.split("=")[1]).split("/");
      return parts[parts.length - 1];
    }
    return "";
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

  async function waitForTranslatorReady() {
    const started = Date.now();
    while (Date.now() - started < READY_TIMEOUT_MS) {
      if (window.doGTranslate || document.querySelector("select.goog-te-combo")) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  async function waitForLanguageApplied(targetLang) {
    const started = Date.now();
    while (Date.now() - started < SWITCH_TIMEOUT_MS) {
      if (getCurrentTranslatorLang() === targetLang) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  }

  function loadScript() {
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function init() {
    window.gtranslateSettings = {
      default_language: DEFAULT_LANG,
      languages: SUPPORTED_LANGS,
      wrapper_selector: ".gtranslate_native_wrapper"
    };

    const cookieLang = getGoogTransTargetFromCookie();
    if (!SUPPORTED_LANGS.includes(cookieLang || "")) {
      clearGoogTransCookies();
      setGoogTransCookie(DEFAULT_LANG);
    } else if (cookieLang) {
      currentLang = cookieLang;
      localStorage.setItem(STORAGE_KEY, currentLang);
    } else {
      setGoogTransCookie(currentLang || DEFAULT_LANG);
    }

    renderButtons();

    try {
      await loadScript();
      const ready = await waitForTranslatorReady();
      if (ready && currentLang !== DEFAULT_LANG) {
        applyLang(currentLang);
      }
    } catch (e) {
      console.error("GTranslate init failed", e);
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
