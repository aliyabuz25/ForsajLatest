(function () {
  const STORAGE_KEY = "custom_gtranslate_lang";
  const DEFAULT_LANG = "az";
  const SUPPORTED_LANGS = ["az", "ru", "en"];
  const SCRIPT_URL = "https://cdn.gtranslate.net/widgets/latest/flags.js";
  const MAX_SCRIPT_RETRIES = 3;
  const RETRY_DELAY_MS = 500;
  const READY_TIMEOUT_MS = 10000;
  const SWITCH_TIMEOUT_MS = 6000;
  const POST_RELOAD_FADE_KEY = "cg_post_reload_fade";
  const POST_RELOAD_PENDING_CLASS = "cg-post-reload-pending";
  const POST_RELOAD_READY_CLASS = "cg-post-reload-ready";
  const POST_RELOAD_FADE_DURATION_MS = 2200;
  const POST_RELOAD_COVER_ID = "cg-post-reload-cover";
  const POST_RELOAD_COVER_CLASS = "cg-post-reload-cover";
  const POST_RELOAD_COVER_FADE_MS = 1800;
  const NAVBAR_TRANSLATION_GRACE_MS = 2600;

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

  function getTransitionVeil() {
    let veil = document.getElementById("cg-translate-veil");
    if (veil) return veil;
    veil = document.createElement("div");
    veil.id = "cg-translate-veil";
    veil.setAttribute("aria-hidden", "true");
    veil.style.position = "fixed";
    veil.style.inset = "0";
    veil.style.pointerEvents = "none";
    veil.style.background = "#000";
    veil.style.opacity = "0";
    veil.style.transition = "opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    veil.style.zIndex = "2147483647";
    document.body.appendChild(veil);
    return veil;
  }

  function showTransitionVeil() {
    // Disabled veil darkening per user request for smoother UI feeling
  }

  function hideTransitionVeil() {
    const veil = document.getElementById("cg-translate-veil");
    if (!veil) return;
    veil.style.transition = "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)";
    veil.style.opacity = "0";
  }

  function getPostReloadCover() {
    let cover = document.getElementById(POST_RELOAD_COVER_ID);
    if (cover) return cover;
    cover = document.createElement("div");
    cover.id = POST_RELOAD_COVER_ID;
    cover.className = POST_RELOAD_COVER_CLASS;
    cover.setAttribute("aria-hidden", "true");
    cover.style.position = "fixed";
    cover.style.inset = "0";
    cover.style.opacity = "1";
    cover.style.pointerEvents = "none";
    cover.style.zIndex = "2147483646";
    document.body.appendChild(cover);
    return cover;
  }

  function showPostReloadCover() {
    // Disabled post-reload darkening to prevent black screen lockup
  }

  function hidePostReloadCover() {
    const cover = document.getElementById(POST_RELOAD_COVER_ID);
    if (!cover) return;
    cover.style.transition = `opacity ${POST_RELOAD_COVER_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    cover.style.opacity = "0";
    window.setTimeout(() => {
      const node = document.getElementById(POST_RELOAD_COVER_ID);
      if (node) node.remove();
    }, POST_RELOAD_COVER_FADE_MS + 150);
  }

  function applyPostReloadFade() {
    try {
      const raw = sessionStorage.getItem(POST_RELOAD_FADE_KEY);
      if (!raw) return false;
      sessionStorage.removeItem(POST_RELOAD_FADE_KEY);
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > 7000) return false;
      document.body.classList.add(POST_RELOAD_PENDING_CLASS);
      document.body.classList.remove(POST_RELOAD_READY_CLASS);
      showPostReloadCover();
      return true;
    } catch (e) {
      return false;
    }
  }

  function armPostReloadFade() {
    try {
      sessionStorage.setItem(POST_RELOAD_FADE_KEY, String(Date.now()));
    } catch (e) { }
  }

  function markPostReloadReady() {
    const body = document.body;
    if (!body || !body.classList.contains(POST_RELOAD_PENDING_CLASS)) return;
    body.classList.add(POST_RELOAD_READY_CLASS);
    hidePostReloadCover();
    body.classList.remove(POST_RELOAD_PENDING_CLASS);
    body.classList.remove(POST_RELOAD_READY_CLASS);
  }

  function startInitialFadeIn() {
    const body = document.body;
    if (!body || body.classList.contains(POST_RELOAD_PENDING_CLASS)) return;
    body.classList.add(POST_RELOAD_PENDING_CLASS);
    body.classList.remove(POST_RELOAD_READY_CLASS);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markPostReloadReady();
      });
    });
  }

  function applyLanguageClass(lang) {
    const body = document.body;
    if (!body) return;
    body.classList.remove("cg-lang-az", "cg-lang-ru", "cg-lang-en");
    body.classList.add(`cg-lang-${lang}`);
  }

  function emitLanguageChanged(lang) {
    try {
      window.dispatchEvent(new CustomEvent("custom-gtranslate-language-changed", {
        detail: { lang }
      }));
    } catch (e) { }
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
    const previousLang = currentLang;
    const languageChanged = previousLang !== lang;

    // Fast-path: base language -> translated language with explicit fade-out + fade-in.
    if (previousLang === DEFAULT_LANG && lang !== DEFAULT_LANG) {
      setButtonsDisabled(true);
      try {
        showTransitionVeil();
        setGoogTransCookie(lang);
        setActive(lang);
        armPostReloadFade();
        window.setTimeout(() => window.location.reload(), 220);
      } finally {
        window.setTimeout(() => setButtonsDisabled(false), 180);
      }
      return;
    }

    setButtonsDisabled(true);
    try {
      if (languageChanged) showTransitionVeil();

      // Returning to base language should fully stop translation and reload cleanly.
      if (lang === DEFAULT_LANG && languageChanged) {
        clearGoogTransCookies();
        const combo = document.querySelector("select.goog-te-combo");
        if (combo) {
          combo.selectedIndex = 0;
          combo.dispatchEvent(new Event("change", { bubbles: true }));
        }
        setActive(lang);
        armPostReloadFade();
        window.setTimeout(() => window.location.reload(), 120);
        return;
      }

      if (lang === DEFAULT_LANG) {
        clearGoogTransCookies();
      } else {
        setGoogTransCookie(lang);
      }

      let ok = applyLang(lang);
      if (!ok) {
        try {
          await loadScript();
          const ready = await waitForTranslatorReady();
          if (ready) ok = applyLang(lang);
        } catch (e) { }
      }

      if (ok) {
        await new Promise(r => setTimeout(r, 220));

        if (lang === DEFAULT_LANG) {
          const combo = document.querySelector("select.goog-te-combo");
          if (combo) {
            combo.selectedIndex = 0;
            combo.dispatchEvent(new Event("change", { bubbles: true }));
          }
          setActive(lang);
          if (languageChanged) {
            await waitForBaseLanguageRestored();
            hideTransitionVeil();
          }
        } else {
          const applied = await waitForRenderedTranslation(lang);
          if (applied) {
            setActive(lang);
            if (languageChanged) hideTransitionVeil();
          } else {
            // Last-resort fallback: hard reload with target cookie guarantees translation on reopen.
            setActive(lang);
            if (languageChanged) {
              armPostReloadFade();
              window.setTimeout(() => window.location.reload(), 120);
            }
          }
        }
      } else if (languageChanged) {
        // Fallback: widget unavailable; reload with selected language cookie.
        setActive(lang);
        armPostReloadFade();
        window.setTimeout(() => window.location.reload(), 120);
      }
    } catch (err) {
      console.error("Translation switch error:", err);
      hideTransitionVeil();
    } finally {
      setTimeout(() => setButtonsDisabled(false), 200);
      if (languageChanged) {
        // Final safety net against any unexpected stuck overlay state.
        window.setTimeout(() => hideTransitionVeil(), 2200);
      }
    }
  }

  function setActive(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLanguageClass(lang);
    emitLanguageChanged(lang);

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

  function hasTranslatedDomSignal() {
    const htmlClass = document.documentElement.className || "";
    const bodyClass = document.body?.className || "";
    if (/\btranslated-(ltr|rtl)\b/i.test(htmlClass) || /\btranslated-(ltr|rtl)\b/i.test(bodyClass)) {
      return true;
    }
    if (document.querySelector('font[style*="vertical-align: inherit"]')) {
      return true;
    }
    return false;
  }

  function hasNavbarTranslatedSignal() {
    const navbar = document.querySelector('[data-cg-navbar="true"]');
    if (!navbar) return false;
    if (/\btranslated-(ltr|rtl)\b/i.test(navbar.className || "")) return true;
    if (navbar.querySelector('font[style*="vertical-align: inherit"]')) return true;
    return false;
  }

  async function waitForRenderedTranslation(targetLang) {
    if (!targetLang || targetLang === DEFAULT_LANG) return true;
    const started = Date.now();
    while (Date.now() - started < SWITCH_TIMEOUT_MS + 4000) {
      const elapsed = Date.now() - started;
      const langApplied = getCurrentTranslatorLang() === targetLang;
      if (langApplied && hasTranslatedDomSignal()) {
        if (hasNavbarTranslatedSignal() || elapsed >= NAVBAR_TRANSLATION_GRACE_MS) return true;
      }
      await new Promise((r) => setTimeout(r, 180));
    }
    return false;
  }

  async function waitForBaseLanguageRestored() {
    const started = Date.now();
    while (Date.now() - started < SWITCH_TIMEOUT_MS + 3000) {
      const noTranslatedDom = !hasTranslatedDomSignal();
      const combo = document.querySelector("select.goog-te-combo");
      const comboAtBase = !combo || !combo.value;
      const cookieTarget = getGoogTransTargetFromCookie();
      const cookieAtBase = !cookieTarget || cookieTarget === DEFAULT_LANG;
      if (noTranslatedDom && comboAtBase && cookieAtBase) return true;
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

    const hasPostReloadFade = applyPostReloadFade();
    const needsTranslatedGhost = currentLang !== DEFAULT_LANG;
    if (!hasPostReloadFade) {
      if (needsTranslatedGhost) {
        document.body.classList.add(POST_RELOAD_PENDING_CLASS);
        document.body.classList.remove(POST_RELOAD_READY_CLASS);
        showPostReloadCover();
      } else {
        startInitialFadeIn();
      }
    }

    applyLanguageClass(currentLang);
    renderButtons();

    try {
      await loadScript();
      const ready = await waitForTranslatorReady();
      if (ready && currentLang !== DEFAULT_LANG) {
        applyLang(currentLang);
        await waitForRenderedTranslation(currentLang);
        if (hasPostReloadFade || needsTranslatedGhost) {
          markPostReloadReady();
        }
      } else if (hasPostReloadFade || needsTranslatedGhost) {
        markPostReloadReady();
      }
    } catch (e) {
      console.error("GTranslate init failed", e);
      if (hasPostReloadFade || needsTranslatedGhost) {
        markPostReloadReady();
      }
    }

    window.customGTranslateSetLang = (nextLang) => {
      const lang = String(nextLang || "").toLowerCase();
      if (!SUPPORTED_LANGS.includes(lang)) return false;
      handleLangChange(lang);
      return true;
    };
    window.customGTranslateGetLang = () => currentLang;
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
