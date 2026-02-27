import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

const EVENTS_TARGET_EVENT_KEY = 'forsaj_events_target_event';

interface NextRaceProps {
  onViewChange: (view: any) => void;
}

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  category: string;
  img: string;
  status: string;
}

const normalizeEventStatus = (rawStatus: unknown): 'planned' | 'past' => {
  const normalized = String(rawStatus || '').trim().toLocaleLowerCase('az');
  if (normalized === 'past' || normalized === 'kecmis' || normalized === 'keçmiş') return 'past';
  return 'planned';
};

const NextRace: React.FC<NextRaceProps> = ({ onViewChange }) => {
  const { getText, getUrl, getImage, getPage } = useSiteContent('nextrace');
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const nextRacePage = getPage('nextrace');
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
    privacy: 'privacy',
    privacypolicy: 'privacy',
    mexfiliksiyaseti: 'privacy',
    terms: 'terms',
    termsofservice: 'terms',
    xidmetsertleri: 'terms'
  };

  const normalizeToken = (value: string) =>
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

  const resolveView = (raw: string): string | null => {
    const token = normalizeToken(raw);
    if (!token) return null;
    if (viewIds.has(token)) return token;
    return viewAliases[token] || null;
  };

  const resolveViewFromUrl = (rawUrl: string): string | null => {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const currentHost = window.location.hostname.replace(/^www\./, '');
      const parsedHost = parsed.hostname.replace(/^www\./, '');
      const isSameHost = parsedHost === currentHost;
      const isLikelyInternalHost = parsedHost.includes('forsaj') || currentHost.includes('forsaj');
      if (!isSameHost && !isLikelyInternalHost) return null;

      const candidates = [
        parsed.pathname.replace(/^\/+|\/+$/g, ''),
        parsed.hash.replace(/^#/, ''),
        parsed.searchParams.get('view') || '',
        parsed.searchParams.get('tab') || ''
      ];

      for (const candidate of candidates) {
        const resolved = resolveView(candidate);
        if (resolved) return resolved;
      }
    } catch {
      return null;
    }
    return null;
  };

  const navigateFromConfig = (rawTarget: string, fallbackView: string) => {
    const value = (rawTarget || '').trim();
    const fallback = resolveView(fallbackView) || fallbackView;

    if (!value) {
      onViewChange(fallback as any);
      return;
    }

    const resolved =
      resolveView(value) ||
      resolveViewFromUrl(value) ||
      resolveViewFromUrl(value.startsWith('/') ? value : `/${value}`);

    if (resolved) {
      onViewChange(resolved as any);
      return;
    }

    if (/^https?:\/\//i.test(value)) {
      window.open(value, '_blank');
      return;
    }

    onViewChange(fallback as any);
  };

  const saveTargetEventAndNavigate = (rawTarget: string, fallbackView: string) => {
    const value = (rawTarget || '').trim();
    const resolved =
      resolveView(value) ||
      resolveViewFromUrl(value) ||
      resolveViewFromUrl(value.startsWith('/') ? value : `/${value}`);
    const targetView = (resolved || (value ? '' : fallbackView)) as string;

    if (targetView === 'events' && nextEvent) {
      try {
        sessionStorage.setItem(
          EVENTS_TARGET_EVENT_KEY,
          JSON.stringify({
            id: nextEvent.id,
            title: nextEvent.title,
            date: nextEvent.date
          })
        );
      } catch {
        // ignore storage access errors
      }
    }

    navigateFromConfig(rawTarget, fallbackView);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();

        const upcoming = (Array.isArray(data) ? data : [])
          .filter((e: Event) => normalizeEventStatus(e.status) === 'planned')
          .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (upcoming.length > 0) {
          setNextEvent(upcoming[0]);
        } else {
          setNextEvent(null);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
  }, []);

  const displayDate = nextEvent?.date || getText('RACE_DATE', '2024-07-20');
  const displayLocation = nextEvent?.location || getText('RACE_CITY', 'SUMQAYIT');
  const displayCategory = nextEvent?.category || getText('RACE_TYPE', 'CHALLENGE');
  const displayFullLocation = nextEvent?.title || getText('RACE_LOCATION', 'SUMQAYIT SAHİL TRASI // SECTOR 04');
  const raceFallbackImage = getImage('race-bg', 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?q=80&w=1974&auto=format&fit=crop');
  const configuredNextRaceImage = (nextRacePage?.images || []).find((img) => (img.path || '').trim())?.path || '';
  const displayImage = configuredNextRaceImage || nextEvent?.img || raceFallbackImage.path;

  return (
    <section className="py-24 px-6 lg:px-20 bg-[#0F0F0F]">
      <div className="flex justify-between items-end mb-12">
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-12 bg-[#FF4D00]"></div>
          <div>
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('SECTION_TITLE', 'NÖVBƏTİ YARIŞ')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[10px] mt-1 uppercase tracking-[0.2em]">
              {getText('SECTION_SUBTITLE', 'LİVE REGİSTRATİON OPEN')}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            navigateFromConfig(getUrl('VIEW_ALL_BTN', 'events'), 'events');
          }}
          className="bg-white/5 text-white font-black italic text-[10px] px-8 py-3 rounded-sm transform -skew-x-12 flex items-center gap-2 hover:bg-[#FF4D00] hover:text-black transition-all border border-white/5"
        >
          <span className="transform skew-x-12">{getText('VIEW_ALL_BTN', 'TAM TƏQVİM')}</span> <ChevronRight className="w-4 h-4 transform skew-x-12" />
        </button>
      </div>

      <div className="bg-[#111] shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden rounded-sm border-l-8 border-[#FF4D00] max-w-6xl mx-auto relative group">
        <div className="md:w-1/2 bg-black relative min-h-[300px] md:min-h-0 overflow-hidden">
          <img
            src={displayImage}
            alt={getText('RACE_IMAGE_ALT', 'Next Race')}
            className="w-full h-full object-cover opacity-40 grayscale group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <span className="text-[#FF4D00] text-9xl font-black italic opacity-5 uppercase select-none tracking-tighter">
              {getText('RACE_LOCATION_BG', displayLocation)}
            </span>
          </div>
        </div>
        <div className="md:w-1/2 p-10 md:p-20 flex flex-col justify-center">
          <div className="flex items-center gap-3 text-[#FF4D00] font-black italic mb-4">
            <Calendar className="w-5 h-5" />
            <span className="text-lg tracking-widest uppercase">{displayDate}</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black italic leading-[0.9] mb-6 tracking-tighter uppercase text-white">
            {displayLocation} <br /><span className="text-gray-500">{displayCategory}</span>
          </h2>
          <div className="flex items-center gap-2 text-gray-500 font-black italic mb-10 text-xs uppercase tracking-widest">
            <MapPin className="w-4 h-4 text-[#FF4D00]" />
            <span>{displayFullLocation}</span>
          </div>

          <button
            onClick={() => {
              saveTargetEventAndNavigate(getUrl('REGISTER_BTN', 'events'), 'events');
            }}
            className="bg-[#FF4D00] hover:bg-white text-black font-black italic py-5 px-12 rounded-sm flex items-center gap-3 transition-all self-start transform -skew-x-12 group shadow-[0_10px_30px_rgba(255,77,0,0.2)]"
          >
            <span className="transform skew-x-12 uppercase text-lg">{getText('REGISTER_BTN', 'QATILMAQ ÜÇÜN QEYDİYYAT')}</span>
            <ChevronRight className="w-6 h-6 transform skew-x-12 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default NextRace;
