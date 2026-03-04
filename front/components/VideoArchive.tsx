import React, { useEffect, useState } from 'react';
import { PlayCircle, ArrowRight, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import CsPlayer from './CsPlayer';

interface VideoArchiveProps {
  onViewChange: (view: any) => void;
}

interface EventItem {
  id: number;
  title: string;
  date?: string;
  img?: string;
  youtubeUrl?: string;
  youtube_url?: string;
  url?: string;
  status?: string;
}

interface ArchiveVideoItem {
  id: number;
  title: string;
  date: string;
  videoId: string;
  thumbnail: string;
}

const GALLERY_VERSION_KEY = 'forsaj_gallery_version';

const VideoArchive: React.FC<VideoArchiveProps> = ({ onViewChange }) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<ArchiveVideoItem[]>([]);
  const { getText } = useSiteContent('videoarchive');

  const parseEventDateStart = (rawValue: unknown): Date | null => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const dottedMatch = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (dottedMatch) {
      const parsed = new Date(Number(dottedMatch[3]), Number(dottedMatch[2]) - 1, Number(dottedMatch[1]));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const normalizeEventStatus = (rawStatus: unknown, rawDate?: unknown): 'planned' | 'past' => {
    const normalized = String(rawStatus || '').trim().toLocaleLowerCase('az');
    if (normalized === 'past' || normalized === 'kecmis' || normalized === 'keçmiş') return 'past';
    if (normalized === 'planned' || normalized === 'gelecek' || normalized === 'gələcək') return 'planned';

    const eventDate = parseEventDateStart(rawDate);
    if (eventDate) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (eventDate.getTime() < todayStart.getTime()) return 'past';
    }
    return 'planned';
  };

  const getEventDateSortValue = (rawDate: unknown) => parseEventDateStart(rawDate)?.getTime() || 0;

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        const id = parsed.pathname.replace('/', '').trim();
        return id.length === 11 ? id : null;
      }
      if (parsed.hostname.includes('youtube.com')) {
        const byQuery = parsed.searchParams.get('v');
        if (byQuery && byQuery.length === 11) return byQuery;
        const parts = parsed.pathname.split('/').filter(Boolean);
        const candidate = parts[1] || parts[0];
        return candidate && candidate.length === 11 ? candidate : null;
      }
    } catch {
      // fallback regex for malformed URL strings
    }
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  useEffect(() => {
    let mounted = true;

    const loadVideos = async () => {
      try {
        const version = localStorage.getItem('forsaj_site_content_version') || '';
        const response = await fetch(`/api/events?v=${encodeURIComponent(version)}`, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();

        if (Array.isArray(data) && mounted) {
          const mapped = data
            .map((event: EventItem) => {
              const status = normalizeEventStatus(event?.status, event?.date);
              const youtubeUrl = String(event?.youtubeUrl || event?.youtube_url || event?.url || '').trim();
              const videoId = extractYoutubeId(youtubeUrl);
              if (status !== 'past' || !videoId) return null;

              return {
                id: Number(event?.id || 0),
                title: String(event?.title || 'Tədbir').trim() || 'Tədbir',
                date: String(event?.date || '').trim(),
                videoId,
                thumbnail: String(event?.img || '').trim() || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
              };
            })
            .filter((video): video is ArchiveVideoItem => !!video && !!video.videoId)
            .sort((a, b) => getEventDateSortValue(b.date) - getEventDateSortValue(a.date))
            .slice(0, 4);

          setVideos(mapped);
        }
      } catch (err) {
        console.error('Video archive load fail from events API:', err);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === GALLERY_VERSION_KEY || event.key === 'forsaj_site_content_version') {
        loadVideos();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadVideos();
      }
    };

    loadVideos();
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const VideoModal = () => {
    if (!playingVideoId) return null;

    return (
      <div
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
      >
        <div className="relative w-full max-w-5xl aspect-video bg-black border border-white/10 shadow-[0_0_100px_rgba(255,77,0,0.3)]">
          <button
            onClick={(e) => { e.stopPropagation(); setPlayingVideoId(null); }}
            className="absolute -top-12 right-0 md:-right-12 text-white/50 hover:text-[#FF4D00] transition-colors"
          >
            <X size={40} strokeWidth={1.5} />
          </button>

          <CsPlayer videoId={playingVideoId} autoplay />
        </div>
      </div>
    );
  };

  return (
    <section className="py-24 px-6 lg:px-20 bg-[#0A0A0A]">
      <VideoModal />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.5)]"></div>
          <div>
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none text-white break-words [overflow-wrap:anywhere]">
              {getText('SECTION_TITLE', 'VİDEO ARXİVİ')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-xs mt-2 uppercase tracking-[0.3em] break-words [overflow-wrap:anywhere]">{getText('SECTION_SUBTITLE', 'Tarixi yarışların unudulmaz anları')}</p>
          </div>
        </div>
        <button
          onClick={() => onViewChange('gallery')}
          className="self-start md:self-auto max-w-full bg-white/5 border border-white/10 text-white font-black italic text-xs px-6 sm:px-10 py-4 rounded-sm transform -skew-x-12 flex items-center gap-2 hover:bg-[#FF4D00] hover:text-black transition-all shadow-md active:scale-95 group"
        >
          <span className="transform skew-x-12 flex items-center gap-2 uppercase tracking-widest break-words [overflow-wrap:anywhere]">
            {getText('VIEW_ALL_BTN', 'BÜTÜN QALEREYA')} <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {videos.length === 0 ? (
          <div className="col-span-2 md:col-span-4 py-20 text-center border border-white/5 bg-[#111] rounded-sm shadow-2xl">
            <p className="text-gray-400 font-black italic uppercase tracking-widest text-sm">
              {getText('NO_PAST_EVENT_VIDEOS', 'KEÇMİŞ TƏDBİR VİDEOSU TAPILMADI')}
            </p>
            <p className="text-gray-600 font-bold italic uppercase tracking-[0.2em] text-[10px] mt-3">
              {getText('NO_PAST_EVENT_VIDEOS_HINT', 'KEÇMİŞ TƏDBİRƏ YOUTUBE LİNKİ ƏLAVƏ EDİN')}
            </p>
          </div>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              onClick={() => {
                if (!video.videoId) return;
                setPlayingVideoId(video.videoId);
              }}
              className="group relative aspect-[3/4] overflow-hidden bg-[#111] cursor-pointer shadow-2xl rounded-sm border border-white/5"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 group-hover:opacity-80 grayscale"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-[#FF4D00]/10 transition-colors flex items-center justify-center">
                <PlayCircle className="w-16 h-16 text-white opacity-40 group-hover:opacity-100 group-hover:text-[#FF4D00] transition-all transform group-hover:scale-110" strokeWidth={1} />
              </div>
              <div className="absolute bottom-8 left-6 right-6 text-center">
                <div className="text-gray-400 font-black italic text-[10px] mb-2 uppercase tracking-widest">{video.date}</div>
                <h3 className="text-white font-black italic uppercase tracking-tighter text-lg md:text-2xl drop-shadow-2xl group-hover:text-[#FF4D00] transition-colors">
                  {video.title}
                </h3>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default VideoArchive;
