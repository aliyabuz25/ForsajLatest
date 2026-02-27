import React from 'react';
import { CalendarDays, ShieldCheck, Mail, Globe } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

const PrivacyPolicyPage: React.FC = () => {
  const { getText } = useSiteContent('privacypolicypage');

  const pageTitle = getText('PAGE_TITLE', 'MƏXFİLİK SİYASƏTİ (PRIVACY POLICY)');
  const pageSubtitle = getText('PAGE_SUBTITLE', 'MƏLUMATLARIN QORUNMASI VƏ İSTİFADƏ ŞƏRTLƏRİ');
  const introText = getText(
    'INTRO_TEXT',
    'Bu siyasət forsaj.az saytından istifadə zamanı toplanan məlumatların necə işlənməsini və qorunmasını izah edir.'
  );
  const updatedLabel = getText('UPDATED_LABEL', 'Son yenilənmə tarixi');
  const updatedDate = getText('UPDATED_DATE', '18 Fevral 2026');
  const contactTitle = getText('CONTACT_TITLE', 'Əlaqə');
  const contactEmail = getText('CONTACT_EMAIL', 'info@forsaj.az');
  const contactWebsite = getText('CONTACT_WEBSITE', 'https://forsaj.az');

  const sectionFallbacks = [
    {
      title: '1. Ümumi Məlumat',
      body: 'Bu Məxfilik Siyasəti forsaj.az (“Sayt”, “biz”, “bizim”) tərəfindən istifadəçilərdən toplanan məlumatların növlərini, istifadə qaydasını və qorunmasını izah edir. Saytdan istifadə etməklə bu siyasətin şərtlərini qəbul etmiş olursunuz.'
    },
    {
      title: '2. Toplanan Məlumatlar',
      body: 'Şəxsi məlumatlar:\n- Ad və soyad\n- Elektron poçt ünvanı\n- Telefon nömrəsi (təqdim edildiyi halda)\n\nTexniki məlumatlar:\n- IP ünvan\n- Brauzer növü və cihaz məlumatları\n- Saytda fəaliyyət məlumatları (baxışlar, kliklər və s.)'
    },
    {
      title: '3. Məlumatların İstifadə Məqsədi',
      body: 'Toplanan məlumatlar aşağıdakı məqsədlərlə istifadə olunur:\n- Xidmətlərin təqdim edilməsi və inkişaf etdirilməsi\n- İstifadəçi sorğularına cavab verilməsi\n- Təhlükəsizliyin təmin olunması\n- Statistik və analitik təhlillər aparılması'
    },
    {
      title: '4. Cookies (Kukilər)',
      body: 'Sayt istifadəçi təcrübəsini yaxşılaşdırmaq üçün kukilərdən istifadə edə bilər. İstifadəçi brauzer vasitəsilə kukiləri deaktiv edə bilər.'
    },
    {
      title: '5. Məlumatların Üçüncü Tərəflərlə Paylaşılması',
      body: 'Şəxsi məlumatlar yalnız aşağı hallarda üçüncü tərəflərlə paylaşıla bilər:\n- Qanunvericiliyin tələbi olduqda\n- Texniki və xidmət tərəfdaşları ilə əməkdaşlıq çərçivəsində\n- İstifadəçinin razılığı ilə'
    },
    {
      title: '6. Məlumat Təhlükəsizliyi',
      body: 'Biz şəxsi məlumatların qorunması üçün müvafiq texniki və inzibati təhlükəsizlik tədbirləri tətbiq edirik.'
    },
    {
      title: '7. İstifadəçi Hüquqları',
      body: 'İstifadəçilər:\n- Öz məlumatlarına çıxış tələb edə bilər\n- Düzəliş və ya silinmə tələb edə bilər\n- Məlumatların işlənməsinə etiraz edə bilər'
    },
    {
      title: '8. Siyasətdə Dəyişikliklər',
      body: 'Bu siyasət zaman-zaman yenilənə bilər. Yenilənmiş versiya saytda dərc edildiyi tarixdən qüvvəyə minir.'
    },
    {
      title: '9. Əlaqə',
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
            <ShieldCheck className="text-[#FF4D00] mt-1" size={20} />
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
            <article key={`privacy-section-${idx}`} className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-sm">
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

export default PrivacyPolicyPage;
