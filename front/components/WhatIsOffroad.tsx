import React from 'react';
import { Settings, ShieldCheck, Compass, Zap } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { bbcodeToHtml } from '../utils/bbcode';

const WhatIsOffroad: React.FC = () => {
  const { getPage, getText, isLoading } = useSiteContent('whatisoffroad');
  const page = getPage('whatisoffroad');

  if (isLoading) return <div className="h-[400px] bg-gray-100 animate-pulse"></div>;

  const getFeatIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('setting')) return <Settings className="text-[#D12027]" />;
    if (l.includes('shield')) return <ShieldCheck className="text-[#D12027]" />;
    if (l.includes('compass')) return <Compass className="text-[#D12027]" />;
    if (l.includes('zap')) return <Zap className="text-[#D12027]" />;
    return <Settings className="text-[#D12027]" />;
  };

  const dynamicFeatures: any[] = [];
  if (page?.sections) {
    const featSections = page.sections.filter(s => s.id.startsWith('feat-') || s.id.includes('TEXNİ'));
    // Group by two
    for (let i = 0; i < featSections.length; i += 2) {
      if (featSections[i] && featSections[i + 1]) {
        dynamicFeatures.push({
          icon: getFeatIcon(featSections[i].label || ''),
          title: featSections[i].value,
          desc: featSections[i + 1].value
        });
      }
    }
  }

  const defaultFeatures = [
    { icon: <Settings className="text-[#D12027]" />, title: getText('txt-texni-ki-t-chi-z-856', 'TEXNİKİ TƏCHİZAT'), desc: getText('txt-h-r-bir-ma-i-n-x-456', 'Hər bir maşın xüsusi asqı sistemi və gücləndirilmiş mühərriklə təmin olunur.') },
    { icon: <ShieldCheck className="text-[#D12027]" />, title: getText('txt-t-hl-k-si-zli-k-420', 'TƏHLÜKƏSİZLİK'), desc: getText('txt-pi-lotlar-n-t-hl-k-112', 'Pilotların təhlükəsizliyi bizim üçün prioritetdir. Karkas və kəmərlər məcburidir.') },
    { icon: <Compass className="text-[#D12027]" />, title: getText('txt-navi-qasi-ya-901', 'NAVİQASIYA'), desc: getText('txt-gps-v-x-ri-t-oxu-452', 'GPS və xəritə oxuma bacarığı offroad yarışlarında qalibiyyətin yarısıdır.') },
    { icon: <Zap className="text-[#D12027]" />, title: getText('txt-ekstremal-g-c-112', 'EKSTREMAL GÜC'), desc: getText('txt-s-r-c-n-n-fi-zi-ki-912', 'Sürücünün fiziki hazırlığı ən az avtomobilin gücü qədər əhəmiyyətlidir.') },
  ];

  const features = dynamicFeatures.length > 0 ? dynamicFeatures : defaultFeatures;


  return (
    <section className="py-24 px-6 lg:px-20 bg-gray-50 flex flex-col lg:flex-row gap-16 items-center">
      <div className="lg:w-1/2">
        <h4 className="text-[#D12027] font-black italic uppercase text-xs mb-4 tracking-widest">{getText('txt-offroad-n-dir-134', 'OFFROAD NƏDIR?')}</h4>
        <h2 className="text-5xl font-black italic leading-none mb-8 tracking-tighter uppercase">
          {getText('txt-adrenali-n-v-texni-ka-364', 'ADRENALİN VƏ TEXNİKANIN SİMBİOZU')}
        </h2>
        <p
          className="text-gray-500 font-bold italic text-sm mb-12 uppercase leading-relaxed max-w-xl"
          dangerouslySetInnerHTML={{ __html: bbcodeToHtml(getText('txt-offroad-yaln-z-yol-339', 'Offroad – yalnız yolsuzluq şəraitində hərəkət etmək deyil, həm də dözümlülük, strateji düşüncə və mühəndislik bacarığının sınağıdır. Azərbaycanın čətin dağlıq relyefi bu idman növü üçün dünyada ən maraqlı məkanlardan biri hesab olunur.')) }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4">
              <div className="bg-white p-3 shadow-lg rounded-sm transform -skew-x-12 shrink-0">
                {f.icon}
              </div>
              <div>
                <h5 className="font-black italic text-sm mb-1 tracking-tight">{f.title}</h5>
                <p className="text-[10px] text-gray-400 font-bold italic uppercase leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-1/2 relative">
        <div className="aspect-video bg-gray-200 shadow-2xl overflow-hidden rounded-sm transform skew-y-3">
          <img
            src="https://picsum.photos/id/107/800/600"
            alt="Offroad Culture"
            className="w-full h-full object-cover opacity-90 grayscale"
          />
        </div>
        <div className="absolute -bottom-8 -left-8 bg-[#D12027] p-8 text-white font-black italic transform -skew-x-12 hidden md:block">
          <span className="text-4xl leading-none">15+</span>
          <p className="text-[10px] uppercase">{getText('txt-yar-i-llik-96', 'YARIŞ İLLIK')}</p>
        </div>
      </div>
    </section>
  );
};

export default WhatIsOffroad;
