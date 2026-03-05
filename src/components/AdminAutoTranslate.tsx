import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { type AdminLanguage } from '../utils/adminLanguage';

interface AdminAutoTranslateProps {
  language: AdminLanguage;
}

declare global {
  interface Window {
    googleTranslateElementInitAdmin?: () => void;
    google?: any;
  }
}

const GOOGLE_TRANSLATE_SCRIPT_ID = 'forsaj-admin-google-translate-script';
const GOOGLE_TRANSLATE_CONTAINER_ID = 'forsaj-admin-google-translate-element';
const GOOGLE_TRANSLATE_INNER_ID = `${GOOGLE_TRANSLATE_CONTAINER_ID}-inner`;

const toGoogleLang = (lang: AdminLanguage) => {
  if (lang === 'ru') return 'ru';
  if (lang === 'en') return 'en';
  return 'az';
};

const ensureTranslateContainer = () => {
  let container = document.getElementById(GOOGLE_TRANSLATE_CONTAINER_ID);
  if (container) return container;
  container = document.createElement('div');
  container.id = GOOGLE_TRANSLATE_CONTAINER_ID;
  container.style.position = 'fixed';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);
  return container;
};

const setGoogleTranslateCookie = (targetLang: string) => {
  const value = `/az/${targetLang}`;
  document.cookie = `googtrans=${value}; path=/`;

  const host = window.location.hostname;
  if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const baseDomain = host.startsWith('.') ? host : `.${host}`;
    document.cookie = `googtrans=${value}; path=/; domain=${baseDomain}`;
  }
};

const applyGoogleTranslateLanguage = (lang: AdminLanguage) => {
  const googleLang = toGoogleLang(lang);
  setGoogleTranslateCookie(googleLang);
  document.documentElement.lang = googleLang;

  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (!combo) return false;
  if (googleLang === 'az') {
    combo.value = '';
    combo.dispatchEvent(new Event('change'));
    return true;
  }
  if (combo.value === googleLang) return true;
  combo.value = googleLang;
  combo.dispatchEvent(new Event('change'));
  return true;
};

const initGoogleTranslate = (language: AdminLanguage) => {
  ensureTranslateContainer();
  const translateElement = window.google?.translate?.TranslateElement;
  if (!translateElement) return false;

  if (!document.getElementById(GOOGLE_TRANSLATE_INNER_ID)) {
    const inner = document.createElement('div');
    inner.id = GOOGLE_TRANSLATE_INNER_ID;
    ensureTranslateContainer().appendChild(inner);
    new window.google.translate.TranslateElement(
      {
        pageLanguage: 'az',
        includedLanguages: 'ru,en',
        autoDisplay: false,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      },
      inner.id
    );
  }

  return applyGoogleTranslateLanguage(language);
};

const AdminAutoTranslate: React.FC<AdminAutoTranslateProps> = ({ language }) => {
  const location = useLocation();
  const retriesRef = useRef<number[]>([]);
  const currentLanguageRef = useRef<AdminLanguage>(language);
  const isInitializedRef = useRef(false);

  currentLanguageRef.current = language;

  const clearRetries = () => {
    retriesRef.current.forEach((id) => window.clearTimeout(id));
    retriesRef.current = [];
  };

  const scheduleApplyLanguage = (lang: AdminLanguage) => {
    clearRetries();

    const retrySteps = [0, 120, 300, 600, 1000, 1600, 2400, 3400, 4800];
    retrySteps.forEach((delay) => {
      const timerId = window.setTimeout(() => {
        if (window.google?.translate?.TranslateElement) {
          initGoogleTranslate(lang);
          applyGoogleTranslateLanguage(lang);
          return;
        }
        applyGoogleTranslateLanguage(lang);
      }, delay);
      retriesRef.current.push(timerId);
    });
  };

  useEffect(() => {
    ensureTranslateContainer();
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (window.google?.translate?.TranslateElement) {
      initGoogleTranslate(currentLanguageRef.current);
      scheduleApplyLanguage(currentLanguageRef.current);
      return () => clearRetries();
    }

    window.googleTranslateElementInitAdmin = () => {
      const lang = currentLanguageRef.current;
      initGoogleTranslate(lang);
      scheduleApplyLanguage(lang);
    };

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInitAdmin';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      clearRetries();
    };
  }, []);

  useEffect(() => {
    scheduleApplyLanguage(language);
    return () => clearRetries();
  }, [language, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (language === 'az') return;

    const root =
      document.querySelector<HTMLElement>('[data-admin-translatable-root="true"]') ||
      document.querySelector<HTMLElement>('.main-content');
    if (!root) return;

    let debounceTimer: number | null = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        scheduleApplyLanguage(currentLanguageRef.current);
      }, 180);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [language, location.pathname, location.search, location.hash]);

  useEffect(() => {
    return () => {
      clearRetries();
      if (window.googleTranslateElementInitAdmin) {
        delete window.googleTranslateElementInitAdmin;
      }
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const styleId = 'forsaj-admin-google-translate-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      body { top: 0 !important; }
      .goog-te-banner-frame.skiptranslate { display: none !important; }
      .skiptranslate.goog-te-gadget { font-size: 0 !important; }
      #goog-gt-tt, .goog-tooltip, .goog-tooltip:hover,
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
      .VIpgJd-ZVi9od-ORHb-OEVmcd,
      .VIpgJd-ZVi9od-xl07Ob-OEVmcd { display: none !important; }
      .goog-text-highlight { background: transparent !important; box-shadow: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  return null;
};

export default AdminAutoTranslate;
