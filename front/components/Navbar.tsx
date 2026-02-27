import React, { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface NavbarProps {
  currentView: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms';
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { getPage, getText, language, setSiteLanguage } = useSiteContent('navbar');
  const { getImage: getImageGeneral } = useSiteContent('general');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const languagePickerRef = useRef<HTMLDivElement | null>(null);
  const GTRANSLATE_SCRIPT_ID = 'gtranslate-widget-script';
  const GTRANSLATE_WRAPPER_CLASS = 'gtranslate_wrapper';
  const languageMap: Record<string, string> = { AZ: 'az|az', RU: 'az|ru', ENG: 'az|en' };

  const normalizeTranslateCode = (code: string) => {
    const normalized = (code || '').trim().toLowerCase();
    if (!normalized) return 'az|az';
    return normalized.includes('|') ? normalized : `az|${normalized}`;
  };

  const setGTranslateCookie = (code: string) => {
    const normalized = normalizeTranslateCode(code);
    const [, target = 'az'] = normalized.split('|');
    const cookieValue = `/az/${target}`;
    const hostname = window.location.hostname;
    document.cookie = `googtrans=${cookieValue};path=/;max-age=31536000`;
    document.cookie = `googtrans=${cookieValue};domain=${hostname};path=/;max-age=31536000`;
  };

  const applyGTranslateLanguage = (langCode: string, attempt = 0) => {
    const normalizedCode = normalizeTranslateCode(langCode);
    const select =
      (document.querySelector(`.${GTRANSLATE_WRAPPER_CLASS} .gt_selector`) as HTMLSelectElement | null)
      || (document.querySelector('.gt_selector') as HTMLSelectElement | null);
    if (select) {
      const hasOption = Array.from(select.options).some((option) => option.value === normalizedCode);
      if (!hasOption) {
        if (attempt < 20) {
          window.setTimeout(() => applyGTranslateLanguage(normalizedCode, attempt + 1), 250);
        }
        return;
      }
      select.value = normalizedCode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const w = window as any;
      if (typeof w.doGTranslate === 'function') {
        w.doGTranslate(normalizedCode);
      }
      return;
    }
    if (attempt < 20) {
      window.setTimeout(() => applyGTranslateLanguage(normalizedCode, attempt + 1), 250);
    }
  };

  const ensureGTranslate = () => {
    const w = window as any;

    w.gtranslateSettings = {
      default_language: 'az',
      languages: ['az', 'ru', 'en'],
      native_language_names: true,
      wrapper_selector: `.${GTRANSLATE_WRAPPER_CLASS}`
    };

    if (!document.getElementById(GTRANSLATE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = GTRANSLATE_SCRIPT_ID;
      script.src = 'https://cdn.gtranslate.net/widgets/latest/dropdown.js';
      script.defer = true;
      document.body.appendChild(script);
    }
  };

  const applySiteLanguage = (langCode: string) => {
    const normalizedCode = normalizeTranslateCode(langCode);
    ensureGTranslate();
    setGTranslateCookie(normalizedCode);
    applyGTranslateLanguage(normalizedCode);
  };

  useEffect(() => {
    ensureGTranslate();
  }, []);

  useEffect(() => {
    applySiteLanguage(languageMap[language] || 'az|az');
  }, [language]);

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
    if (nextLanguage === language) {
      setIsLangOpen(false);
      return;
    }

    setSiteLanguage(nextLanguage as any);
    applySiteLanguage(languageMap[nextLanguage] || 'az|az');
    setIsLangOpen(false);

    // Ensure all sections rehydrate with the newly selected locale.
    window.setTimeout(() => window.location.reload(), 80);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4 flex items-center justify-between shadow-2xl">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onViewChange('home')}
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
            onClick={() => {
              if (item.target.type === 'external') {
                window.open(item.target.url, '_blank');
              } else {
                onViewChange((viewIds.has(item.target.view) ? item.target.view : 'home') as any);
              }
            }}
            className={`px-4 py-2 text-[10px] xl:text-[11px] font-black italic transition-all uppercase tracking-tight relative transform -skew-x-12 ${currentView === item.activeView
              ? 'bg-[#FF4D00] text-black shadow-[0_0_25px_rgba(255,77,0,0.25)] border-2 border-[#FF4D00]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-2 border-transparent'
              }`}
          >
            <span className="transform skew-x-12 block whitespace-nowrap">{item.name}</span>
          </button>
        ))}
      </div>

      <div
        ref={languagePickerRef}
        className={`language-picker relative z-[70] ${isLangOpen ? 'language-picker--open' : ''}`}
      >
        <button
          type="button"
          onClick={() => setIsLangOpen((prev) => !prev)}
          className="language-picker__trigger inline-flex items-center justify-between gap-2"
          aria-label="Select language"
          aria-haspopup="listbox"
          aria-expanded={isLangOpen}
        >
          <Globe className="language-picker__globe" />
          <span className="language-picker__current text-xs">{language}</span>
          <ChevronDown className={`language-picker__chevron ${isLangOpen ? 'language-picker__chevron--open' : ''}`} />
        </button>

        {isLangOpen && (
          <div className="language-picker__menu absolute right-0 z-50" role="listbox" aria-label="Language options">
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={language === lang}
                onClick={() => handleLanguageSelect(lang)}
                className={`language-picker__item block w-full text-left ${language === lang ? 'language-picker__item--active' : ''}`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={GTRANSLATE_WRAPPER_CLASS} style={{ display: 'none' }} />
    </nav>
  );
};

export default Navbar;
