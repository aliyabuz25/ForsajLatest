import React from 'react';
import { ShieldCheck, Truck, Globe, Zap } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

const Partners: React.FC = () => {
  const { getPage, getText } = useSiteContent('partners');
  const partnersPage = getPage('partners');

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('shield')) return <ShieldCheck className="w-10 h-10" />;
    if (l.includes('truck')) return <Truck className="w-10 h-10" />;
    if (l.includes('globe')) return <Globe className="w-10 h-10" />;
    if (l.includes('zap')) return <Zap className="w-10 h-10" />;
    return <ShieldCheck className="w-10 h-10" />; // Fallback
  };

  const toBool = (value: string) => ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());

  const partnerRowsMap = new Map<number, { name: string; tag: string; icon: string; useImage: string; imageId: string }>();
  (partnersPage?.sections || []).forEach((s) => {
    const m = s.id.match(/^PARTNER_(\d+)_(NAME|TAG|ICON|USE_IMAGE|IMAGE_ID)$/);
    if (!m) return;
    const idx = Number(m[1]);
    const key = m[2];
    const current = partnerRowsMap.get(idx) || {
      name: '',
      tag: 'OFFICIAL PARTNER',
      icon: 'ShieldCheck',
      useImage: 'false',
      imageId: `partner-image-${idx}`
    };
    if (key === 'NAME') current.name = s.value || '';
    if (key === 'TAG') current.tag = s.value || 'OFFICIAL PARTNER';
    if (key === 'ICON') current.icon = s.value || 'ShieldCheck';
    if (key === 'USE_IMAGE') current.useImage = s.value || 'false';
    if (key === 'IMAGE_ID') current.imageId = s.value || `partner-image-${idx}`;
    partnerRowsMap.set(idx, current);
  });

  const fallbackList = [
    { idx: 1, name: 'AZMF', tag: 'OFFICIAL PARTNER', icon: 'ShieldCheck', useImage: 'false', imageId: 'partner-image-1' },
    { idx: 2, name: 'OFFROAD AZ', tag: 'OFFICIAL PARTNER', icon: 'Truck', useImage: 'false', imageId: 'partner-image-2' },
    { idx: 3, name: 'GLOBAL 4X4', tag: 'OFFICIAL PARTNER', icon: 'Globe', useImage: 'false', imageId: 'partner-image-3' },
    { idx: 4, name: 'RACE TECH', tag: 'OFFICIAL PARTNER', icon: 'Zap', useImage: 'false', imageId: 'partner-image-4' },
  ];

  const partnerRows = partnerRowsMap.size > 0
    ? Array.from(partnerRowsMap.entries()).sort((a, b) => a[0] - b[0]).map(([idx, value]) => ({ idx, ...value }))
    : fallbackList;

  const partners = partnerRows.map((row, i) => {
    const image = (partnersPage?.images || []).find(img => img.id === row.imageId);
    return {
      id: `partner_${row.idx}`,
      name: row.name || `PARTNER ${row.idx}`,
      icon: getIcon(row.icon),
      useImage: toBool(row.useImage),
      imagePath: image?.path || '',
      imageAlt: image?.alt || row.name || `Partner ${row.idx}`,
      color: i % 2 === 0 ? 'text-[#FF4D00]' : 'text-white',
      bg: i % 2 === 0 ? 'group-hover:bg-[#FF4D00]/10' : 'group-hover:bg-white/10',
      glow: i % 2 === 0 ? 'group-hover:shadow-[#FF4D00]/20' : 'group-hover:shadow-white/10',
      tag: row.tag || 'OFFICIAL PARTNER'
    };
  });


  return (
    <section className="py-32 bg-[#050505] relative overflow-hidden border-t border-white/5">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.05]">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#FF4D00] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 relative z-10">
        <div className="flex flex-col items-center mb-20">
          <h4 className="text-[#FF4D00] font-black italic text-[11px] uppercase tracking-[0.5em] mb-4">
            {getText('SECTION_TITLE', 'RƏSMİ TƏRƏFDAŞLARIMIZ')}
          </h4>
          <div className="w-20 h-1 bg-white/10"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {partners.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col items-center justify-center p-10 bg-[#0A0A0A] border border-white/5 rounded-sm transition-all duration-500 hover:border-[#FF4D00]/30 hover:shadow-[0_20px_50px_rgba(255,77,0,0.1)] cursor-pointer"
            >
              {p.useImage && p.imagePath ? (
                <div className="mb-6 w-full max-w-[180px] h-24 p-2 rounded-sm border border-white/10 bg-white/5 transition-all duration-500 group-hover:bg-white/10 group-hover:scale-105">
                  <img src={p.imagePath} alt={p.imageAlt} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className={`mb-6 p-6 rounded-sm transition-all duration-500 text-gray-700 ${p.color} ${p.bg} ${p.glow} group-hover:scale-110 group-hover:rotate-3`}>
                  {p.icon}
                </div>
              )}

              {p.name?.trim() && (
                <div className="relative">
                  <span
                    translate="no"
                    className="notranslate text-2xl md:text-4xl font-black italic tracking-tighter uppercase text-gray-600 group-hover:text-white transition-colors duration-300"
                  >
                    {p.name}
                  </span>
                  <div className={`absolute -bottom-2 left-0 w-0 h-1.5 transition-all duration-300 group-hover:w-full bg-[#FF4D00] shadow-[0_0_10px_rgba(255,77,0,0.5)]`}></div>
                </div>
              )}

              <p className="mt-6 text-[9px] font-black italic text-[#FF4D00] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {(p as any).tag || getText(`${p.id}_label`, 'OFFICIAL PARTNER')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
