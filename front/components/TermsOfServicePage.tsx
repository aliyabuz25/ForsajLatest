import React from 'react';
import { CalendarDays, Scale, Mail, Globe } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

const TermsOfServicePage: React.FC = () => {
  const { getText } = useSiteContent('termsofservicepage');

  const pageTitle = getText('PAGE_TITLE', 'XİDMƏT ŞƏRTLƏRİ (TERMS OF SERVICE)');
  const pageSubtitle = getText('PAGE_SUBTITLE', 'İSTİFADƏ QAYDALARI VƏ HÜQUQİ ŞƏRTLƏR');
  const introText = getText(
    'INTRO_TEXT',
    'forsaj.az platformasından istifadə qaydalarını və hüquqi çərçivəni müəyyən edən əsas şərtlər.'
  );
  const updatedLabel = getText('UPDATED_LABEL', 'Son yenilənmə tarixi');
  const updatedDate = getText('UPDATED_DATE', '18 Fevral 2026');
  const contactTitle = getText('CONTACT_TITLE', 'Əlaqə');
  const contactEmail = getText('CONTACT_EMAIL', 'info@forsaj.az');
  const contactWebsite = getText('CONTACT_WEBSITE', 'https://forsaj.az');

  const sectionFallbacks = [
    {
      title: '1. Qəbul',
      body: 'forsaj.az saytından istifadə etməklə siz bu Xidmət Şərtlərini qəbul etmiş olursunuz.'
    },
    {
      title: '2. Xidmətin Təsviri',
      body: 'forsaj.az avtomobil, motorsport, off-road və Forsaj icması ilə bağlı məlumat, tədbir və digər rəqəmsal xidmətlər təqdim edir.'
    },
    {
      title: '3. İstifadə Qaydaları',
      body: 'İstifadəçi:\n- Saytdan yalnız qanuni məqsədlərlə istifadə etməlidir\n- Digər istifadəçilərin hüquqlarını pozmamalıdır\n- Saytın texniki sisteminə zərər verə biləcək hərəkətlər etməməlidir'
    },
    {
      title: '4. Əqli Mülkiyyət Hüquqları',
      body: 'Saytda yerləşdirilən bütün məzmun (mətnlər, şəkillər, videolar, loqo və s.) müəllif hüquqları ilə qorunur və icazəsiz istifadə edilə bilməz.'
    },
    {
      title: '5. Məsuliyyətin Məhdudlaşdırılması',
      body: 'Sayt və xidmətlər “olduğu kimi” təqdim olunur. Texniki nasazlıq və ya fasilələrə görə sayt rəhbərliyi məsuliyyət daşımır.'
    },
    {
      title: '6. Dəyişiklik Hüququ',
      body: 'Biz bu şərtləri istənilən vaxt dəyişdirmək hüququnu özümüzdə saxlayırıq. Yenilənmiş versiya saytda dərc edildiyi tarixdən qüvvəyə minir.'
    },
    {
      title: '7. Tətbiq Olunan Qanun',
      body: 'Bu Xidmət Şərtləri Azərbaycan Respublikasının qanunvericiliyinə uyğun tənzimlənir.'
    },
    {
      title: '8. Əlaqə',
      body: 'Email: info@forsaj.az\nVeb sayt: https://forsaj.az'
    }
  ];

  const sections = sectionFallbacks.map((section, index) => ({
    title: getText(`SECTION_${index + 1}_TITLE`, section.title),
    body: getText(`SECTION_${index + 1}_BODY`, section.body)
  }));

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

  const contentSections = sections.filter((section) => {
    const titleToken = normalizeToken(section.title);
    return !titleToken.includes('elaqe') && !titleToken.includes('contact');
  });

  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-4 mb-10">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">{pageTitle}</h2>
            <p className="text-[#FF4D00] font-black italic text-[10px] md:text-xs mt-2 uppercase tracking-[0.3em]">{pageSubtitle}</p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Scale className="text-[#FF4D00] mt-1" size={20} />
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">{introText}</p>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm whitespace-nowrap">
            <CalendarDays size={16} className="text-[#FF4D00]" />
            <span className="font-bold italic uppercase text-[11px] tracking-wider">
              {updatedLabel}: {updatedDate}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {contentSections.map((section, idx) => (
            <article key={`terms-section-${idx}`} className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-sm">
              <h3 className="text-xl md:text-2xl font-black italic text-[#FF4D00] mb-4 uppercase tracking-tight">{section.title}</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 bg-black/40 border border-white/10 p-6 md:p-8 rounded-sm">
          <h4 className="text-white font-black italic uppercase tracking-widest text-sm mb-4">{contactTitle}</h4>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-gray-300">
            <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-2 hover:text-[#FF4D00] transition-colors">
              <Mail size={16} className="text-[#FF4D00]" />
              {contactEmail}
            </a>
            <a href={contactWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#FF4D00] transition-colors">
              <Globe size={16} className="text-[#FF4D00]" />
              {contactWebsite}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
