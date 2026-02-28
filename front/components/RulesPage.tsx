import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Download, ShieldAlert, Settings, Info, Leaf } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { bbcodeToHtml } from '../utils/bbcode';

const RULES_TARGET_SECTION_KEY = 'forsaj_rules_target_section';
const RULES_TARGET_SECTION_EVENT = 'forsaj:rules-target-section';

interface RuleSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  rules: {
    subtitle: string;
    description: string;
  }[];
}

const RulesPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('pilot');
  const { getText, getUrl, getPage } = useSiteContent('rulespage');
  const rulesPage = getPage('rulespage');

  const normalizeTargetToken = useCallback((value: string) => (
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
      .replace(/[^a-z0-9]+/g, '')
  ), []);

  const inferSectionByToken = useCallback((token: string) => {
    if (token.includes('pilot')) return 'pilot';
    if (token.includes('technical') || token.includes('texniki') || token.includes('normativ')) return 'technical';
    if (token.includes('safety') || token.includes('tehlukesiz')) return 'safety';
    if (token.includes('eco') || token.includes('ekoloji')) return 'eco';
    return '';
  }, []);

  const ruleSections: RuleSection[] = useMemo(() => {
    const tabField = /^RULE_TAB_(\d+)_(ID|TITLE|ICON)$/;
    const itemField = /^RULE_TAB_(\d+)_ITEM_(\d+)_(TITLE|DESC)$/;

    const tabsMap = new Map<number, { id?: string; title?: string; icon?: string; items: Map<number, { subtitle?: string; description?: string }> }>();
    (rulesPage?.sections || []).forEach((section) => {
      const tabMatch = section.id.match(tabField);
      if (tabMatch) {
        const tabNo = Number(tabMatch[1]);
        const field = tabMatch[2];
        const current = tabsMap.get(tabNo) || { items: new Map<number, { subtitle?: string; description?: string }>() };
        if (field === 'ID') current.id = section.value || '';
        if (field === 'TITLE') current.title = section.value || '';
        if (field === 'ICON') current.icon = section.value || '';
        tabsMap.set(tabNo, current);
        return;
      }

      const itemMatch = section.id.match(itemField);
      if (itemMatch) {
        const tabNo = Number(itemMatch[1]);
        const itemNo = Number(itemMatch[2]);
        const field = itemMatch[3];
        const current = tabsMap.get(tabNo) || { items: new Map<number, { subtitle?: string; description?: string }>() };
        const item = current.items.get(itemNo) || {};
        if (field === 'TITLE') item.subtitle = section.value || '';
        if (field === 'DESC') item.description = section.value || '';
        current.items.set(itemNo, item);
        tabsMap.set(tabNo, current);
      }
    });

    const iconByName: Record<string, React.ReactNode> = {
      Info: <Info size={18} />,
      Settings: <Settings size={18} />,
      ShieldAlert: <ShieldAlert size={18} />,
      Leaf: <Leaf size={18} />,
      FileText: <FileText size={18} />
    };
    const toIcon = (name?: string) => iconByName[name || ''] || <Info size={18} />;

    const dynamicTabs = Array.from(tabsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([index, tab]) => {
        const rules = Array.from(tab.items.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, item]) => ({
            subtitle: item.subtitle || '',
            description: item.description || ''
          }))
          .filter((item) => item.subtitle || item.description);

        return {
          id: tab.id || `tab-${index}`,
          title: tab.title || '',
          icon: toIcon(tab.icon),
          rules
        };
      })
      .filter((tab) => tab.title && tab.rules.length > 0);

    const legacyTabs: RuleSection[] = [
      {
        id: 'pilot',
        title: getText('RULES_PILOT_TITLE', 'PİLOT PROTOKOLU'),
        icon: <Info size={18} />,
        rules: [
          { subtitle: getText('RULES_PILOT_SUB1', 'İSTİFADƏÇİ ÖHDƏLİKLƏRİ'), description: getText('RULES_PILOT_DESC1', 'HƏR BİR İŞTİRAKÇI FEDERASİYANIN MÜƏYYƏN ETDİYİ BÜTÜN TEXNİKİ VƏ ETİK NORMALARI QEYD-ŞƏRTSİZ QƏBUL EDİR.') },
          { subtitle: getText('RULES_PILOT_SUB2', 'DİSKVALİFİKASİYA'), description: getText('RULES_PILOT_DESC2', 'PROTOKOLDAN KƏNARA ÇIXMAQ VƏ YA HAKİM QƏRARLARINA ETİRAZ ETMƏK DƏRHAL DİSKVALİFİKASİYA İLƏ NƏTİCƏLƏNƏ BİLƏR.') },
          { subtitle: getText('RULES_PILOT_SUB3', 'TEXNİKİ TƏLƏBLƏR'), description: getText('RULES_PILOT_DESC3', 'BÜTÜN AVADANLIQLAR YARIŞDAN 24 SAAT ƏVVƏL TEXNİKİ KOMİSSİYA TƏRƏFİNDƏN YOXLANILMALI VƏ TƏHLÜKƏSİZLİK SERTİFİKATI İLƏ TƏMİN EDİLMƏLİDİR.') }
        ]
      },
      {
        id: 'technical',
        title: getText('RULES_TECH_TITLE', 'TEXNİKİ NORMARTİVLƏR'),
        icon: <Settings size={18} />,
        rules: [
          { subtitle: getText('RULES_TECH_SUB1', 'TƏKƏR ÖLÇÜLƏRİ'), description: getText('RULES_TECH_DESC1', 'PRO CLASS ÜÇÜN MAKSİMUM TƏKƏR ÖLÇÜSÜ 37 DÜYM, AMATEUR CLASS ÜÇÜN İSƏ 33 DÜYM OLARAQ MÜƏYYƏN EDİLMİŞDİR.') },
          { subtitle: getText('RULES_TECH_SUB2', 'MÜHƏRRİK GÜCÜ'), description: getText('RULES_TECH_DESC2', 'MÜHƏRRİK ÜZƏRİNDƏ APARILAN MODİFİKASİYALAR KATEQORİYA ÜZRƏ LİMİTLƏRİ AŞMAMALIDIR. TURBO SİSTEMLƏRİ YALNIZ XÜSUSİ KLASLARDA İCAZƏLİDİR.') },
          { subtitle: getText('RULES_TECH_SUB3', 'ASQI SİSTEMİ'), description: getText('RULES_TECH_DESC3', 'AVTOMOBİLİN KLİRENSİ (YERDƏN HÜNDÜRLÜYÜ) VƏ ASQI ARTIKULYASİYASI TƏHLÜKƏSİZLİK STANDARTLARINA UYĞUN OLMALIDIR.') }
        ]
      },
      {
        id: 'safety',
        title: getText('RULES_SAFETY_TITLE', 'TƏHLÜKƏSİZLİK QAYDALARI'),
        icon: <ShieldAlert size={18} />,
        rules: [
          { subtitle: getText('RULES_SAFETY_SUB1', 'KARKAS TƏLƏBİ'), description: getText('RULES_SAFETY_DESC1', 'BÜTÜN AÇIQ VƏ YA MODİFİKASİYA OLUNMUŞ AVTOMOBİLLƏRDƏ FIA STANDARTLARINA UYĞUN TƏHLÜKƏSİZLİK KARKASI (ROLL CAGE) MƏCBURİDİR.') },
          { subtitle: getText('RULES_SAFETY_SUB2', 'YANĞIN SÖNDÜRMƏ'), description: getText('RULES_SAFETY_DESC2', 'HƏR BİR AVTOMOBİLDƏ ƏN AZI 2 KİLOQRAMLIQ, ASAN ƏLÇATAN YERDƏ YERLƏŞƏN YANĞINSÖNDÜRƏN BALON OLMALIDIR.') },
          { subtitle: getText('RULES_SAFETY_SUB3', 'KƏMƏR VƏ DƏBİLQƏ'), description: getText('RULES_SAFETY_DESC3', '5 NÖQTƏLİ TƏHLÜKƏSİZLİK KƏMƏRLƏRİ VƏ SERTİFİKATLI KASKALARIN (DƏBİLQƏLƏRİN) İSTİFADƏSİ BÜTÜN MƏRHƏLƏLƏRDƏ MƏCBURİDİR.') }
        ]
      },
      {
        id: 'eco',
        title: getText('RULES_ECO_TITLE', 'EKOLOJİ MƏSULİYYƏT'),
        icon: <Leaf size={18} />,
        rules: [
          { subtitle: getText('RULES_ECO_SUB1', 'TULLANTILARIN İDARƏ EDİLMƏSİ'), description: getText('RULES_ECO_DESC1', 'YARIŞ ƏRAZİSİNDƏ VƏ TRASDA HƏR HANSI BİR TULLANTININ ATILMASI QƏTİ QADAĞANDIR. İŞTİRAKÇILAR "LEAVE NO TRACE" PRİNSİPİNƏ ƏMƏL ETMƏLİDİR.') },
          { subtitle: getText('RULES_ECO_SUB2', 'MAYE SIZMALARI'), description: getText('RULES_ECO_DESC2', 'AVTOMOBİLDƏN YAĞ VƏ YA SOYUDUCU MAYE SIZMASI OLDUĞU TƏQDİRDƏ PİLOT DƏRHAL DAYANMALI VƏ ƏRAZİNİN ÇİRKLƏNMƏSİNİN QARŞISINI ALMALIDIR.') },
          { subtitle: getText('RULES_ECO_SUB3', 'MARŞRUTDAN KƏNARA ÇIXMAMAQ'), description: getText('RULES_ECO_DESC3', 'TƏBİİ ÖRTÜYÜ QORUMAQ MƏQSƏDİ İLƏ MÜƏYYƏN OLUNMUŞ TRASDANKƏNAR SÜRÜŞLƏR VƏ YA YAŞIL SAHƏLƏRƏ ZƏRƏR VERMƏK QADAĞANDIR.') }
        ]
      }
    ];

    if (!dynamicTabs.length) return legacyTabs;

    const normalizeKey = (value: string) =>
      (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const dynamicById = new Map(dynamicTabs.map((tab) => [normalizeKey(tab.id || tab.title), tab]));
    const used = new Set<string>();

    const merged = legacyTabs.map((legacyTab) => {
      const key = normalizeKey(legacyTab.id || legacyTab.title);
      const dynamic = dynamicById.get(key);
      if (!dynamic) return legacyTab;
      used.add(key);
      return {
        ...legacyTab,
        ...dynamic,
        title: dynamic.title || legacyTab.title,
        rules: dynamic.rules.length ? dynamic.rules : legacyTab.rules
      };
    });

    dynamicTabs.forEach((tab) => {
      const key = normalizeKey(tab.id || tab.title);
      if (!used.has(key)) merged.push(tab);
    });

    return merged;
  }, [getText, getUrl, rulesPage?.sections]);

  useEffect(() => {
    if (!ruleSections.length) return;
    if (!ruleSections.some((section) => section.id === activeSection)) {
      setActiveSection(ruleSections[0].id);
    }
  }, [activeSection, ruleSections]);

  const applyTargetSection = useCallback((rawTarget: string) => {
    const target = (rawTarget || '').trim();
    if (!target || !ruleSections.length) return;

    const normalizedTarget = normalizeTargetToken(target);
    const inferredTarget = inferSectionByToken(normalizedTarget);

    const match = ruleSections.find((section) => {
      const idToken = normalizeTargetToken(section.id);
      const titleToken = normalizeTargetToken(section.title);
      if (idToken === normalizedTarget || titleToken === normalizedTarget) return true;
      if (inferredTarget && (idToken.includes(inferredTarget) || titleToken.includes(inferredTarget))) return true;
      return false;
    });

    if (match) {
      setActiveSection(match.id);
    }
  }, [inferSectionByToken, normalizeTargetToken, ruleSections]);

  useEffect(() => {
    if (!ruleSections.length) return;

    try {
      const rawTarget = (sessionStorage.getItem(RULES_TARGET_SECTION_KEY) || '').trim();
      sessionStorage.removeItem(RULES_TARGET_SECTION_KEY);
      if (!rawTarget) return;
      applyTargetSection(rawTarget);
    } catch {
      // ignore storage access errors
    }
  }, [applyTargetSection, ruleSections.length]);

  useEffect(() => {
    const onRulesTarget = (event: Event) => {
      const payload = (event as CustomEvent<string | undefined>).detail;
      if (typeof payload === 'string') {
        applyTargetSection(payload);
      }
    };

    window.addEventListener(RULES_TARGET_SECTION_EVENT, onRulesTarget as EventListener);
    return () => {
      window.removeEventListener(RULES_TARGET_SECTION_EVENT, onRulesTarget as EventListener);
    };
  }, [applyTargetSection]);

  const currentSection = ruleSections.find(s => s.id === activeSection) || ruleSections[0];
  const resolveDocUrl = (rawUrl?: string) => {
    const value = (rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        // Keep uploaded files portable across admin/frontend hosts.
        if (parsed.pathname.startsWith('/uploads/')) {
          return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        return value;
      }
      return value;
    }
    return value.startsWith('/') ? value : `/${value}`;
  };
  const globalDocUrl = resolveDocUrl(getUrl('BTN_DOWNLOAD_PDF', ''));
  const displayDocName = useMemo(() => {
    const configured = getText('DOC_DOWNLOAD_FILE_NAME', '').trim();
    if (configured) return configured;
    if (!globalDocUrl) return 'UMUMI_TALIMAT.PDF';
    const normalized = globalDocUrl.split('?')[0].split('#')[0];
    const token = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
    if (!token) return 'UMUMI_TALIMAT.PDF';
    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  }, [getText, globalDocUrl]);

  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white">
      {/* Standardized Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'QAYDALAR')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'FORSAJ MOTORSPORT OFFICIAL RULES')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        <div className="lg:w-1/4 space-y-4">
          <div className="flex flex-col gap-2">
            {ruleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center justify-between p-6 font-black italic text-[11px] uppercase tracking-[0.2em] transition-all transform hover:translate-x-1 border border-white/5 ${activeSection === section.id
                  ? 'bg-[#FF4D00] text-black shadow-2xl border-[#FF4D00]'
                  : 'bg-[#111] text-white hover:bg-[#1a1a1a]'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className={activeSection === section.id ? 'text-black' : 'text-[#FF4D00]'}>
                    {section.icon}
                  </span>
                  {section.title}
                </div>
                <ChevronRight size={16} className={activeSection === section.id ? 'text-black' : 'text-gray-600'} />
              </button>
            ))}
          </div>
          {/* Rest of the component content remains the same */}
          <div className="bg-[#111] p-8 border border-white/5 mt-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#FF4D00]/10 p-4 text-[#FF4D00]">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-gray-600 font-black italic text-[8px] uppercase tracking-[0.3em] mb-1">{getText('DOC_DOWNLOAD_LABEL', 'SƏNƏDİ YÜKLƏ')}</p>
                <p
                  title={displayDocName}
                  className="text-white font-black italic text-[11px] uppercase tracking-tighter max-w-[180px] md:max-w-[230px] truncate"
                >
                  {displayDocName}
                </p>
              </div>
            </div>
            <button
              className="w-full bg-[#FF4D00] text-black py-4 font-black italic text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white transition-all transform -skew-x-12"
              onClick={() => {
                if (globalDocUrl) window.open(globalDocUrl, '_blank');
              }}
            >
              <span className="transform skew-x-12 flex items-center gap-2">
                {getText('BTN_DOWNLOAD_PDF', 'PDF YÜKLƏ')} <Download size={14} />
              </span>
            </button>
          </div>
        </div>

        <div className="lg:w-3/4">
          <div className="bg-[#050505] text-white min-h-[600px] relative overflow-hidden group border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
              <span className="text-[250px] font-black italic leading-none select-none uppercase tracking-tighter">
                {currentSection.id}
              </span>
            </div>

            <div className="relative z-10 p-10 md:p-24">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-2 h-12 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
                <h3 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                  {currentSection.title}
                </h3>
              </div>

              <div className="space-y-16 mt-20">
                {currentSection.rules.map((rule, index) => (
                  <div key={index} className="relative pl-12 border-l border-white/5 group/rule">
                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 bg-[#FF4D00] shadow-[0_0_10px_rgba(255,77,0,0.3)]"></div>
                    <h4 className="text-[#FF4D00] font-black italic text-2xl uppercase tracking-tighter mb-4 group-hover/rule:text-white transition-colors">
                      {rule.subtitle}
                    </h4>
                    <p
                      className="text-gray-500 font-bold italic text-sm md:text-base uppercase leading-relaxed tracking-widest max-w-3xl"
                      dangerouslySetInnerHTML={{ __html: bbcodeToHtml(rule.description) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
