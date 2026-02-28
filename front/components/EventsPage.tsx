import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Calendar, MapPin, X, Car, Users as UsersIcon, Download, FileText, ChevronDown, PlayCircle } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { bbcodeToHtml } from '../utils/bbcode';
import toast from 'react-hot-toast';
import CsPlayer from './CsPlayer';

const EVENTS_TARGET_EVENT_KEY = 'forsaj_events_target_event';

interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
  category: string;
  img: string;
  description?: string;
  rules?: string;
  youtubeUrl?: string;
  youtube_url?: string;
  url?: string;
  pdfUrl?: string;
  pdf_url?: string;
  pdfURL?: string;
  status: 'planned' | 'past';
  registrationEnabled?: boolean;
}

interface EventsPageProps {
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery') => void;
  openMode?: 'default' | 'force-list';
}

const EventsPage: React.FC<EventsPageProps> = ({ onViewChange, openMode = 'default' }) => {
  const { getText, language } = useSiteContent('eventspage');
  const requiredFieldsToast = getText('PILOT_FORM_TOAST_REQUIRED', 'Zəhmət olmasa bütün sahələri doldurun.');
  const submitSuccessToast = getText('PILOT_FORM_TOAST_SUCCESS', 'Qeydiyyat müraciətiniz uğurla göndərildi!');
  const submitErrorToast = getText('PILOT_FORM_TOAST_ERROR', 'Gondərilmə zamanı xəta baş verdi.');
  const whatsappRequiredToast = getText('PILOT_FORM_TOAST_WHATSAPP_REQUIRED', 'WhatsApp nömrəsini düzgün formatda daxil edin.');
  const registrationClosedToast = getText('PILOT_FORM_TOAST_REG_CLOSED', 'Bu tədbir üçün qeydiyyat hazırda bağlıdır.');

  const [eventsData, setEventsData] = useState<EventItem[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const normalizeEventStatus = (rawStatus: unknown, rawDate?: string): 'planned' | 'past' => {
    const normalized = String(rawStatus || '').trim().toLocaleLowerCase('az');
    if (normalized === 'past' || normalized === 'kecmis' || normalized === 'keçmiş') return 'past';
    if (normalized === 'planned' || normalized === 'gelecek' || normalized === 'gələcək') return 'planned';

    const date = new Date(String(rawDate || '').trim());
    if (!Number.isNaN(date.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date.getTime() < today.getTime()) return 'past';
    }
    return 'planned';
  };

  const normalizeRegistrationEnabled = (rawValue: unknown) => {
    if (typeof rawValue === 'boolean') return rawValue;
    const normalized = String(rawValue || '').trim().toLocaleLowerCase('az');
    if (!normalized) return true;
    if (['false', '0', 'no', 'off', 'disabled', 'deactive', 'inactive', 'bagli', 'bağlı'].includes(normalized)) {
      return false;
    }
    return true;
  };

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
    const loadEvents = async () => {
      try {
        const eventsRes = await fetch('/api/events');

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          if (Array.isArray(data)) {
            const normalizedEvents = data.map((item: any) => ({
              ...item,
              status: normalizeEventStatus(item?.status, item?.date),
              youtubeUrl: String(item?.youtubeUrl || item?.youtube_url || item?.url || '').trim(),
              registrationEnabled: normalizeRegistrationEnabled(item?.registrationEnabled ?? item?.registration_enabled)
            }));
            const sortedEvents = normalizedEvents.sort((a: any, b: any) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setEventsData(sortedEvents as any);
          }
        }

      } catch (err) {
        console.error('Failed to load events from API', err);
      }
    };
    loadEvents();
  }, []);

  const [activeTab, setActiveTab] = useState<'planned' | 'past'>('planned');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [regStep, setRegStep] = useState<'select' | 'pilot' | null>(null);

  useEffect(() => {
    if (openMode !== 'force-list') return;
    try {
      sessionStorage.removeItem(EVENTS_TARGET_EVENT_KEY);
    } catch {
      // ignore storage access errors
    }
    setSelectedEvent(null);
    setRegStep(null);
    setPlayingVideoId(null);
    setActiveTab('planned');
  }, [openMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedEvent]);

  useEffect(() => {
    if (!eventsData.length) return;
    if (openMode === 'force-list') return;

    try {
      const raw = (sessionStorage.getItem(EVENTS_TARGET_EVENT_KEY) || '').trim();
      if (!raw) return;
      sessionStorage.removeItem(EVENTS_TARGET_EVENT_KEY);

      let targetId: number | null = null;
      let targetTitle = '';
      let targetDate = '';

      try {
        const parsed = JSON.parse(raw) as { id?: number; title?: string; date?: string };
        targetId = typeof parsed.id === 'number' ? parsed.id : null;
        targetTitle = String(parsed.title || '').trim().toLocaleLowerCase('az');
        targetDate = String(parsed.date || '').trim();
      } catch {
        const asNumber = Number(raw);
        if (!Number.isNaN(asNumber)) targetId = asNumber;
      }

      const byId = targetId ? eventsData.find((event) => event.id === targetId) : null;
      const byTitleDate = !byId
        ? eventsData.find((event) => {
            const title = (event.title || '').trim().toLocaleLowerCase('az');
            return (!!targetTitle && title === targetTitle) || (!!targetDate && event.date === targetDate);
          })
        : null;
      const match = byId || byTitleDate;

      if (match) {
        setActiveTab(match.status === 'past' ? 'past' : 'planned');
        setSelectedEvent(match);
      }
    } catch {
      // ignore storage access errors
    }
  }, [eventsData, openMode]);

  useEffect(() => {
    if (!eventsData.length || selectedEvent) return;
    const hasPlanned = eventsData.some((event) => event.status === 'planned');
    const hasPast = eventsData.some((event) => event.status === 'past');
    if (!hasPlanned && hasPast && activeTab !== 'past') {
      setActiveTab('past');
    }
  }, [eventsData, selectedEvent, activeTab]);

  const VideoModal = () => {
    if (!playingVideoId) return null;

    return (
      <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
        <div className="relative w-full max-w-5xl aspect-video bg-black border border-white/10 shadow-[0_0_100px_rgba(255,77,0,0.2)]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlayingVideoId(null);
            }}
            className="absolute -top-12 right-0 md:-right-12 text-white/50 hover:text-[#FF4D00] transition-colors"
          >
            <X size={40} strokeWidth={1.5} />
          </button>
          <CsPlayer videoId={playingVideoId} autoplay />
        </div>
      </div>
    );
  };

  const handleJoinSpectator = () => {
    const spectatorUrl = getText('SPECTATOR_TICKET_URL', 'https://iticket.az');
    window.open(spectatorUrl, '_blank');
  };

  const openRegistrationModal = () => {
    if (!selectedEvent) return;
    if (selectedEvent.status !== 'planned') return;
    if (selectedEvent.registrationEnabled === false) {
      toast.error(registrationClosedToast);
      return;
    }
    setRegStep('select');
  };

  const renderRegistrationModal = () => {
    if (!regStep) return null;

    const clubs = [
      getText('CLUB_OPTION_1', 'Fərdi İştirakçı'),
      getText('CLUB_OPTION_2', 'Club 4X4'),
      getText('CLUB_OPTION_3', 'Extreme 4X4'),
      getText('CLUB_OPTION_4', 'Forsaj Club'),
      getText('CLUB_OPTION_5', 'Offroad.az'),
      getText('CLUB_OPTION_6', 'Overland 4X4'),
      getText('CLUB_OPTION_7', 'PatrolClub.az'),
      getText('CLUB_OPTION_8', 'Victory Club'),
      getText('CLUB_OPTION_9', 'Zəfər 4X4 Club')
    ];

    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/5 p-8 md:p-16 min-h-[600px] flex flex-col justify-center shadow-[0_0_100px_rgba(255,77,0,0.1)]">
          <button
            onClick={() => {
              setRegStep(null);
            }}
            className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>

          {regStep === 'select' ? (
            <div className="text-center animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-5xl md:text-8xl font-black italic text-white uppercase tracking-tighter mb-2 leading-none">{getText('MODAL_TITLE', 'YARIŞDA İŞTİRAK')}</h2>
              <p className="text-[#FF4D00] font-black italic text-xs uppercase tracking-[0.3em] mb-16">
                {selectedEvent?.title} // {selectedEvent?.location}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div
                  onClick={() => {
                    setRegStep('pilot');
                  }}
                  className="group cursor-pointer bg-black border border-white/5 hover:border-[#FF4D00] transition-all p-12 flex flex-col items-center justify-center min-h-[300px] shadow-2xl"
                >
                  <div className="bg-[#FF4D00] p-6 mb-8 transform -skew-x-12 group-hover:scale-110 group-hover:bg-white transition-all shadow-[0_0_20px_rgba(255,77,0,0.3)]">
                    <Car size={40} className="text-black transform skew-x-12" />
                  </div>
                  <h3 className="text-3xl font-black italic text-white uppercase mb-2 tracking-tighter">{getText('JOIN_AS_PILOT', 'PİLOT KİMİ QATIL')}</h3>
                  <p className="text-gray-500 font-bold italic text-[10px] uppercase tracking-widest">{getText('JOIN_PILOT_DESC', 'TEXNİKİ REQLAMENTƏ UYĞUN OLARAQ')}</p>
                </div>

                <div
                  onClick={handleJoinSpectator}
                  className="group cursor-pointer bg-black border border-white/5 hover:border-white transition-all p-12 flex flex-col items-center justify-center min-h-[300px] shadow-2xl"
                >
                  <div className="bg-white/10 p-6 mb-8 transform -skew-x-12 group-hover:scale-110 group-hover:bg-white transition-all">
                    <UsersIcon size={40} className="text-white transform skew-x-12 group-hover:text-black" />
                  </div>
                  <h3 className="text-3xl font-black italic text-white uppercase mb-2 tracking-tighter">{getText('JOIN_AS_SPECTATOR', 'İZLƏYİCİ KİMİ QATIL')}</h3>
                  <p className="text-gray-500 font-bold italic text-[10px] uppercase tracking-widest">{getText('JOIN_SPECTATOR_DESC', 'YARIŞI TRİBUNADAN İZLƏ')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right duration-400">
              <button
                onClick={() => setRegStep('select')}
                className="flex items-center gap-2 text-[#FF4D00] font-black italic text-xs uppercase tracking-widest mb-12 hover:translate-x-[-4px] transition-transform"
              >
                <ArrowLeft size={16} /> {getText('BTN_BACK', 'GERİ QAYIT')}
              </button>

              <div className="mb-12">
                <h2 className="text-5xl md:text-7xl font-black italic text-white uppercase tracking-tighter mb-2 leading-none">{getText('PILOT_REG_TITLE', 'PİLOT QEYDİYYATI')}</h2>
                <div className="w-16 h-2 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
              </div>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const name = String(fd.get('name') || '').trim();
                const whatsapp = String(fd.get('whatsapp') || '').trim();
                const car = String(fd.get('car') || '').trim();
                const tire = String(fd.get('tire') || '').trim();
                const engine = String(fd.get('engine') || '').trim();
                const club = String(fd.get('club') || '').trim();
                const whatsappDigits = whatsapp.replace(/\D/g, '');

                if (!name || !whatsapp || !car || !tire || !engine || !club) {
                  toast.error(requiredFieldsToast);
                  return;
                }
                if (whatsappDigits.length < 10) {
                  toast.error(whatsappRequiredToast);
                  return;
                }

                const data = {
                  name,
                  contact: whatsapp,
                  type: 'Pilot Registration',
                  content: JSON.stringify({
                    eventId: selectedEvent?.id,
                    event: selectedEvent?.title,
                    locale: language,
                    whatsapp,
                    car,
                    tire,
                    engine,
                    club
                  })
                };

                try {
                  const res = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  if (res.ok) {
                    toast.success(submitSuccessToast);
                    setRegStep(null);
                  } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error || 'request_failed');
                  }
                } catch {
                  toast.error(submitErrorToast);
                }
              }}>
                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_NAME', 'AD VƏ SOYAD')}</label>
                  <input name="name" required type="text" className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none uppercase placeholder:text-gray-800" placeholder={getText('PLACEHOLDER_NAME', 'Tam ad daxil edin')} />
                </div>
                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_WHATSAPP', getText('FIELD_PHONE', 'WHATSAPP NÖMRƏSİ'))}</label>
                  <input name="whatsapp" required type="tel" className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none placeholder:text-gray-800" placeholder={getText('PLACEHOLDER_WHATSAPP', getText('PLACEHOLDER_PHONE', '+994 50 123 45 67'))} />
                </div>
                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_CAR_MODEL', 'AVTOMOBİLİN MARKA/MODELİ')}</label>
                  <input name="car" required type="text" className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none uppercase placeholder:text-gray-800" placeholder={getText('PLACEHOLDER_CAR', 'Məs: Toyota LC 105')} />
                </div>
                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_TIRE_SIZE', 'TƏKƏR ÖLÇÜSÜ')}</label>
                  <input name="tire" required type="text" className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none uppercase placeholder:text-gray-800" placeholder={getText('PLACEHOLDER_TIRE', 'Məs: 35 DÜYM')} />
                </div>

                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_ENGINE', 'MÜHƏRRİK HƏCMİ')}</label>
                  <input name="engine" required type="text" className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none uppercase placeholder:text-gray-800" placeholder={getText('PLACEHOLDER_ENGINE', 'Məs: 4.4L')} />
                </div>

                <div className="space-y-4">
                  <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">{getText('FIELD_CLUB', 'TƏMSİL ETDİYİ KLUB')}</label>
                  <div className="relative">
                    <select
                      name="club"
                      required
                      defaultValue={clubs[0] || ''}
                      className="w-full bg-black border border-white/5 text-white p-5 font-black italic text-sm focus:ring-1 focus:ring-[#FF4D00] outline-none uppercase appearance-none cursor-pointer"
                    >
                      {clubs.map((club) => (
                        <option key={club} value={club}>{club.toUpperCase()}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-[#FF4D00] pointer-events-none" size={20} />
                  </div>
                </div>

                <div className="md:col-span-2 pt-8">
                  <button className="w-full bg-[#FF4D00] text-black py-6 font-black italic text-xl uppercase tracking-tighter transform -skew-x-12 hover:bg-white transition-all shadow-xl">
                    <span className="transform skew-x-12 block">{getText('BTN_COMPLETE_REG', 'QEYDİYYATI TAMAMLA')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedEvent) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen pb-20 text-white animate-in fade-in duration-500">
        {renderRegistrationModal()}
        <div className="px-6 lg:px-20 py-8">
          <button
            onClick={() => setSelectedEvent(null)}
            className="bg-[#FF4D00] text-black px-8 py-3 font-black italic text-xs uppercase tracking-widest transform -skew-x-12 flex items-center gap-2 hover:bg-white transition-all"
          >
            <span className="transform skew-x-12 flex items-center gap-2 tracking-widest">
              <ArrowLeft size={16} /> {getText('BTN_BACK', 'GERİ QAYIT')}
            </span>
          </button>
        </div>

        <div className="px-6 lg:px-20 mb-16">
          <div className="relative h-[400px] md:h-[600px] overflow-hidden rounded-sm group border border-white/5 shadow-2xl">
            <img
              src={selectedEvent.img}
              className="w-full h-full object-cover grayscale brightness-[0.2] transition-transform duration-1000 group-hover:scale-105"
              alt={selectedEvent.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>

            <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <span className="bg-[#FF4D00] text-black px-4 py-1.5 font-black italic text-[10px] uppercase mb-6 inline-block transform -skew-x-12 shadow-lg">
                  <span className="transform skew-x-12 block tracking-widest uppercase font-black">{selectedEvent.status === 'planned' ? getText('STATUS_UPCOMING', 'GƏLƏCƏK YARIŞ') : getText('STATUS_PAST', 'BAŞA ÇATIB')}</span>
                </span>
                <h1 className="text-5xl md:text-[100px] font-black italic text-white uppercase tracking-tighter leading-[0.8] mb-6">
                  {selectedEvent.title}
                </h1>
                <div className="flex flex-wrap gap-8 text-gray-500 font-black italic text-xs uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Calendar size={14} className="text-[#FF4D00]" /> {selectedEvent.date}</span>
                  <span className="flex items-center gap-2"><MapPin size={14} className="text-[#FF4D00]" /> {selectedEvent.location}</span>
                </div>
              </div>

              {selectedEvent.status === 'planned' && selectedEvent.registrationEnabled === false && (
                <button
                  type="button"
                  disabled
                  className="bg-white/10 border border-white/20 text-white px-12 py-6 font-black italic text-lg uppercase tracking-widest transform -skew-x-12 cursor-not-allowed opacity-95"
                >
                  <span className="transform skew-x-12 block">{getText('BTN_JOIN_EVENT_UNAVAILABLE', 'MÖVCUD DEYİL')}</span>
                </button>
              )}
              {selectedEvent.status === 'planned' && selectedEvent.registrationEnabled !== false && (
                <button
                  onClick={openRegistrationModal}
                  className="bg-[#FF4D00] text-black px-12 py-6 font-black italic text-lg uppercase transform -skew-x-12 hover:bg-white transition-all flex items-center gap-3 shadow-[0_10px_40px_rgba(255,77,0,0.3)]"
                >
                  <span className="transform skew-x-12 flex items-center gap-3">{getText('BTN_JOIN_EVENT', 'TƏDBİRƏ QOŞUL')} <ArrowRight size={24} /></span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
            <div className="lg:w-8/12 space-y-20">
              {/* DESCRIPTION */}
              <div>
                <h3 className="text-white text-3xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-4">
                  <span className="w-2 h-10 bg-[#FF4D00] shadow-[0_0_10px_rgba(255,77,0,0.4)]"></span> {getText('SECTION_DESC', 'TƏSVİR')}
                </h3>
                <div
                  className="text-gray-400 font-bold italic text-xl md:text-2xl leading-relaxed tracking-wide space-y-4 quill-content break-words overflow-hidden [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:whitespace-normal [&_*]:break-words"
                  dangerouslySetInnerHTML={{ __html: bbcodeToHtml(selectedEvent.description || getText('DESC_PLACEHOLDER', 'Bu tədbir haqqında ətraflı məlumat tezliklə paylaşılacaq.')) }}
                />
              </div>

              {/* DOWNLOAD INSTRUCTIONS */}
              <div className="bg-[#111] border border-white/5 p-10 md:p-16 relative overflow-hidden group/dl shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <FileText size={120} className="text-white transform rotate-12" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="text-center md:text-left">
                    <h3 className="text-white text-4xl font-black italic uppercase tracking-tighter mb-4 leading-none">{getText('DOWNLOAD_TITLE', 'TƏLİMATI YÜKLƏ')}</h3>
                    <p className="text-gray-500 font-bold italic text-sm uppercase tracking-widest max-w-sm">{getText('DOWNLOAD_DESC', 'YARIŞA HAZIRLIQ VƏ TEXNİKİ REQLAMENT HAQQINDA BÜTÜN MƏLUMATLAR BU SƏNƏDDƏ QEYD OLUNUB.')}</p>
                  </div>
                  <button
                    onClick={() => {
                      const pdfLink = selectedEvent.pdfUrl || selectedEvent.pdf_url || selectedEvent.pdfURL || '';
                      if (pdfLink) window.open(pdfLink, '_blank');
                    }}
                    className="bg-[#FF4D00] text-black px-12 py-6 font-black italic text-xl uppercase transform -skew-x-12 hover:bg-white transition-all flex items-center gap-4 shadow-[0_15px_40px_rgba(255,77,0,0.3)] group-hover/dl:scale-105 active:scale-95"
                  >
                    <span className="transform skew-x-12 flex items-center gap-3 whitespace-nowrap">{getText('BTN_DOWNLOAD_PDF', 'PDF YÜKLƏ')} <Download size={24} className="animate-bounce" /></span>
                  </button>
                </div>
              </div>

              {/* RULES */}
              <div>
                <h3 className="text-white text-3xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-4">
                  <span className="w-2 h-10 bg-white/20"></span> {getText('SECTION_RULES', 'QAYDALAR VƏ TƏLƏBLƏR')}
                </h3>
                <div className="bg-[#111] p-12 border-l-4 border-[#FF4D00] shadow-2xl">
                  <div
                    className="text-gray-300 font-bold italic text-lg md:text-xl tracking-widest leading-loose quill-content break-words overflow-hidden [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:whitespace-normal [&_*]:break-words"
                    dangerouslySetInnerHTML={{ __html: bbcodeToHtml(selectedEvent.rules || getText('RULES_PLACEHOLDER', 'Yarış qaydaları iştirakçılara brifinq zamanı elan ediləcək.')) }}
                  />
                </div>
              </div>
            </div>

            <div className="lg:w-4/12">
              <div className="bg-[#111] p-12 border border-white/5 sticky top-32 shadow-2xl rounded-sm">
                <h4 className="text-white text-4xl font-black italic uppercase tracking-tighter mb-6 leading-none">{getText('SIDEBAR_QUESTION_TITLE', 'SUALINIZ VAR?')}</h4>
                <p
                  className="text-gray-500 font-bold italic text-xs uppercase mb-10 leading-relaxed tracking-widest"
                  dangerouslySetInnerHTML={{ __html: bbcodeToHtml(getText('SIDEBAR_QUESTION_DESC', 'YARIŞLA BAĞLI ƏLAVƏ SUALLARINIZ ÜÇÜN BİZİMLƏ ƏLAQƏ SAXLAYIN.')) }}
                />
                <button
                  onClick={() => onViewChange('contact')}
                  className="w-full border-2 border-white/10 text-white py-5 font-black italic text-xs uppercase hover:bg-[#FF4D00] hover:text-black hover:border-[#FF4D00] transition-all transform -skew-x-12 tracking-widest"
                >
                  <span className="transform skew-x-12 block uppercase">{getText('BTN_CONTACT', 'ƏLAQƏ')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const plannedEvents = eventsData.filter(e => e.status === 'planned');
  const pastEvents = eventsData.filter(e => e.status === 'past');
  const pastEventVideos = pastEvents
    .map((event) => {
      const videoId = extractYoutubeId(event.youtubeUrl || '');
      if (!videoId) return null;
      return {
        ...event,
        videoId,
        thumbnail: event.img || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
    })
    .filter(Boolean) as Array<EventItem & { videoId: string; thumbnail: string }>;
  const featuredEvent = plannedEvents[0];

  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white">
      <VideoModal />
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'TƏDBİRLƏR')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'OFFICIAL EVENT CALENDAR // FORSAJ CLUB')}
            </p>
          </div>
        </div>

        <div className="bg-white/5 p-1 rounded-sm flex items-center border border-white/10">
          <button
            onClick={() => setActiveTab('planned')}
            className={`px-8 py-3 font-black italic text-xs uppercase tracking-widest transition-all ${activeTab === 'planned' ? 'bg-[#FF4D00] text-black transform -skew-x-12' : 'text-gray-500'}`}
          >
            <span className={activeTab === 'planned' ? 'transform skew-x-12 block' : ''}>{getText('TAB_PLANNED', 'PLANLANAN TƏDBİRLƏR')}</span>
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-8 py-3 font-black italic text-xs uppercase tracking-widest transition-all ${activeTab === 'past' ? 'bg-[#FF4D00] text-black transform -skew-x-12' : 'text-gray-500'}`}
          >
            <span className={activeTab === 'past' ? 'transform skew-x-12 block' : ''}>{getText('TAB_PAST', 'KEÇMİŞ TƏDBİRLƏR')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'planned' && featuredEvent && (
        <div
          onClick={() => setSelectedEvent(featuredEvent)}
          className="group relative bg-[#111] h-[400px] md:h-[600px] overflow-hidden cursor-pointer mb-20 border border-white/5 rounded-sm shadow-[0_40px_80px_rgba(0,0,0,0.5)]"
        >
          <img
            src={featuredEvent.img}
            className="w-full h-full object-cover grayscale opacity-40 transition-transform duration-1000 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-75"
            alt={featuredEvent.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/20 to-transparent"></div>
          <div className="absolute bottom-16 left-16 right-16">
            <div className="bg-[#FF4D00] text-black px-5 py-2 font-black italic text-[10px] inline-block mb-8 transform -skew-x-12 shadow-lg">
              <span className="transform skew-x-12 block tracking-widest uppercase font-black">{getText('LABEL_FEATURED', 'OFFROAD FEATURED')}</span>
            </div>
            <h3 className="text-6xl md:text-[140px] font-black italic text-white leading-[0.75] uppercase tracking-tighter mb-10">
              {featuredEvent.title}
            </h3>
            <button className="flex items-center gap-4 text-white font-black italic text-2xl hover:translate-x-6 transition-transform uppercase tracking-tighter">
              {getText('BTN_MORE_INFO', 'DAHA ƏTRAFLI')} <ArrowRight size={36} className="text-[#FF4D00]" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'planned' ? (
        plannedEvents.filter(e => e.id !== featuredEvent?.id).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plannedEvents.filter(e => e.id !== featuredEvent?.id).map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group cursor-pointer relative aspect-[4/5] bg-[#111] border border-white/5 overflow-hidden rounded-sm hover:border-[#FF4D00]/40 transition-all shadow-xl"
              >
                <img
                  src={event.img}
                  className="w-full h-full object-cover grayscale opacity-50 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110"
                  alt={event.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                <div className="absolute bottom-8 left-8 right-8">
                  <div className="text-[#FF4D00] font-black italic text-[10px] mb-2 uppercase tracking-widest">{event.date}</div>
                  <h4 className="text-3xl font-black italic text-white uppercase leading-none tracking-tighter group-hover:text-[#FF4D00] transition-colors">
                    {event.title}
                  </h4>
                  <div className="mt-6 bg-white/5 border border-white/10 text-white px-5 py-2 font-black italic text-[8px] inline-block transform -skew-x-12 group-hover:bg-[#FF4D00] group-hover:text-black transition-all">
                    <span className="transform skew-x-12 block uppercase tracking-[0.2em]">{getText('BTN_VIEW_DETAILS', 'ƏTRAFLI BAX')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border border-white/5 bg-[#111] rounded-sm shadow-2xl">
            <p className="text-gray-400 font-black italic uppercase tracking-widest text-sm">
              {getText('NO_PLANNED_EVENTS', 'PLANLANAN TƏDBİR YOXDUR')}
            </p>
            <p className="text-gray-600 font-bold italic uppercase tracking-[0.2em] text-[10px] mt-3">
              {getText('NO_PLANNED_EVENTS_HINT', 'YENİ TƏDBİRLƏR ƏLAVƏ OLUNDUQDA BURADA GÖRÜNƏCƏK')}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pastEventVideos.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500 font-black italic uppercase tracking-widest">
                {getText('NO_PAST_EVENT_VIDEOS', 'KEÇMİŞ TƏDBİR VİDEOSU TAPILMADI')}
              </div>
            ) : (
              pastEventVideos.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setPlayingVideoId(event.videoId)}
                  className="group relative cursor-pointer aspect-[4/5] bg-[#111] border border-white/5 overflow-hidden rounded-sm hover:border-[#FF4D00]/40 transition-all shadow-xl"
                >
                  <img
                    src={event.thumbnail}
                    className="w-full h-full object-cover grayscale opacity-40 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105"
                    alt={event.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/45 backdrop-blur-sm p-3 rounded-full border border-white/20 group-hover:bg-[#FF4D00] group-hover:text-black transition-all">
                      <PlayCircle size={44} strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="absolute top-5 left-5 bg-white text-black px-4 py-1.5 font-black italic text-[9px] transform -skew-x-12 shadow-lg">
                    <span className="transform skew-x-12 block uppercase tracking-[0.2em]">
                      {getText('STATUS_PAST', 'BAŞA ÇATIB')}
                    </span>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="text-gray-400 font-black italic text-[10px] mb-2 uppercase tracking-widest">{event.date}</div>
                    <h4 className="text-3xl font-black italic text-white uppercase leading-none tracking-tighter group-hover:text-[#FF4D00] transition-colors">
                      {event.title}
                    </h4>
                    <div className="mt-6 bg-white/5 border border-white/10 text-white px-5 py-2 font-black italic text-[8px] inline-block transform -skew-x-12 group-hover:bg-[#FF4D00] group-hover:text-black transition-all">
                      <span className="transform skew-x-12 block uppercase tracking-[0.2em]">
                        {getText('BTN_WATCH_VIDEO', 'VİDEONU OYNAT')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
