import React, { useState } from 'react';
import { PlayCircle, ArrowRight, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface VideoArchiveProps {
  onViewChange: (view: any) => void;
}


import CsPlayer from './CsPlayer';

const VideoArchive: React.FC<VideoArchiveProps> = ({ onViewChange }) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videos, setVideos] = React.useState<any[]>([]);
  const { getText } = useSiteContent('videoarchive');

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

  React.useEffect(() => {
    const loadVideos = async () => {
      try {
        const response = await fetch('/api/videos');
        if (!response.ok) throw new Error('Failed to fetch videos');

        const data = await response.json();

        if (data) {
          const mapped = data
            .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 4)
            .map((v: any) => {
              const videoId = v.videoId || v.video_id || extractYoutubeId(v.youtubeUrl || v.url);
              return {
                id: v.id,
                title: v.title,
                videoId: videoId,
                thumbnail: v.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '')
              };
            })
            .filter((video: any) => !!video.videoId);
          setVideos(mapped);
        }
      } catch (err) {
        console.error('Videos load fail from API:', err);
      }
    };
    loadVideos();
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

      <div className="flex justify-between items-end mb-12">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.5)]"></div>
          <div>
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('SECTION_TITLE', 'VİDEO ARXİVİ')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-xs mt-2 uppercase tracking-[0.3em]">{getText('SECTION_SUBTITLE', 'Tarixi yarışların unudulmaz anları')}</p>
          </div>
        </div>
        <button
          onClick={() => onViewChange('gallery')}
          className="bg-white/5 border border-white/10 text-white font-black italic text-xs px-10 py-4 rounded-sm transform -skew-x-12 flex items-center gap-2 hover:bg-[#FF4D00] hover:text-black transition-all shadow-md active:scale-95 group"
        >
          <span className="transform skew-x-12 flex items-center gap-2 uppercase tracking-widest">
            {getText('VIEW_ALL_BTN', 'BÜTÜN QALEREYA')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {videos.map((video, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (!video.videoId) return;
              setPlayingVideoId(video.videoId);
            }}
            className="group relative aspect-[3/4] overflow-hidden bg-[#111] cursor-pointer shadow-2xl rounded-sm border border-white/5"
          >
            <img
              src={video.thumbnail || video.img}
              alt={video.title}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 group-hover:opacity-80 grayscale`}
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-[#FF4D00]/10 transition-colors flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-white opacity-40 group-hover:opacity-100 group-hover:text-[#FF4D00] transition-all transform group-hover:scale-110" strokeWidth={1} />
            </div>
            <div className="absolute bottom-8 left-6 right-6 text-center">
              <h3 className="text-white font-black italic uppercase tracking-tighter text-lg md:text-2xl drop-shadow-2xl group-hover:text-[#FF4D00] transition-colors">
                {video.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VideoArchive;
