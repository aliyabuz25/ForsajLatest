import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlayCircle, Image as ImageIcon, Video, ArrowRight, ArrowLeft, Zap, Maximize2, Calendar, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

import CsPlayer from './CsPlayer';

type PreparedPhoto = {
  id: string;
  src: string;
  title: string;
  album: string;
};

type PhotoGridItem =
  | {
    type: 'photo';
    key: string;
    photo: PreparedPhoto;
  }
  | {
    type: 'album';
    key: string;
    albumTitle: string;
    photos: PreparedPhoto[];
  };

const DEFAULT_ALBUM_KEYS = new Set([
  '',
  'ümumi arxiv',
  'umumi arxiv',
  'general archive',
  'default',
  'archive',
  'arxiv'
].map(k => k.normalize('NFC')));

const normalizeAlbumName = (value: unknown) => String(value ?? '').trim().normalize('NFC');
const normalizeAlbumKey = (value: string) => normalizeAlbumName(value).toLowerCase();
const isNamedAlbum = (value: string) => {
  const key = normalizeAlbumKey(value);
  return key !== '' && !DEFAULT_ALBUM_KEYS.has(key);
};
const GALLERY_REFRESH_MS = 3000;
const GALLERY_VERSION_KEY = 'forsaj_gallery_version';

const GalleryPage: React.FC = () => {
  const [activeType, setActiveType] = useState<'photos' | 'videos'>('photos');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [dynamicVideos, setDynamicVideos] = useState<any[]>([]);
  const [dynamicPhotos, setDynamicPhotos] = useState<any[]>([]);
  const { getText } = useSiteContent('gallerypage');
  const lightboxRef = useRef<any>(null);
  const lightboxReadyRef = useRef(false);
  const isLightboxOpenRef = useRef(false);
  const photosSignatureRef = useRef('');
  const videosSignatureRef = useRef('');

  const preparedPhotos = useMemo<PreparedPhoto[]>(() => {
    if (!Array.isArray(dynamicPhotos)) return [];

    return dynamicPhotos
      .map((photo: any, index: number) => {
        const src = String(photo?.url || photo?.path || '').trim();
        if (!src) return null;

        const album = normalizeAlbumName(photo?.album || photo?.event || '');
        const title = String(photo?.title || photo?.alt || `Şəkil ${index + 1}`).trim() || `Şəkil ${index + 1}`;
        const rawId = String(photo?.id ?? `${index}-${src}`);

        return {
          id: rawId,
          src,
          title,
          album
        };
      })
      .filter((photo): photo is PreparedPhoto => photo !== null)
      .sort((a, b) => {
        const idA = parseFloat(a.id) || 0;
        const idB = parseFloat(b.id) || 0;
        return idB - idA;
      });
  }, [dynamicPhotos]);

  const photoGridItems = useMemo<PhotoGridItem[]>(() => {
    const items: PhotoGridItem[] = [];
    const albumBuckets = new Map<string, { albumTitle: string; photos: PreparedPhoto[] }>();

    preparedPhotos.forEach((photo, index) => {
      if (!isNamedAlbum(photo.album)) {
        items.push({
          type: 'photo',
          key: `photo-${photo.id}-${index}`,
          photo
        });
        return;
      }

      const albumKey = normalizeAlbumKey(photo.album);
      const existingAlbum = albumBuckets.get(albumKey);

      if (!existingAlbum) {
        const albumEntry = {
          albumTitle: photo.album,
          photos: [photo]
        };
        albumBuckets.set(albumKey, albumEntry);
        items.push({
          type: 'album',
          key: `album-${albumKey}`,
          albumTitle: albumEntry.albumTitle,
          photos: albumEntry.photos
        });
        return;
      }

      existingAlbum.photos.push(photo);
    });

    return items;
  }, [preparedPhotos]);

  const [selectedAlbum, setSelectedAlbum] = useState<{ albumTitle: string; photos: PreparedPhoto[] } | null>(null);

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

  const buildPhotosSignature = (photos: any[]) =>
    photos
      .map((item) => `${item?.id ?? ''}|${item?.url ?? item?.path ?? ''}|${item?.title ?? item?.alt ?? ''}|${item?.album ?? item?.event ?? ''}`)
      .join('||');

  const buildVideosSignature = (videos: any[]) =>
    videos
      .map((item) => `${item?.id ?? ''}|${item?.videoId ?? item?.video_id ?? ''}|${item?.youtubeUrl ?? item?.url ?? ''}|${item?.thumbnail ?? ''}|${item?.duration ?? ''}`)
      .join('||');

  useEffect(() => {
    let mounted = true;

    const loadGallery = async () => {
      if (isLightboxOpenRef.current) return;
      try {
        const stamp = Date.now();
        const photosRes = await fetch(`/api/gallery-photos?v=${stamp}`, { cache: 'no-store' });
        if (photosRes.ok) {
          const photos = await photosRes.json();
          if (photos && mounted) {
            const nextSignature = buildPhotosSignature(Array.isArray(photos) ? photos : []);
            if (nextSignature !== photosSignatureRef.current) {
              photosSignatureRef.current = nextSignature;
              setDynamicPhotos(photos);
            }
          }
        }

        const videosRes = await fetch(`/api/videos?v=${stamp}`, { cache: 'no-store' });
        if (videosRes.ok) {
          const videos = await videosRes.json();
          if (videos && mounted) {
            const mapped = videos
              .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map((v: any) => {
                const videoId = v.videoId || v.video_id || extractYoutubeId(v.youtubeUrl || v.url);
                return {
                  id: v.id,
                  title: v.title,
                  videoId: videoId,
                  thumbnail: v.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''),
                  duration: v.duration || '00:00'
                };
              })
              .filter((video: any) => !!video.videoId);
            const nextSignature = buildVideosSignature(mapped);
            if (nextSignature !== videosSignatureRef.current) {
              videosSignatureRef.current = nextSignature;
              setDynamicVideos(mapped);
            }
          }
        }
      } catch (err) {
        console.error('Gallery load failed from API', err);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === GALLERY_VERSION_KEY || event.key === 'forsaj_site_content_version') {
        loadGallery();
      }
    };

    loadGallery();
    const refreshInterval = window.setInterval(loadGallery, GALLERY_REFRESH_MS);
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const head = document.head;
    const cssId = 'glightbox-cdn-css';
    const jsId = 'glightbox-cdn-js';

    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css';
      head.appendChild(link);
    }

    const initLightbox = () => {
      const Glightbox = (window as any).GLightbox;
      if (!mounted || !Glightbox || !preparedPhotos.length) return;
      if (isLightboxOpenRef.current) return;

      const elements = preparedPhotos.map((photo) => ({
        href: photo.src,
        type: 'image',
        title: photo.title
      }));

      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // no-op
        }
      }

      lightboxRef.current = Glightbox({
        elements,
        touchNavigation: true,
        loop: true,
        closeButton: true
      });
      if (typeof lightboxRef.current?.on === 'function') {
        lightboxRef.current.on('open', () => {
          isLightboxOpenRef.current = true;
        });
        lightboxRef.current.on('close', () => {
          isLightboxOpenRef.current = false;
        });
      }
      lightboxReadyRef.current = true;
    };

    const existing = document.getElementById(jsId) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).GLightbox) {
        initLightbox();
      } else {
        existing.addEventListener('load', initLightbox, { once: true });
      }
    } else {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js';
      script.async = true;
      script.onload = initLightbox;
      head.appendChild(script);
    }

    return () => {
      mounted = false;
    };
  }, [preparedPhotos]);

  useEffect(() => {
    return () => {
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // no-op
        }
      }
    };
  }, []);

  const openPhotoPreview = (photos: PreparedPhoto[], index = 0) => {
    if (!Array.isArray(photos) || photos.length === 0) return;

    const clampedIndex = Math.min(Math.max(index, 0), photos.length - 1);
    const isMainCollection = photos === preparedPhotos;

    if (isMainCollection && lightboxReadyRef.current && lightboxRef.current) {
      isLightboxOpenRef.current = true;
      lightboxRef.current.openAt(clampedIndex);
      return;
    }

    const Glightbox = (window as any).GLightbox;
    if (Glightbox) {
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // no-op
        }
      }

      lightboxRef.current = Glightbox({
        elements: photos.map((photo) => ({
          href: photo.src,
          type: 'image',
          title: photo.title
        })),
        touchNavigation: true,
        loop: true,
        closeButton: true
      });
      if (typeof lightboxRef.current?.on === 'function') {
        lightboxRef.current.on('open', () => {
          isLightboxOpenRef.current = true;
        });
        lightboxRef.current.on('close', () => {
          isLightboxOpenRef.current = false;
        });
      }
      lightboxReadyRef.current = true;
      isLightboxOpenRef.current = true;
      lightboxRef.current.openAt(clampedIndex);
      return;
    }

    window.open(photos[clampedIndex].src, '_blank');
  };

  const VideoModal = () => {
    if (!playingVideoId) return null;

    return (
      <div
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
      >
        <div className="relative w-full max-w-5xl aspect-video bg-black border border-white/10 shadow-[0_0_100px_rgba(255,77,0,0.2)]">
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
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white animate-in fade-in duration-500">
      <VideoModal />

      {/* Standardized Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'QALEREYA')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'XRONOLOJİ MOTORSPORT ARXİVİ // FORSAJ CLUB')}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-white/5 p-1 rounded-sm flex items-center border border-white/10 shadow-xl self-end lg:self-center">
          <button
            onClick={() => { setActiveType('photos'); setSelectedAlbum(null); }}
            className={`px-10 py-4 font-black italic text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${activeType === 'photos' ? 'bg-[#FF4D00] text-black transform -skew-x-12 shadow-lg shadow-[#FF4D00]/20' : 'text-gray-500 hover:text-white'}`}
          >
            <span className={activeType === 'photos' ? 'transform skew-x-12 flex items-center gap-2' : 'flex items-center gap-2'}>
              <ImageIcon size={18} /> {getText('TAB_PHOTOS', 'FOTOLAR')}
            </span>
          </button>
          <button
            onClick={() => { setActiveType('videos'); setSelectedAlbum(null); }}
            className={`px-10 py-4 font-black italic text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${activeType === 'videos' ? 'bg-[#FF4D00] text-black transform -skew-x-12 shadow-lg shadow-[#FF4D00]/20' : 'text-gray-500 hover:text-white'}`}
          >
            <span className={activeType === 'videos' ? 'transform skew-x-12 flex items-center gap-2' : 'flex items-center gap-2'}>
              <Video size={18} /> {getText('TAB_VIDEOS', 'VİDEOLAR')}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Content Grid */}
      <div className="space-y-32">
        <section className="relative group">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-white/5 pb-8">
            <div className="flex items-center gap-6">
              <div className="text-6xl md:text-7xl font-black italic text-white/5 select-none leading-none tracking-tighter absolute -top-12 left-0 pointer-events-none group-hover:text-[#FF4D00]/10 transition-colors">
                {activeType === 'photos' ? '01' : '02'}
              </div>
              <div className="relative">
                <h3 className="text-3xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">
                  {selectedAlbum ? selectedAlbum.albumTitle : (activeType === 'photos' ? getText('TAB_PHOTOS', 'FOTOLAR') : getText('TAB_VIDEOS', 'VİDEOLAR'))}
                </h3>
                <div className="flex items-center gap-2 text-[#FF4D00] font-black italic text-[10px] uppercase tracking-[0.3em]">
                  <Zap size={14} /> {getText('DYNAMIC_COLLECTION', 'CANLI ARXİV // YENİLƏNƏN MƏZMUN')}
                </div>
              </div>
            </div>
            {selectedAlbum && (
              <button
                onClick={() => setSelectedAlbum(null)}
                className="bg-[#FF4D00] text-black px-6 py-2 font-black italic text-[10px] uppercase tracking-widest transform -skew-x-12 flex items-center gap-2 hover:bg-white transition-all shadow-lg"
              >
                <span className="transform skew-x-12 flex items-center gap-2"><ArrowLeft size={14} /> {getText('BTN_BACK', 'GERİ QAYIT')}</span>
              </button>
            )}
            <p className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">
              {getText('TOTAL_LABEL', 'TOPLAM')} {activeType === 'photos' ? (selectedAlbum ? selectedAlbum.photos.length : preparedPhotos.length) : dynamicVideos.length} {activeType === 'photos' ? getText('TYPE_PHOTO', 'FOTO') : getText('TYPE_VIDEO', 'VİDEO')}
            </p>
          </div>

          {activeType === 'photos' ? (
            /* Photo Grid */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 animate-in fade-in duration-500">
              {selectedAlbum ? (
                /* Album Detail View */
                selectedAlbum.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="group/item relative aspect-square bg-[#111] overflow-hidden cursor-pointer shadow-lg hover:z-20 transition-all duration-300"
                    onClick={() => openPhotoPreview(selectedAlbum.photos, idx)}
                  >
                    <img
                      src={photo.src}
                      className="w-full h-full object-cover grayscale opacity-60 transition-all duration-500 group-hover/item:scale-110 group-hover/item:grayscale-0 group-hover/item:opacity-100"
                      alt={photo.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-[10px] font-black italic uppercase text-white truncate drop-shadow-md">{photo.title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <Maximize2 size={12} className="text-[#FF4D00]" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Main Collection View */
                photoGridItems.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-500 font-black italic uppercase tracking-widest">
                    {getText('NO_PHOTOS', 'HƏLƏ Kİ FOTO ƏLAVƏ EDİLMƏYİB')}
                  </div>
                ) : (
                  photoGridItems.map((item) => {
                    if (item.type === 'album') {
                      const cover = item.photos[0];
                      return (
                        <div
                          key={item.key}
                          className="group/item relative aspect-square bg-[#111] overflow-hidden cursor-pointer shadow-lg hover:z-20 transition-all duration-300 border border-[#FF4D00]/20"
                          onClick={() => setSelectedAlbum({ albumTitle: item.albumTitle, photos: item.photos })}
                        >
                          <img
                            src={cover.src}
                            className="w-full h-full object-cover grayscale opacity-50 transition-all duration-500 group-hover/item:scale-110 group-hover/item:grayscale-0 group-hover/item:opacity-100"
                            alt={item.albumTitle}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3">
                            <p className="text-[9px] font-black italic uppercase tracking-[0.2em] text-[#FF4D00] mb-1">ALBOM</p>
                            <p className="text-[10px] font-black italic uppercase text-white drop-shadow-md line-clamp-2">{item.albumTitle}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[9px] font-black italic uppercase tracking-wider text-gray-300">
                                {item.photos.length} {getText('TYPE_PHOTO', 'FOTO')}
                              </span>
                              <ArrowRight size={12} className="text-[#FF4D00]" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const photoIndex = preparedPhotos.findIndex((photo) => photo.id === item.photo.id);
                    const safeIndex = photoIndex >= 0 ? photoIndex : 0;

                    return (
                      <div
                        key={item.key}
                        className="group/item relative aspect-square bg-[#111] overflow-hidden cursor-pointer shadow-lg hover:z-20 transition-all duration-300"
                        onClick={() => openPhotoPreview(preparedPhotos, safeIndex)}
                      >
                        <img
                          src={item.photo.src}
                          className="w-full h-full object-cover grayscale opacity-60 transition-all duration-500 group-hover/item:scale-110 group-hover/item:grayscale-0 group-hover/item:opacity-100"
                          alt={item.photo.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-[10px] font-black italic uppercase text-white truncate drop-shadow-md">{item.photo.title}</p>
                          <div className="flex justify-between items-center mt-1">
                            <Maximize2 size={12} className="text-[#FF4D00]" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          ) : (
            /* Video Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {dynamicVideos.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 font-black italic uppercase tracking-widest">
                  {getText('NO_VIDEOS', 'HƏLƏ Kİ VİDEO ƏLAVƏ EDİLMƏYİB')}
                </div>
              ) : (
                dynamicVideos.map((video: any) => (
                  <div
                    key={video.id}
                    onClick={() => {
                      if (!video.videoId) return;
                      setPlayingVideoId(video.videoId);
                    }}
                    className="group/video relative flex flex-col bg-[#111] border border-white/5 overflow-hidden transition-all duration-300 hover:border-[#FF4D00]/50 hover:shadow-2xl shadow-lg cursor-pointer"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={video.thumbnail}
                        className="w-full h-full object-cover grayscale opacity-30 transition-all duration-700 group-hover/video:scale-105 group-hover/video:grayscale-0 group-hover/video:opacity-100"
                        alt={video.title}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 backdrop-blur-sm p-4 rounded-full border border-white/10 transition-all duration-300 group-hover/video:scale-110 group-hover/video:bg-[#FF4D00] group-hover/video:text-black">
                          <PlayCircle size={40} strokeWidth={1.5} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[8px] font-black italic uppercase tracking-widest border border-white/10 text-white/80">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-4 border-t border-white/5">
                      <h4 className="text-[11px] font-black italic text-gray-400 uppercase tracking-tight group-hover/video:text-[#FF4D00] transition-colors line-clamp-1">{video.title}</h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GalleryPage;
