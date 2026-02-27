
import React, { useState } from 'react';
import { Instagram, Youtube, Facebook, ArrowRight, MapPin } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { resolveSocialLinks } from '../utils/socialLinks';
import toast from 'react-hot-toast';

const RULES_TARGET_SECTION_KEY = 'forsaj_rules_target_section';
const RULES_TARGET_SECTION_EVENT = 'forsaj:rules-target-section';

interface FooterProps {
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms') => void;
}

const Footer: React.FC<FooterProps> = ({ onViewChange }) => {
  const { getText, getUrl, getImage } = useSiteContent('footer');
  const { getText: getGeneralText, getImage: getImageGeneral } = useSiteContent('general');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const footerAbout = getText('FOOTER_ABOUT_TEXT', 'Azərbaycanın ən prestijli motorsport mərkəzi. Sərhədsiz offroad həyəcanını bizimlə yaşayın.');
  const addressLabel = getText('FOOTER_ADDRESS_LABEL', 'ÜNVAN');
  const navTitle = getText('FOOTER_NAV_TITLE', 'NAVİQASİYA');
  const motorsportTitle = getText('FOOTER_MOTORSPORT_TITLE', 'MOTORSPORT');
  const newsletterTitle = getText('FOOTER_NEWSLETTER_TITLE', 'XƏBƏRDAR OL');
  const newsletterDesc = getText('FOOTER_NEWSLETTER_DESC', 'Yarış təqvimi və xəbərlərdən anında xəbərdar olmaq üçün abunə olun.');
  const newsletterPlaceholder = getText('FOOTER_NEWSLETTER_PLACEHOLDER', 'EMAIL DAXİL EDİN');
  const newsletterRequiredToast = getText('FOOTER_NEWSLETTER_TOAST_REQUIRED', 'Zəhmət olmasa düzgün email daxil edin.');
  const newsletterSuccessToast = getText('FOOTER_NEWSLETTER_TOAST_SUCCESS', 'Abunəliyiniz uğurla qeydə alındı!');
  const newsletterErrorToast = getText('FOOTER_NEWSLETTER_TOAST_ERROR', 'Abunə zamanı xəta baş verdi.');
  const copyrightText = getText('FOOTER_COPYRIGHT', '© 2024 FORSAJ CLUB. ALL RIGHTS RESERVED.');
  const privacyLabel = getText('FOOTER_PRIVACY_LABEL', getText('txt-privacy-policy-517', 'Privacy Policy'));
  const termsLabel = getText('FOOTER_TERMS_LABEL', getText('txt-terms-of-servic-731', 'Terms of Service'));
  const privacyUrl = getUrl('FOOTER_PRIVACY_LABEL', getUrl('txt-privacy-policy-517', 'privacy'));
  const termsUrl = getUrl('FOOTER_TERMS_LABEL', getUrl('txt-terms-of-servic-731', 'terms'));

  const logoImg = getImageGeneral('SITE_LOGO_LIGHT').path;

  const { getPage } = useSiteContent('socials');
  const socialsPage = getPage('socials');

  const socialIconMap = {
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook
  };

  const socialLinks = resolveSocialLinks(socialsPage?.sections, getGeneralText).map(({ platform, url }) => ({
    Icon: socialIconMap[platform],
    url
  }));

  const viewIds = new Set(['home', 'about', 'news', 'events', 'drivers', 'rules', 'contact', 'gallery', 'privacy', 'terms']);
  const viewMap: Record<string, 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms'> = {
    home: 'home',
    about: 'about',
    news: 'news',
    events: 'events',
    drivers: 'drivers',
    rules: 'rules',
    contact: 'contact',
    gallery: 'gallery',
    privacy: 'privacy',
    privacypolicy: 'privacy',
    mexfiliksiyaseti: 'privacy',
    terms: 'terms',
    termsofservice: 'terms',
    xidmetsertleri: 'terms',
    ana: 'home',
    anasehife: 'home',
    haqqimizda: 'about',
    xeberler: 'news',
    tedbirler: 'events',
    suruculer: 'drivers',
    qaydalar: 'rules',
    elaqe: 'contact',
    qalereya: 'gallery'
  };

  const normalize = (token: string) =>
    (token || '')
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

  const inferViewFromText = (value: string) => {
    const token = normalize(value);
    if (token.includes('anashe') || token.includes('anasif')) return 'home';
    if (token.includes('haqqimizda')) return 'about';
    if (token.includes('xeber') || token.includes('xber') || token.includes('xbr')) return 'news';
    if (token.includes('tedbir') || token.includes('tdbir') || token.includes('tebdir')) return 'events';
    if (token.includes('surucu') || token.includes('srucu') || token.includes('src')) return 'drivers';
    if (token.includes('qalereya') || token.includes('galereya')) return 'gallery';
    if (token.includes('qayda')) return 'rules';
    if (token.includes('pilot')) return 'rules';
    if (token.includes('texniki') || token.includes('normativ')) return 'rules';
    if (token.includes('tehlukesiz')) return 'rules';
    if (token.includes('ekoloji')) return 'rules';
    if (token.includes('elaqe') || token.includes('laq') || token.includes('elaq')) return 'contact';
    if (token.includes('privacy') || token.includes('mexfilik')) return 'privacy';
    if (token.includes('terms') || token.includes('xidmetsert')) return 'terms';
    return null;
  };

  const resolveInternalView = (rawValue: string) => {
    const value = (rawValue || '').trim();
    if (!value || value === '#') return null;

    const direct = normalize(value);
    if (viewIds.has(direct)) return direct as 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms';
    if (viewMap[direct]) return viewMap[direct];

    try {
      const parsed = new URL(value, window.location.origin);
      const currentHost = window.location.hostname.replace(/^www\./, '');
      const parsedHost = parsed.hostname.replace(/^www\./, '');
      const isSameHost = parsedHost === currentHost;
      const isLikelyInternalHost = parsedHost.includes('forsaj') || currentHost.includes('forsaj');
      if (!isSameHost && !isLikelyInternalHost) return null;

      const candidates = [
        normalize(parsed.pathname.replace(/^\/+|\/+$/g, '')),
        normalize(parsed.hash.replace(/^#/, '')),
        normalize(parsed.searchParams.get('view') || ''),
        normalize(parsed.searchParams.get('tab') || '')
      ];

      for (const candidate of candidates) {
        if (!candidate) continue;
        if (viewIds.has(candidate)) return candidate as 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms';
        if (viewMap[candidate]) return viewMap[candidate];
      }
    } catch {
      return null;
    }

    return null;
  };

  const navigateFromConfig = (
    rawValue: string,
    fallback: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery' | 'privacy' | 'terms',
    fallbackText?: string
  ) => {
    const value = (rawValue || '').trim();
    const inferred = inferViewFromText(fallbackText || '');
    const resolved = resolveInternalView(value) || inferred;

    if (resolved) {
      onViewChange(resolved);
      return;
    }

    if (/^https?:\/\//i.test(value)) {
      window.open(value, '_blank');
      return;
    }

    onViewChange(fallback);
  };

  const isExternalAbsoluteUrl = (rawValue?: string) => {
    const value = (rawValue || '').trim();
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      const parsed = new URL(value);
      const currentHost = window.location.hostname.replace(/^www\./, '');
      const parsedHost = parsed.hostname.replace(/^www\./, '');
      const isSameHost = parsedHost === currentHost;
      const isLikelyInternalHost = parsedHost.includes('forsaj') || currentHost.includes('forsaj');
      return !isSameHost && !isLikelyInternalHost;
    } catch {
      return true;
    }
  };

  const submitNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      toast.error(newsletterRequiredToast);
      return;
    }

    if (isNewsletterSubmitting) return;
    setIsNewsletterSubmitting(true);

    const payload = {
      name: getText('FOOTER_NEWSLETTER_APP_NAME', 'NEWSLETTER ABUNƏSİ'),
      contact: email,
      type: getText('FOOTER_NEWSLETTER_APP_TYPE', 'Newsletter Subscription'),
      content: JSON.stringify({
        source: 'footer-newsletter',
        email
      })
    };

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: payload.name,
          source: 'footer-newsletter'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'request_failed');
      }

      // Keep admin inbox visibility for newsletter subscriptions (best effort).
      fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // no-op
      });

      toast.success(newsletterSuccessToast);
      setNewsletterEmail('');
    } catch {
      toast.error(newsletterErrorToast);
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  const sanitizeFooterRuleLabel = (value: string) =>
    (value || '')
      .replace(/&lt;\/?g[^&]*&gt;/gi, '')
      .replace(/<\/?g[^>]*>/gi, '')
      .trim();


  const navigationLinks = [
    { name: getText('txt-ana-s-h-f-744', 'ANA SƏHİFƏ'), id: getUrl('txt-ana-s-h-f-744', 'home') as any, fallback: 'home' as const },
    { name: getText('txt-haqqimizda-942', 'HAQQIMIZDA'), id: getUrl('txt-haqqimizda-942', 'about') as any, fallback: 'about' as const },
    { name: getText('txt-x-b-rl-r-431', 'XƏBƏRLƏR'), id: getUrl('txt-x-b-rl-r-431', 'news') as any, fallback: 'news' as const },
    { name: getText('txt-t-dbi-rl-r-62', 'TƏDBİRLƏR'), id: getUrl('txt-t-dbi-rl-r-62', 'events') as any, fallback: 'events' as const },
    { name: getText('txt-s-r-c-l-r-931', 'SÜRÜCÜLƏR'), id: getUrl('txt-s-r-c-l-r-931', 'drivers') as any, fallback: 'drivers' as const },
    { name: getText('txt-qalereya-112', 'QALEREYA'), id: getUrl('txt-qalereya-112', 'gallery') as any, fallback: 'gallery' as const },
    { name: getText('txt-laq-452', 'ƏLAQƏ'), id: getUrl('txt-laq-452', 'contact') as any, fallback: 'contact' as const },
  ];

  const rulesLinks = [
    { name: getText('txt-pi-lot-protokolu-31', 'PİLOT PROTOKOLU'), id: getUrl('txt-pi-lot-protokolu-31', 'rules') as any, fallback: 'rules' as const, ruleSection: 'pilot' },
    { name: getText('txt-texni-ki-normati-712', 'TEXNİKİ NORMATİVLƏR'), id: getUrl('txt-texni-ki-normati-712', 'rules') as any, fallback: 'rules' as const, ruleSection: 'technical' },
    { name: sanitizeFooterRuleLabel(getText('txt-t-hl-k-si-zli-k-q-121', 'TƏHLÜKƏSİZLİK QAYDALARI')), id: getUrl('txt-t-hl-k-si-zli-k-q-121', 'rules') as any, fallback: 'rules' as const, ruleSection: 'safety' },
    { name: getText('txt-ekoloji-m-suli-yy-612', 'EKOLOJİ MƏSULİYYƏT'), id: getUrl('txt-ekoloji-m-suli-yy-612', 'rules') as any, fallback: 'rules' as const, ruleSection: 'eco' },
  ];

  return (
    <footer className="bg-[#050505] pt-32 pb-12 px-6 lg:px-20 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-24">

        <div className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => onViewChange('home')}>
            {logoImg ? (
              <img src={logoImg} alt={getText('FOOTER_LOGO_ALT', 'Forsaj Logo')} className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="bg-[#FF4D00] w-10 h-10 rounded-sm flex items-center justify-center relative shadow-[0_0_20px_rgba(255,77,0,0.4)] group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current transform -rotate-12">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter flex items-center">
                  <span className="text-white">FORSAJ</span>
                  <span className="text-[#FF4D00] ml-1">CLUB</span>
                </h2>
              </div>
            )}
          </div>
          <p className="text-gray-500 font-bold italic text-[11px] uppercase leading-relaxed mb-10 max-w-xs tracking-tight">
            {footerAbout}
          </p>
          <div className="flex gap-4 mb-8">
            {socialLinks.map(({ Icon, url }, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 p-4 rounded-sm text-gray-500 hover:bg-[#FF4D00] hover:text-black transition-all transform hover:-translate-y-1 shadow-sm"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-start gap-4 text-gray-500 group">
              <div className="bg-white/5 p-3 rounded-sm text-[#FF4D00]">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[9px] font-black italic uppercase tracking-widest text-[#FF4D00] mb-1">{addressLabel}</p>
                <p className="text-[11px] font-bold italic uppercase leading-tight">
                  {getGeneralText('CONTACT_ADDRESS_1') || 'AZADLIQ 102, BAKI'}
                </p>
              </div>
            </div>

          </div>
        </div>

        <div>
          <h4 className="text-[#FF4D00] font-black italic text-[13px] mb-8 uppercase tracking-[0.3em]">{navTitle}</h4>
          <ul className="space-y-5">
            {navigationLinks.map(link => (
              <li key={link.name}>
                <button
                  onClick={() => {
                    navigateFromConfig(link.id, link.fallback, link.name);
                  }}
                  className="text-gray-500 font-black italic text-[11px] uppercase hover:text-white transition-colors tracking-tight text-left"
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[#FF4D00] font-black italic text-[13px] mb-8 uppercase tracking-[0.3em]">{motorsportTitle}</h4>
          <ul className="space-y-5">
            {rulesLinks.map(link => (
              <li key={link.name}>
                <button
                  onClick={() => {
                    try {
                      sessionStorage.setItem(RULES_TARGET_SECTION_KEY, link.ruleSection);
                    } catch {
                      // ignore storage access errors
                    }
                    try {
                      window.dispatchEvent(new CustomEvent(RULES_TARGET_SECTION_EVENT, { detail: link.ruleSection }));
                    } catch {
                      // ignore event dispatch errors
                    }
                    navigateFromConfig(link.id, link.fallback, link.name);
                  }}
                  className="text-gray-500 font-black italic text-[11px] uppercase hover:text-white transition-colors tracking-tight text-left"
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 p-8 rounded-sm border border-white/5">
          <h4 className="text-white font-black italic text-[13px] mb-4 uppercase tracking-tighter">{newsletterTitle}</h4>
          <p className="text-gray-500 font-bold italic text-[10px] uppercase mb-8 leading-relaxed tracking-tight">
            {newsletterDesc}
          </p>
          <form className="flex items-center" onSubmit={submitNewsletter}>
            <input
              type="email"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder={newsletterPlaceholder}
              disabled={isNewsletterSubmitting}
              className="flex-grow bg-[#111] border border-white/10 border-r-0 py-4 px-5 font-black italic text-[10px] text-white uppercase focus:outline-none focus:border-[#FF4D00] transition-colors placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={isNewsletterSubmitting}
              className="bg-[#FF4D00] text-black p-4 hover:bg-white transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <ArrowRight size={22} strokeWidth={3} />
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest">
          {copyrightText}
        </p>
        <div className="flex gap-10">
          <a
            href={privacyUrl || '#'}
            target={isExternalAbsoluteUrl(privacyUrl) ? '_blank' : undefined}
            rel={isExternalAbsoluteUrl(privacyUrl) ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!isExternalAbsoluteUrl(privacyUrl)) {
                e.preventDefault();
                navigateFromConfig(privacyUrl, 'privacy', privacyLabel);
              }
            }}
            className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest hover:text-[#FF4D00] transition-colors"
          >
            {privacyLabel}
          </a>
          <a
            href={termsUrl || '#'}
            target={isExternalAbsoluteUrl(termsUrl) ? '_blank' : undefined}
            rel={isExternalAbsoluteUrl(termsUrl) ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!isExternalAbsoluteUrl(termsUrl)) {
                e.preventDefault();
                navigateFromConfig(termsUrl, 'terms', termsLabel);
              }
            }}
            className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest hover:text-[#FF4D00] transition-colors"
          >
            {termsLabel}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
