import React, { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Menu, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface NavbarProps {
  currentView: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms';
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { getPage, getText, language, setSiteLanguage } = useSiteContent('navbar');
  const { getImage: getImageGeneral } = useSiteContent('general');
  const TRANSLATE_SELECTED_LANG_KEY = 'forsaj_translate_selected_lang';
  const [selectedLanguage, setSelectedLanguage] = useState<'AZ' | 'RU' | 'ENG'>(() => {
    const saved = (localStorage.getItem(TRANSLATE_SELECTED_LANG_KEY) || 'AZ').toUpperCase();
    if (saved === 'RU' || saved === 'ENG' || saved === 'AZ') return saved;
    return 'AZ';
  });
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const languagePickerRef = useRef<HTMLDivElement | null>(null);
  const languageTimersRef = useRef<number[]>([]);
  const selectedLanguageRef = useRef<'AZ' | 'RU' | 'ENG'>('AZ');
  const languageBootstrappedRef = useRef(false);
  const languageTransitionTokenRef = useRef(0);
  const lastAppliedLanguageRef = useRef<string>('');
  const lastReapplyAtRef = useRef(0);
  const observerTimerRef = useRef<number | null>(null);
  const observerLastApplyAtRef = useRef(0);
  const translationOriginalTextRef = useRef(new WeakMap<Text, string>());
  const translationCacheRef = useRef(new Map<string, string>());
  const translationRunIdRef = useRef(0);
  const translationEngineRef = useRef<'libre' | 'gtranslate'>('gtranslate');
  const pendingSplashLanguageRef = useRef<'AZ' | 'RU' | 'ENG' | null>(null);
  const expectedWidgetLanguageRef = useRef<'AZ' | 'RU' | 'ENG' | null>(null);
  const cookieSyncBlockUntilRef = useRef(0);
  const suppressObserverUntilRef = useRef(0);
  const GTRANSLATE_SCRIPT_ID = 'gtranslate-widget-script';
  const GTRANSLATE_WRAPPER_CLASS = 'gtranslate_wrapper';
  const USE_LIBRE_TRANSLATE = false;
  const LANGUAGE_TRANSITION_START_EVENT = 'forsaj-language-transition-start';
  const LANGUAGE_TRANSITION_END_EVENT = 'forsaj-language-transition-end';
  const languageMap: Record<'AZ' | 'RU' | 'ENG', string> = {
    AZ: 'az|az',
    RU: 'az|ru',
    ENG: 'az|en'
  };
  const languagePickerAriaLabel: Record<'AZ' | 'RU' | 'ENG', string> = {
    AZ: 'Dil seçin',
    RU: 'Выберите язык',
    ENG: 'Select language'
  };
  const languageVisibleLabel: Record<'AZ' | 'RU' | 'ENG', string> = {
    AZ: 'AZ',
    RU: 'RUS',
    ENG: 'EN'
  };
  const languageOptionLabel: Record<'AZ' | 'RU' | 'ENG', string> = {
    AZ: 'AZ',
    RU: 'RUS',
    ENG: 'EN'
  };

  const readGoogTransTarget = (): 'AZ' | 'RU' | 'ENG' | null => {
    const cookies = document.cookie.split(';').map((item) => item.trim());
    let rawValue = '';
    cookies.forEach((entry) => {
      if (entry.startsWith('googtrans=')) {
        rawValue = entry.slice('googtrans='.length);
      }
    });
    if (!rawValue) return null;
    const decoded = decodeURIComponent(rawValue);
    const parts = decoded.split('/');
    const target = (parts[2] || '').toLowerCase();
    if (target === 'az') return 'AZ';
    if (target === 'ru') return 'RU';
    if (target === 'en') return 'ENG';
    return null;
  };

  useEffect(() => {
    // Keep CMS/static content language at AZ to avoid double translation conflicts.
    if (language !== 'AZ') {
      setSiteLanguage('AZ');
    }
  }, [language, setSiteLanguage]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const normalizeTranslateCode = (code: string) => {
    const normalized = (code || '').trim().toLowerCase();
    if (!normalized) return 'az|az';
    return normalized.includes('|') ? normalized : `az|${normalized}`;
  };

  const getLibreTargetLanguage = (code: string) => {
    const normalized = normalizeTranslateCode(code);
    const [, target = 'az'] = normalized.split('|');
    return target || 'az';
  };

  const isTranslatableTextNode = (node: Text) => {
    const parent = node.parentElement;
    if (!parent) return false;
    if (parent.closest('[translate="no"], .notranslate, script, style, noscript, textarea, input, select, option, iframe, svg, code, pre')) {
      return false;
    }
    const compact = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!compact || compact.length < 2) return false;
    if (/^[\d\s.,:;!?()[\]{}<>/\\|@#$%^&*_\-+=~"'`]+$/.test(compact)) return false;
    return true;
  };

  const collectTranslatableTextNodes = () => {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(candidate) {
        return isTranslatableTextNode(candidate as Text)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    return nodes;
  };

  const restoreOriginalTexts = () => {
    const nodes = collectTranslatableTextNodes();
    nodes.forEach((node) => {
      const original = translationOriginalTextRef.current.get(node);
      if (typeof original === 'string' && node.nodeValue !== original) {
        node.nodeValue = original;
      }
    });
  };

  const fetchLibreTranslations = async (texts: string[], target: string) => {
    if (!texts.length) return [];
    const response = await fetch('/api/translate', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        q: texts,
        source: 'az',
        target,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translate API failed (${response.status})`);
    }

    const payload = await response.json();
    if (payload?.fallback) {
      throw new Error('LibreTranslate fallback mode active');
    }
    if (Array.isArray(payload?.translatedText)) {
      return payload.translatedText.map((item: unknown) => String(item ?? ''));
    }
    if (typeof payload?.translatedText === 'string') {
      return [payload.translatedText];
    }
    return [];
  };

  const switchToGTranslate = (langCode: string, token: number, withSplash: boolean) => {
    if (translationEngineRef.current === 'gtranslate') return;
    translationEngineRef.current = 'gtranslate';
    ensureGTranslate();
    setGTranslateCookie(langCode);
    applyGTranslateLanguage(langCode, token, withSplash, 0);
  };

  const applyLibreTranslate = async (langCode: string, token: number, withSplash: boolean) => {
    const target = getLibreTargetLanguage(langCode);
    const normalized = normalizeTranslateCode(langCode);
    const runId = ++translationRunIdRef.current;

    if (token !== languageTransitionTokenRef.current) return;

    if (target === 'az') {
      restoreOriginalTexts();
      lastAppliedLanguageRef.current = normalized;
      return;
    }

    const nodes = collectTranslatableTextNodes();
    const entries: Array<{ node: Text; original: string }> = [];

    nodes.forEach((node) => {
      const current = String(node.nodeValue || '');
      if (!translationOriginalTextRef.current.has(node)) {
        translationOriginalTextRef.current.set(node, current);
      }
      const original = String(translationOriginalTextRef.current.get(node) || current);
      const compact = original.replace(/\s+/g, ' ').trim();
      if (!compact) return;
      entries.push({ node, original });
    });

    const cacheKey = (value: string) => `${target}::${value}`;
    const pendingUnique: string[] = [];
    const seen = new Set<string>();
    entries.forEach(({ original }) => {
      const key = cacheKey(original);
      if (translationCacheRef.current.has(key) || seen.has(key)) return;
      seen.add(key);
      pendingUnique.push(original);
    });

    const chunkSize = 30;
    for (let i = 0; i < pendingUnique.length; i += chunkSize) {
      if (token !== languageTransitionTokenRef.current) return;
      if (runId !== translationRunIdRef.current) return;

      const chunk = pendingUnique.slice(i, i + chunkSize);
      try {
        const translatedChunk = await fetchLibreTranslations(chunk, target);
        chunk.forEach((original, index) => {
          const translatedValue = translatedChunk[index];
          if (typeof translatedValue === 'string' && translatedValue.trim()) {
            translationCacheRef.current.set(cacheKey(original), translatedValue);
          } else {
            translationCacheRef.current.set(cacheKey(original), original);
          }
        });
      } catch {
        switchToGTranslate(normalized, token, withSplash);
        return;
      }
    }

    if (token !== languageTransitionTokenRef.current) return;
    if (runId !== translationRunIdRef.current) return;

    entries.forEach(({ node, original }) => {
      const translated = translationCacheRef.current.get(cacheKey(original));
      if (typeof translated === 'string' && translated !== node.nodeValue) {
        node.nodeValue = translated;
      }
    });

    lastAppliedLanguageRef.current = normalized;
  };

  const setGTranslateCookie = (code: string) => {
    const normalized = normalizeTranslateCode(code);
    const [, target = 'az'] = normalized.split('|');
    const cookieValue = `/az/${target}`;
    const host = window.location.hostname;
    const baseHost = host.replace(/^www\./, '');

    // Reset cookie first so each language action forces a fresh apply instead of stale reuse.
    document.cookie = 'googtrans=;path=/;max-age=0;SameSite=Lax';
    document.cookie = `googtrans=${cookieValue};path=/;SameSite=Lax`;
    if (host && host !== 'localhost' && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      document.cookie = `googtrans=;domain=.${baseHost};path=/;max-age=0;SameSite=Lax`;
      document.cookie = `googtrans=${cookieValue};domain=.${baseHost};path=/;SameSite=Lax`;
    }
  };

  const applyGTranslateLanguage = (langCode: string, token: number, withSplash: boolean, attempt = 0) => {
    if (token !== languageTransitionTokenRef.current) return;
    const normalizedCode = normalizeTranslateCode(langCode);
    const w = window as any;
    const select =
      (document.querySelector(`.${GTRANSLATE_WRAPPER_CLASS} .gt_selector`) as HTMLSelectElement | null)
      || (document.querySelector('.gt_selector') as HTMLSelectElement | null);

    // Fallback: some widget states expose doGTranslate without rendering the selector.
    if (!select && typeof w.doGTranslate === 'function') {
      w.doGTranslate(normalizedCode);
      lastAppliedLanguageRef.current = normalizedCode;
      if (withSplash && token === languageTransitionTokenRef.current) {
        const settleTimer = window.setTimeout(() => {
          if (token === languageTransitionTokenRef.current) emitLanguageTransition('end');
        }, 900);
        languageTimersRef.current.push(settleTimer);
      }
      return;
    }

    if (select) {
      const hasOption = Array.from(select.options).some((option) => option.value === normalizedCode);
      if (!hasOption) {
        if (attempt < 50) {
          const retry = window.setTimeout(() => applyGTranslateLanguage(normalizedCode, token, withSplash, attempt + 1), 180);
          languageTimersRef.current.push(retry);
        } else if (withSplash && token === languageTransitionTokenRef.current) {
          emitLanguageTransition('end');
        }
        return;
      }

      select.value = normalizedCode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof w.doGTranslate === 'function') {
        w.doGTranslate(normalizedCode);
      }

      lastAppliedLanguageRef.current = normalizedCode;
      if (withSplash && token === languageTransitionTokenRef.current) {
        const settleTimer = window.setTimeout(() => {
          if (token === languageTransitionTokenRef.current) emitLanguageTransition('end');
        }, 900);
        languageTimersRef.current.push(settleTimer);
      }
      return;
    }

    if (attempt < 50) {
      const retry = window.setTimeout(() => applyGTranslateLanguage(normalizedCode, token, withSplash, attempt + 1), 180);
      languageTimersRef.current.push(retry);
    } else if (withSplash && token === languageTransitionTokenRef.current) {
      emitLanguageTransition('end');
    }
  };

  const ensureGTranslate = () => {
    const w = window as any;

    w.gtranslateSettings = {
      default_language: 'az',
      languages: ['az', 'en', 'ru'],
      wrapper_selector: `.${GTRANSLATE_WRAPPER_CLASS}`
    };

    if (!document.getElementById(GTRANSLATE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = GTRANSLATE_SCRIPT_ID;
      script.src = 'https://cdn.gtranslate.net/widgets/latest/fc.js';
      script.defer = true;
      document.body.appendChild(script);
    }
  };

  const applySiteLanguage = (langCode: string, withSplash = false) => {
    const normalized = normalizeTranslateCode(langCode);
    const token = languageTransitionTokenRef.current;

    if (USE_LIBRE_TRANSLATE && translationEngineRef.current === 'libre') {
      suppressObserverUntilRef.current = Date.now() + (withSplash ? 1200 : 600);
      void applyLibreTranslate(normalized, token, withSplash);
      return;
    }

    ensureGTranslate();
    setGTranslateCookie(normalized);
    suppressObserverUntilRef.current = Date.now() + (withSplash ? 1800 : 900);
    applyGTranslateLanguage(normalized, token, withSplash);
  };

  const emitLanguageTransition = (type: 'start' | 'end') => {
    window.dispatchEvent(
      new CustomEvent(type === 'start' ? LANGUAGE_TRANSITION_START_EVENT : LANGUAGE_TRANSITION_END_EVENT)
    );
  };

  const applyFreshLanguage = (langCode: string, withSplash = false) => {
    const normalized = normalizeTranslateCode(langCode);
    if (USE_LIBRE_TRANSLATE) {
      applySiteLanguage(normalized, withSplash);
      return;
    }

    const token = languageTransitionTokenRef.current;
    if (normalized === 'az|az') {
      applySiteLanguage(normalized, withSplash);
      return;
    }

    applySiteLanguage('az|az', false);
    const refreshTimer = window.setTimeout(() => {
      if (token !== languageTransitionTokenRef.current) return;
      applySiteLanguage(normalized, withSplash);
    }, 70);
    languageTimersRef.current.push(refreshTimer);
  };

  const scheduleLanguageReapply = (langCode: string, withSplash = false, force = false) => {
    const now = Date.now();
    const normalized = normalizeTranslateCode(langCode);

    if (!withSplash) {
      languageTransitionTokenRef.current += 1;
      if (!force && lastAppliedLanguageRef.current === normalized) return;
      applyFreshLanguage(normalized, false);
      lastReapplyAtRef.current = now;
      return;
    }

    languageTimersRef.current.forEach((id) => window.clearTimeout(id));
    languageTimersRef.current = [];
    const token = ++languageTransitionTokenRef.current;

    emitLanguageTransition('start');
    applyFreshLanguage(normalized, true);
    lastReapplyAtRef.current = now;

    // Fast stabilization pass so language switch feels instant on mobile.
    const passDelays = [260];
    passDelays.forEach((delay) => {
      const passTimer = window.setTimeout(() => {
        if (token !== languageTransitionTokenRef.current) return;
        applyFreshLanguage(normalized, false);
      }, delay);
      languageTimersRef.current.push(passTimer);
    });

    const finishTimer = window.setTimeout(() => {
      if (token === languageTransitionTokenRef.current) emitLanguageTransition('end');
    }, 540);
    languageTimersRef.current.push(finishTimer);
  };

  useEffect(() => {
    ensureGTranslate();
    return () => {
      languageTimersRef.current.forEach((id) => window.clearTimeout(id));
      languageTimersRef.current = [];
      if (observerTimerRef.current !== null) {
        window.clearTimeout(observerTimerRef.current);
        observerTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const isInitialSync = !languageBootstrappedRef.current;
    languageBootstrappedRef.current = true;

    if (pendingSplashLanguageRef.current === selectedLanguage) {
      pendingSplashLanguageRef.current = null;
    }

    scheduleLanguageReapply(languageMap[selectedLanguage] || 'az|az', isInitialSync, !isInitialSync);
  }, [selectedLanguage]);

  useEffect(() => {
    if (!languageBootstrappedRef.current) return;
    if (selectedLanguage === 'AZ') return;
    if (Date.now() < suppressObserverUntilRef.current) return;
    const timer = window.setTimeout(() => {
      scheduleLanguageReapply(languageMap[selectedLanguage] || 'az|az', false, true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [currentView, selectedLanguage]);

  useEffect(() => {
    if (!languageBootstrappedRef.current) return;
    if (selectedLanguage === 'AZ') return;

    const observer = new MutationObserver(() => {
      if (Date.now() < suppressObserverUntilRef.current) return;
      if (observerTimerRef.current !== null) {
        window.clearTimeout(observerTimerRef.current);
      }
      observerTimerRef.current = window.setTimeout(() => {
        observerTimerRef.current = null;
        const now = Date.now();
        if (now - observerLastApplyAtRef.current < 700) return;
        observerLastApplyAtRef.current = now;
        scheduleLanguageReapply(languageMap[selectedLanguage] || 'az|az', false, true);
      }, 220);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
      if (observerTimerRef.current !== null) {
        window.clearTimeout(observerTimerRef.current);
        observerTimerRef.current = null;
      }
    };
  }, [selectedLanguage]);

  useEffect(() => {
    if (!isLangOpen) return;

    const handlePointerOutside = (event: PointerEvent) => {
      const node = languagePickerRef.current;
      if (!node) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const clickedInside = path.includes(node) || node.contains(event.target as Node);
      if (!clickedInside) setIsLangOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLangOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isLangOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    translationEngineRef.current = 'gtranslate';
    ensureGTranslate();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const syncLanguageFromCookie = () => {
      const fromCookie = readGoogTransTarget();
      if (!fromCookie) return;
      const now = Date.now();
      const expected = expectedWidgetLanguageRef.current;
      if (expected && fromCookie === expected) {
        expectedWidgetLanguageRef.current = null;
        cookieSyncBlockUntilRef.current = 0;
      } else if (expected && now < cookieSyncBlockUntilRef.current) {
        // Ignore stale cookie values right after widget click.
        return;
      }
      if (fromCookie === selectedLanguageRef.current) return;
      setSelectedLanguage(fromCookie);
      localStorage.setItem(TRANSLATE_SELECTED_LANG_KEY, fromCookie);
      pendingSplashLanguageRef.current = fromCookie;
      translationEngineRef.current = 'gtranslate';
    };

    const onWidgetClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const langLink = target.closest('[data-gt-lang]') as HTMLElement | null;
      if (!langLink) return;
      const gtLang = String(langLink.getAttribute('data-gt-lang') || '').trim().toLowerCase();
      const mapped = gtLang === 'az' ? 'AZ' : gtLang === 'ru' ? 'RU' : gtLang === 'en' ? 'ENG' : null;
      if (!mapped) return;
      expectedWidgetLanguageRef.current = mapped;
      cookieSyncBlockUntilRef.current = Date.now() + 1800;
      setSelectedLanguage(mapped);
      localStorage.setItem(TRANSLATE_SELECTED_LANG_KEY, mapped);
      pendingSplashLanguageRef.current = mapped;
      translationEngineRef.current = 'gtranslate';
    };

    const intervalId = window.setInterval(syncLanguageFromCookie, 400);
    document.addEventListener('click', onWidgetClick, true);
    syncLanguageFromCookie();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', onWidgetClick, true);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navbarPage = getPage('navbar');
  const logoImg = getImageGeneral('SITE_LOGO_LIGHT').path;

  const defaultNavItems = [
    { name: 'ANA SƏHİFƏ', target: { type: 'view', view: 'home' } as NavTarget, activeView: 'home' },
    { name: 'HAQQIMIZDA', target: { type: 'view', view: 'about' } as NavTarget, activeView: 'about' },
    { name: 'XƏBƏRLƏR', target: { type: 'view', view: 'news' } as NavTarget, activeView: 'news' },
    { name: 'TƏDBİRLƏR', target: { type: 'view', view: 'events' } as NavTarget, activeView: 'events' },
    { name: 'SÜRÜCÜLƏR', target: { type: 'view', view: 'drivers' } as NavTarget, activeView: 'drivers' },
    { name: 'QALEREYA', target: { type: 'view', view: 'gallery' } as NavTarget, activeView: 'gallery' },
    { name: 'QAYDALAR', target: { type: 'view', view: 'rules' } as NavTarget, activeView: 'rules' },
    { name: 'ƏLAQƏ', target: { type: 'view', view: 'contact' } as NavTarget, activeView: 'contact' },
  ];

  const viewIds = new Set(['home', 'about', 'news', 'events', 'drivers', 'gallery', 'rules', 'contact', 'privacy', 'terms']);
  const viewByPath: Record<string, string> = {
    home: 'home',
    about: 'about',
    news: 'news',
    events: 'events',
    drivers: 'drivers',
    gallery: 'gallery',
    rules: 'rules',
    contact: 'contact',
    ana: 'home',
    haqqimizda: 'about',
    xeberler: 'news',
    tedbirler: 'events',
    suruculer: 'drivers',
    qaydalar: 'rules',
    elaqe: 'contact',
    privacy: 'privacy',
    privacypolicy: 'privacy',
    mexfiliksiyaseti: 'privacy',
    terms: 'terms',
    termsofservice: 'terms',
    xidmetsertleri: 'terms',
  };

  type NavTarget =
    | { type: 'view'; view: string }
    | { type: 'external'; url: string };
  const normalize = (value: string) =>
    (value || '')
      .toLocaleLowerCase('az')
      .replace(/ə/g, 'e')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');

  const inferViewFromText = (value: string): string | null => {
    const token = normalize(value);
    if (token.includes('anashe') || token.includes('anasif')) return 'home';
    if (token.includes('haqqimizda')) return 'about';
    if (token.includes('xeber') || token.includes('xber') || token.includes('xbr')) return 'news';
    if (token.includes('tedbir') || token.includes('tdbir') || token.includes('tebdir')) return 'events';
    if (token.includes('surucu') || token.includes('srucu') || token.includes('src')) return 'drivers';
    if (token.includes('qalereya') || token.includes('galereya')) return 'gallery';
    if (token.includes('qayda')) return 'rules';
    if (token.includes('elaqe') || token.includes('laq') || token.includes('elaq')) return 'contact';
    if (token.includes('privacy') || token.includes('mexfilik')) return 'privacy';
    if (token.includes('terms') || token.includes('xidmetsert')) return 'terms';
    return null;
  };

  const resolveViewFromUrl = (url: string): string | null => {
    const raw = (url || '').trim();
    if (!raw) return null;

    const direct = normalize(raw);
    if (viewIds.has(direct)) return direct;
    if (viewByPath[direct]) return viewByPath[direct];

    try {
      const parsed = new URL(raw, window.location.origin);
      const sameOrigin = parsed.origin === window.location.origin;
      if (!sameOrigin) return null;

      const pathToken = normalize(parsed.pathname.replace(/^\/+|\/+$/g, ''));
      const hashToken = normalize(parsed.hash.replace(/^#/, ''));
      const queryView = normalize(parsed.searchParams.get('view') || '');
      const queryTab = normalize(parsed.searchParams.get('tab') || '');

      const candidates = [pathToken, hashToken, queryView, queryTab];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (viewIds.has(candidate)) return candidate;
        if (viewByPath[candidate]) return viewByPath[candidate];
      }
    } catch {
      return null;
    }

    return null;
  };

  const resolveNavTarget = (rawUrl: string, fallbackText: string, fallbackLabel: string): NavTarget => {
    const inferred =
      inferViewFromText(fallbackText) ||
      inferViewFromText(fallbackLabel) ||
      resolveViewFromUrl(rawUrl);

    if (inferred) {
      return { type: 'view', view: inferred };
    }

    if (rawUrl.startsWith('http')) {
      return { type: 'external', url: rawUrl };
    }

    return { type: 'view', view: 'home' };
  };

  const navItems = (navbarPage?.sections || [])
    .filter((s) => {
      const label = (s.label || '').toUpperCase();
      const value = (s.value || '').toUpperCase();
      if (label.includes('SITE_LOGO') || label.includes('ALT:')) return false;
      if (value.includes('SITE_LOGO') || value.includes('FORSAJ LOGO')) return false;
      if (!((s.value || '').trim() || (s.label || '').trim())) return false;
      return true;
    })
    .map((s) => {
      const fallbackName = (s.value || s.label || '').trim();
      const name = getText(s.id, fallbackName);
      const rawUrl = (s.url || '').trim();
      const target = resolveNavTarget(rawUrl, fallbackName, s.label || '');
      const activeView = target.type === 'view' ? target.view : null;

      return { name, target, activeView };
    });
  const dedupedNavItems = navItems.filter((item, index, arr) => {
    const key = item.target.type === 'view'
      ? `view:${item.target.view}`
      : `external:${item.target.url}`;
    return arr.findIndex((candidate) => {
      const candidateKey = candidate.target.type === 'view'
        ? `view:${candidate.target.view}`
        : `external:${candidate.target.url}`;
      return candidateKey === key;
    }) === index;
  });

  const resolvedNavItems = dedupedNavItems.length > 0 ? dedupedNavItems : defaultNavItems;

  const languages = ['AZ', 'RU', 'ENG'];

  const handleLanguageSelect = (nextLanguage: string) => {
    languageTimersRef.current.forEach((id) => window.clearTimeout(id));
    languageTimersRef.current = [];
    if (observerTimerRef.current !== null) {
      window.clearTimeout(observerTimerRef.current);
      observerTimerRef.current = null;
    }

    const normalizedLanguage = (nextLanguage as 'AZ' | 'RU' | 'ENG');
    const mapped = languageMap[normalizedLanguage] || 'az|az';
    expectedWidgetLanguageRef.current = normalizedLanguage;
    cookieSyncBlockUntilRef.current = Date.now() + 1800;
    if (normalizedLanguage !== selectedLanguage) {
      setSelectedLanguage(normalizedLanguage);
      localStorage.setItem(TRANSLATE_SELECTED_LANG_KEY, normalizedLanguage);
      pendingSplashLanguageRef.current = nextLanguage as 'AZ' | 'RU' | 'ENG';
    }

    // Apply immediately on every click (even if same language) to avoid stale translate cache behavior.
    scheduleLanguageReapply(mapped, false, true);
    [260, 700, 1400].forEach((delay) => {
      const settleTimer = window.setTimeout(() => {
        scheduleLanguageReapply(mapped, false, true);
      }, delay);
      languageTimersRef.current.push(settleTimer);
    });
    setIsLangOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavTargetClick = (target: NavTarget) => {
    if (target.type === 'external') {
      window.open(target.url, '_blank');
    } else {
      onViewChange((viewIds.has(target.view) ? target.view : 'home') as any);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4 flex items-center justify-between shadow-2xl">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            onViewChange('home');
            setIsMobileMenuOpen(false);
          }}
        >
          {logoImg ? (
            <img src={logoImg} alt="Forsaj Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-[#FF4D00] w-10 h-10 rounded-sm flex items-center justify-center relative shadow-[0_0_20px_rgba(255,77,0,0.4)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current transform -rotate-12">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter flex items-center">
                <span className="text-white">FORSAJ</span>
                <span className="text-[#FF4D00] ml-1">CLUB</span>
              </h1>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 xl:gap-4">
          {resolvedNavItems.map((item, idx) => (
            <button
              key={`${item.name}-${idx}`}
              onClick={() => handleNavTargetClick(item.target)}
              className={`px-4 py-2 text-[10px] xl:text-[11px] font-black italic transition-all uppercase tracking-tight relative transform -skew-x-12 ${currentView === item.activeView
                ? 'bg-[#FF4D00] text-black shadow-[0_0_25px_rgba(255,77,0,0.25)] border-2 border-[#FF4D00]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-2 border-transparent'
                }`}
            >
              <span className="transform skew-x-12 block whitespace-nowrap">{item.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`${GTRANSLATE_WRAPPER_CLASS} notranslate min-h-[44px]`}
            translate="no"
          />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex lg:hidden items-center justify-center w-11 h-11 rounded-sm border border-white/15 bg-white/5 text-white hover:bg-[#FF4D00] hover:text-black transition-colors"
            aria-label={getText('MOBILE_MENU_OPEN', 'Menyunu aç')}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[140] bg-[#050505]/98 backdrop-blur-md lg:hidden">
          <div className="h-full flex flex-col px-6 py-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => {
                  onViewChange('home');
                  setIsMobileMenuOpen(false);
                }}
                className="text-white font-black italic tracking-tighter text-xl"
              >
                FORSAJ <span className="text-[#FF4D00]">CLUB</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-white/15 bg-white/5 text-white hover:bg-[#FF4D00] hover:text-black transition-colors"
                aria-label={getText('MOBILE_MENU_CLOSE', 'Menyunu bağla')}
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-3">
              {resolvedNavItems.map((item, idx) => (
                <button
                  key={`mobile-${item.name}-${idx}`}
                  type="button"
                  onClick={() => handleNavTargetClick(item.target)}
                  className={`w-full text-left px-5 py-4 font-black italic text-sm uppercase tracking-[0.16em] border rounded-sm transition-all ${
                    currentView === item.activeView
                      ? 'bg-[#FF4D00] text-black border-[#FF4D00]'
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] font-black italic uppercase tracking-[0.24em] text-gray-500 mb-3">
                {getText('MOBILE_LANGUAGE_TITLE', 'DİL')}
              </p>
              <div className="mt-3">
                <p className="text-[10px] font-black italic uppercase tracking-[0.16em] text-gray-600">
                  {getText('MOBILE_LANGUAGE_HINT', 'DİLİ SEÇƏN KİMİ TƏRCÜMƏ EDİLƏCƏK')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
