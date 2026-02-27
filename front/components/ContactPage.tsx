import React, { useState } from 'react';
import { MapPin, Phone, Mail, Instagram, Youtube, Facebook, Send, Info, ChevronDown, Clock, Map as MapIcon } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import toast from 'react-hot-toast';
import { resolveSocialLinks } from '../utils/socialLinks';

const ContactPage: React.FC = () => {
  const { getText } = useSiteContent('contactpage');
  const { getText: getGeneralText } = useSiteContent('general');
  const onlineLabel = getText('ONLINE_STATUS_LABEL', 'ONLINE');
  const formStatusLabel = getText('FORM_STATUS_LABEL', 'STATUS: ONLINE');
  const requiredFieldsToast = getText('FORM_TOAST_REQUIRED', 'Zəhmət olmasa bütün sahələri doldurun.');
  const submitSuccessToast = getText('FORM_TOAST_SUCCESS', 'Müraciətiniz uğurla göndərildi!');
  const submitErrorToast = getText('FORM_TOAST_ERROR', 'Gondərilmə zamanı xəta baş verdi.');
  const formMethodRaw = (getText('FORM_METHOD', 'POST') || 'POST').toUpperCase();
  const formMethod = ['POST', 'PUT', 'PATCH'].includes(formMethodRaw) ? formMethodRaw : 'POST';
  const formContentType = getText('FORM_CONTENT_TYPE', 'application/json') || 'application/json';
  const [selectedType, setSelectedType] = useState(getText('TOPIC_GENERAL', 'ÜMUMİ SORĞU'));

  const { getPage: getSocialsPage } = useSiteContent('socials');
  const socialsPage = getSocialsPage('socials');

  const socialIconMap = {
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook
  };

  const socialLinks = resolveSocialLinks(socialsPage?.sections, getGeneralText).map(({ platform, url }) => ({
    Icon: socialIconMap[platform],
    url
  }));


  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white">
      {/* Standardized Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'ƏLAQƏ')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'GET IN TOUCH // CONTACT CENTER')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Main Office Info */}
          <div className="lg:w-[40%] bg-[#111] border border-white/5 p-10 flex flex-col justify-between relative shadow-2xl rounded-sm">
            <div className="absolute top-8 right-10 opacity-5">
              <MapIcon size={80} className="transform rotate-12 text-white" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-[#FF4D00] p-3 rounded-sm shadow-[0_0_15px_rgba(255,77,0,0.3)]">
                  <MapPin size={24} className="text-black" />
                </div>
                <h4 className="text-lg font-black italic uppercase tracking-widest">{getText('OFFICE_LABEL', 'BAŞ OFİS')}</h4>
              </div>

              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 leading-none text-white">
                {getText('ADDRESS_LINE_1', getGeneralText('CONTACT_ADDRESS_1') || 'AZADLIQ 102, BAKI')}
              </h3>
              <p className="text-[#FF4D00] font-black italic text-[10px] uppercase tracking-[0.3em] pb-8 border-b border-white/5">
                {getText('ADDRESS_LINE_2', getGeneralText('CONTACT_ADDRESS_2') || 'AZƏRBAYCAN // SECTOR_01')}
              </p>

              <div className="mt-8 flex justify-between items-center text-[10px] font-black italic uppercase tracking-widest">
                <span className="flex items-center gap-3 text-gray-500"><Clock size={14} className="text-[#FF4D00]" /> {getText('WORK_HOURS', getGeneralText('CONTACT_HOURS') || '09:00 - 18:00')}</span>
                <span className="text-[#25D366] flex items-center gap-2 font-black"><span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse"></span> {onlineLabel}</span>
              </div>
            </div>

            <div className="mt-16 space-y-6">
              <div className="flex items-center gap-5 group">
                <div className="bg-white/5 p-4 text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-black transition-all shadow-xl">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-gray-600 font-black italic text-[8px] uppercase tracking-[0.4em] mb-1">{getText('PHONE_LABEL', 'ƏLAQƏ NÖMRƏSİ')}</p>
                  <p className="text-2xl font-black italic uppercase tracking-tighter text-white">{getText('PHONE_NUMBER', getGeneralText('CONTACT_PHONE') || '+994 50 123 45 67')}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 group">
                <div className="bg-white/5 p-4 text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-black transition-all shadow-xl">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-gray-600 font-black italic text-[8px] uppercase tracking-[0.4em] mb-1">{getText('EMAIL_LABEL', 'E-POÇT ÜNVANI')}</p>
                  <p className="text-xl font-black italic uppercase tracking-tighter text-white">{getText('EMAIL_Address', getGeneralText('CONTACT_EMAIL') || 'PROTOCOL@FORSAJ.AZ')}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-6">
                {socialLinks.map(({ Icon, url }, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white/5 py-4 flex justify-center text-gray-500 hover:text-black hover:bg-[#FF4D00] transition-all shadow-lg border border-white/5"
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Department Cards */}
          <div className="lg:w-[60%] flex flex-col gap-6">
            <DepartmentCard
              title={getText('DEPT_HQ_TITLE', 'BAŞ OFİS')}
              desc={getText('DEPT_HQ_DESC', 'ÜMUMİ SORĞULAR VƏ İDARƏETMƏ')}
              email={getText('DEPT_HQ_EMAIL', getGeneralText('DEPT_HQ_EMAIL') || 'HQ@FORSAJ.AZ')}
              icon={<Send size={24} />}
            />
            <DepartmentCard
              title={getText('DEPT_PR_TITLE', 'MEDİA VƏ PR')}
              desc={getText('DEPT_PR_DESC', 'MƏTBUAT VƏ ƏMƏKDAŞLIQ')}
              email={getText('DEPT_PR_EMAIL', getGeneralText('DEPT_PR_EMAIL') || 'PR@FORSAJ.AZ')}
              icon={<Youtube size={24} />}
            />
            <DepartmentCard
              title={getText('DEPT_TECH_TITLE', 'TEXNİKİ DƏSTƏK')}
              desc={getText('DEPT_TECH_DESC', 'PİLOTLAR ÜÇÜN TEXNİKİ YARDIM')}
              email={getText('DEPT_TECH_EMAIL', getGeneralText('DEPT_TECH_EMAIL') || 'TECH@FORSAJ.AZ')}
              icon={<Info size={24} />}
            />
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-[#050505] text-white p-10 md:p-20 relative overflow-hidden shadow-2xl border border-white/5 mb-12">
          <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
            <h3 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">{getText('FORM_TITLE', 'MÜRACİƏT FORMU')}</h3>
            <span className="bg-[#FF4D00] px-4 py-1.5 text-black font-black italic text-[10px] uppercase tracking-widest shadow-lg">{formStatusLabel}</span>
          </div>

          <form className="space-y-10" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const fd = new FormData(form);
            const message = String(fd.get('content') || '').trim();
            const data = {
              name: String(fd.get('name') || '').trim(),
              contact: String(fd.get('contact') || '').trim(),
              type: String(fd.get('type') || '').trim(),
              content: JSON.stringify({
                message
              })
            };

            if (!data.name || !data.contact || !data.type || !message) {
              toast.error(requiredFieldsToast);
              return;
            }
            try {
              const res = await fetch('/api/applications', {
                method: formMethod,
                headers: { 'Content-Type': formContentType },
                body: JSON.stringify(data)
              });
              if (res.ok) {
                toast.success(submitSuccessToast);
                form.reset();
              } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || 'request_failed');
              }
            } catch {
              toast.error(submitErrorToast);
            }
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-[0.3em]">{getText('FIELD_NAME_LABEL', 'AD VƏ SOYAD')}</label>
                <input name="name" required type="text" placeholder={getText('FIELD_NAME_PLACEHOLDER', 'AD SOYAD DAXİL EDİN')} className="w-full bg-[#111] border border-white/5 text-white p-5 font-black italic text-xs uppercase outline-none focus:border-[#FF4D00] transition-colors placeholder:text-gray-800" />
              </div>
              <div className="space-y-3">
                <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-[0.3em]">{getText('FIELD_CONTACT_LABEL', 'ƏLAQƏ VASİTƏSİ')}</label>
                <input name="contact" required type="text" placeholder={getText('FIELD_CONTACT_PLACEHOLDER', 'TELEFON VƏ YA EMAIL')} className="w-full bg-[#111] border border-white/5 text-white p-5 font-black italic text-xs uppercase outline-none focus:border-[#FF4D00] transition-colors placeholder:text-gray-800" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-[0.3em]">{getText('FIELD_TOPIC_LABEL', 'MÜRACİƏT İSTİQAMƏTİ')}</label>
              <div className="relative">
                <select
                  name="type"
                  required
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 text-white p-5 font-black italic text-xs uppercase appearance-none outline-none focus:border-[#FF4D00] transition-colors"
                >
                  <option>{getText('TOPIC_GENERAL', 'ÜMUMİ SORĞU')}</option>
                  <option>{getText('TOPIC_PILOT', 'PİLOT QEYDİYYATI')}</option>
                  <option>{getText('TOPIC_TECH', 'TEXNİKİ YARDIM')}</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#FF4D00] pointer-events-none" size={20} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-gray-600 font-black italic text-[10px] uppercase tracking-[0.3em]">{getText('FIELD_MESSAGE_LABEL', 'MESAJINIZ')}</label>
              <textarea name="content" required placeholder={getText('FIELD_MESSAGE_PLACEHOLDER', 'BURADA YAZIN...')} rows={5} className="w-full bg-[#111] border border-white/5 text-white p-5 font-black italic text-xs uppercase outline-none focus:border-[#FF4D00] transition-colors resize-none placeholder:text-gray-800" />
            </div>

            <button className="w-full bg-[#FF4D00] text-black py-6 font-black italic text-3xl uppercase tracking-tighter flex items-center justify-center gap-4 hover:bg-white transition-all transform shadow-[0_15px_40px_rgba(255,77,0,0.2)]">
              {getText('BTN_SEND', 'MESAJI GÖNDƏR')} <Send size={28} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const DepartmentCard = ({ title, desc, email, icon }: { title: string, desc: string, email: string, icon: React.ReactNode }) => (
  <div className="bg-[#111] border border-white/5 p-8 flex flex-col md:flex-row items-center gap-8 group transition-all duration-500 shadow-2xl flex-grow hover:border-[#FF4D00]/40 rounded-sm">
    <div className="w-16 h-16 flex items-center justify-center bg-white/5 text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-black transition-all shadow-inner shrink-0">
      {icon}
    </div>
    <div className="flex-grow text-center md:text-left">
      <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-1 text-white group-hover:text-[#FF4D00] transition-colors">{title}</h4>
      <p className="text-gray-600 font-black italic text-[9px] uppercase tracking-[0.3em] leading-none mb-4 group-hover:text-gray-400">{desc}</p>
      <div className="h-px bg-white/5 w-full mb-4"></div>
      <p className="text-[#FF4D00] font-black italic text-sm uppercase tracking-tighter group-hover:text-white">{email}</p>
    </div>
  </div>
);

export default ContactPage;
