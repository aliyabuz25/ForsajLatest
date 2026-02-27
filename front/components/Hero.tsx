import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface HeroProps {
  onViewChange: (view: any) => void;
}

const Hero: React.FC<HeroProps> = ({ onViewChange }) => {
  const { getText, getImage, getUrl, isLoading } = useSiteContent('hero');

  const heroImg = getImage('hero-bg', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2070&auto=format&fit=crop');

  if (isLoading) return <div className="h-[85vh] bg-black animate-pulse"></div>;

  const viewIds = new Set(['home', 'about', 'news', 'events', 'drivers', 'gallery', 'rules', 'contact', 'privacy', 'terms']);
  const viewAliases: Record<string, string> = {
    ana: 'home',
    anasehife: 'home',
    haqqimizda: 'about',
    news: 'news',
    xeberler: 'news',
    tedbirler: 'events',
    eventstab: 'events',
    suruculer: 'drivers',
    qalereya: 'gallery',
    qaydalar: 'rules',
    elaqe: 'contact',
    privacypolicy: 'privacy',
    mexfiliksiyaseti: 'privacy',
    termsofservice: 'terms',
    xidmetsertleri: 'terms'
  };

  const normalizeToken = (value: string) => (
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
      .replace(/[^a-z0-9]+/g, '')
  );

  const resolveView = (raw: string) => {
    const token = normalizeToken(raw);
    if (!token) return null;
    if (viewIds.has(token)) return token;
    return viewAliases[token] || null;
  };

  const handleAction = (key: string, defaultView: string) => {
    const rawUrl = (getUrl(key, defaultView) || '').trim();
    const fallbackView = resolveView(defaultView) || defaultView;
    if (!rawUrl) {
      onViewChange(fallbackView as any);
      return;
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.origin !== window.location.origin) {
          window.open(rawUrl, '_blank');
          return;
        }

        const candidates = [
          parsed.pathname.replace(/^\/+|\/+$/g, ''),
          parsed.hash.replace(/^#/, ''),
          parsed.searchParams.get('view') || '',
          parsed.searchParams.get('tab') || ''
        ];

        for (const candidate of candidates) {
          const resolved = resolveView(candidate);
          if (resolved) {
            onViewChange(resolved as any);
            return;
          }
        }
      } catch {
        window.open(rawUrl, '_blank');
        return;
      }

      onViewChange(fallbackView as any);
      return;
    }

    const resolved = resolveView(rawUrl) || resolveView(rawUrl.replace(/^\/+/, ''));
    onViewChange((resolved || fallbackView) as any);
  };

  return (
    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg.path}
          alt={heroImg.alt}
          className="w-full h-full object-cover opacity-30 grayscale contrast-125 transition-all duration-700 hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-6xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-0.5 bg-[#FF4D00]"></div>
          <h3 className="hero-kicker text-[#FF4D00] font-black italic tracking-[0.16em] text-[10px] uppercase break-words [overflow-wrap:anywhere]">
            {getText('text-0', 'AZERBAIJAN OFFROAD MOTORSPORT HUB')}
          </h3>
          <div className="w-10 h-0.5 bg-[#FF4D00]"></div>
        </div>
        <h2 className="hero-title text-[clamp(2rem,8vw,6.8rem)] font-black italic tracking-[-0.02em] leading-[0.92] mb-8 text-white uppercase break-words [overflow-wrap:anywhere]">
          {getText('text-1', 'SƏRHƏDSİZ OFFROAD HƏYƏCANI')}
        </h2>
        <p className="hero-desc text-gray-400 font-bold italic max-w-2xl mx-auto mb-10 text-sm md:text-base leading-relaxed uppercase tracking-wide break-words [overflow-wrap:anywhere]">
          {getText('text-2', 'Azərbaycanın ən çətin yollarında peşəkar yarışlar və adrenalin dolu anlar.')}
        </p>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <button
            onClick={() => handleAction('text-3', 'events')}
            className="bg-[#FF4D00] hover:bg-white hover:text-black text-black font-black italic py-5 px-12 rounded-sm flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-[0_10px_40px_rgba(255,77,0,0.3)]"
          >
            {getText('text-3', 'YARIŞLARA BAX')} <ChevronRight className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleAction('text-4', 'about')}
            className="border-2 border-white/20 text-white hover:border-[#FF4D00] hover:text-[#FF4D00] font-black italic py-5 px-12 rounded-sm transition-all bg-white/5 backdrop-blur-sm"
          >
            {getText('text-4', 'HAQQIMIZDA')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
