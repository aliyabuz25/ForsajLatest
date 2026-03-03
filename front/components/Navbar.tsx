import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface NavbarProps {
  currentView: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms';
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms') => void;
}

type NavTarget =
  | { type: 'view'; view: string }
  | { type: 'external'; url: string };

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

  if (inferred) return { type: 'view', view: inferred };
  if (rawUrl.startsWith('http')) return { type: 'external', url: rawUrl };
  return { type: 'view', view: 'home' };
};

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { getPage, getText } = useSiteContent('navbar');
  const { getImage: getImageGeneral } = useSiteContent('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

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
          className="flex items-center gap-3 cursor-pointer group lg:min-w-[170px]"
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

        <div className="flex items-center justify-end min-w-[170px]">
          <div id="customTranslator" className="custom-gtranslate full notranslate hidden lg:block" translate="no" />
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
              <div className="mobile-translator custom-gtranslate mini notranslate" translate="no" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
