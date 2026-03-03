
import React, { useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Marquee from './components/Marquee';
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About';
import NewsPage from './components/NewsPage';
import EventsPage from './components/EventsPage';
import DriversPage from './components/DriversPage';
import RulesPage from './components/RulesPage';
import ContactPage from './components/ContactPage';
import GalleryPage from './components/GalleryPage';
import Footer from './components/Footer';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';
import { useSiteContent } from './hooks/useSiteContent';
import { useEffect } from 'react';

const SELECTED_NEWS_ID_KEY = 'forsaj_selected_news_id';
const LANGUAGE_TRANSITION_START_EVENT = 'forsaj-language-transition-start';
const LANGUAGE_TRANSITION_END_EVENT = 'forsaj-language-transition-end';
const LANGUAGE_SPLASH_MIN_VISIBLE_MS = 3000;

type FrontView =
  | 'home'
  | 'about'
  | 'news'
  | 'events'
  | 'drivers'
  | 'rules'
  | 'contact'
  | 'gallery'
  | 'privacy'
  | 'terms';

type EventsOpenMode = 'default' | 'force-list';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<FrontView>('home');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [eventsOpenMode, setEventsOpenMode] = useState<EventsOpenMode>('default');
  const [isLanguageSplashVisible, setIsLanguageSplashVisible] = useState(true);
  const [shouldRenderSplash, setShouldRenderSplash] = useState(true);
  const splashFailSafeRef = useRef<number | null>(null);
  const splashHideDelayRef = useRef<number | null>(null);
  const splashStartAtRef = useRef<number>(Date.now());

  const handleViewChange = (view: FrontView, category: string | null = null) => {
    setCurrentView((prevView) => {
      if (view === 'events') {
        setEventsOpenMode(prevView === 'contact' ? 'force-list' : 'default');
      }
      return view;
    });
    setActiveCategory(category);
    window.scrollTo(0, 0);
  };

  const { getText } = useSiteContent('general');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawView = (params.get('view') || '').trim().toLowerCase();
      const rawNewsId = (params.get('id') || '').trim();

      const viewMap: Record<string, FrontView> = {
        home: 'home',
        about: 'about',
        news: 'news',
        events: 'events',
        drivers: 'drivers',
        rules: 'rules',
        contact: 'contact',
        gallery: 'gallery',
        privacy: 'privacy',
        terms: 'terms'
      };

      const resolvedView = viewMap[rawView];
      if (!resolvedView) return;

      if (resolvedView === 'news') {
        const newsId = Number(rawNewsId);
        if (Number.isFinite(newsId)) {
          sessionStorage.setItem(SELECTED_NEWS_ID_KEY, String(newsId));
        }
      }
      if (resolvedView === 'events') {
        const eventId = Number(rawNewsId);
        if (Number.isFinite(eventId)) {
          sessionStorage.setItem('forsaj_events_target_event', JSON.stringify({ id: eventId }));
        }
      }

      setCurrentView(resolvedView);
      setActiveCategory(null);
    } catch {
      // ignore malformed query string / storage access errors
    }
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', onPageShow as EventListener);
    return () => {
      window.removeEventListener('pageshow', onPageShow as EventListener);
    };
  }, []);

  useEffect(() => {
    const title = getText('SEO_TITLE', 'Forsaj Club - Offroad Motorsport Hub');
    const description = getText('SEO_DESCRIPTION', '');
    const keywords = getText('SEO_KEYWORDS', '');
    const canonicalUrl = getText('SEO_CANONICAL_URL', window.location.origin);
    const robots = getText('SEO_ROBOTS', 'index,follow');
    const author = getText('SEO_AUTHOR', 'Forsaj Club');
    const lang = getText('SEO_LANGUAGE', 'az');
    const ogTitle = getText('SEO_OG_TITLE', title);
    const ogDescription = getText('SEO_OG_DESCRIPTION', description);
    const ogImage = getText('SEO_OG_IMAGE', '');
    const ogUrl = getText('SEO_OG_URL', canonicalUrl);
    const twitterCard = getText('SEO_TWITTER_CARD', 'summary_large_image');
    const twitterSite = getText('SEO_TWITTER_SITE', '');
    const twitterCreator = getText('SEO_TWITTER_CREATOR', '');
    const googleVerification = getText('SEO_GOOGLE_VERIFICATION', '');
    const bingVerification = getText('SEO_BING_VERIFICATION', '');
    const yandexVerification = getText('SEO_YANDEX_VERIFICATION', '');

    const setMetaByName = (name: string, content: string) => {
      if (!content) return;
      let node = document.querySelector(`meta[name="${name}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('name', name);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };

    const setMetaByProperty = (property: string, content: string) => {
      if (!content) return;
      let node = document.querySelector(`meta[property="${property}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('property', property);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };

    const setCanonical = (url: string) => {
      if (!url) return;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
    };

    document.title = title;
    document.documentElement.lang = lang || 'az';

    setMetaByName('description', description);
    setMetaByName('keywords', keywords);
    setMetaByName('robots', robots);
    setMetaByName('author', author);
    setMetaByName('google-site-verification', googleVerification);
    setMetaByName('msvalidate.01', bingVerification);
    setMetaByName('yandex-verification', yandexVerification);

    setMetaByProperty('og:type', 'website');
    setMetaByProperty('og:title', ogTitle);
    setMetaByProperty('og:description', ogDescription || description);
    setMetaByProperty('og:url', ogUrl || canonicalUrl);
    setMetaByProperty('og:image', ogImage);

    setMetaByName('twitter:card', twitterCard);
    setMetaByName('twitter:title', ogTitle);
    setMetaByName('twitter:description', ogDescription || description);
    setMetaByName('twitter:image', ogImage);
    setMetaByName('twitter:site', twitterSite);
    setMetaByName('twitter:creator', twitterCreator);

    setCanonical(canonicalUrl);
  }, [getText]);

  useEffect(() => {
    const clearSplashFailsafe = () => {
      if (splashFailSafeRef.current !== null) {
        window.clearTimeout(splashFailSafeRef.current);
        splashFailSafeRef.current = null;
      }
    };

    const clearSplashHideDelay = () => {
      if (splashHideDelayRef.current !== null) {
        window.clearTimeout(splashHideDelayRef.current);
        splashHideDelayRef.current = null;
      }
    };

    const armSplashFailsafe = () => {
      clearSplashFailsafe();
      splashFailSafeRef.current = window.setTimeout(() => {
        setIsLanguageSplashVisible(false);
      }, 5000);
    };

    const onLanguageTransitionStart = () => {
      clearSplashHideDelay();
      splashStartAtRef.current = Date.now();
      setIsLanguageSplashVisible(true);
      armSplashFailsafe();
    };
    const onLanguageTransitionEnd = () => {
      clearSplashFailsafe();
      clearSplashHideDelay();
      const elapsed = Date.now() - splashStartAtRef.current;
      const delay = Math.max(0, LANGUAGE_SPLASH_MIN_VISIBLE_MS - elapsed);
      splashHideDelayRef.current = window.setTimeout(() => {
        setIsLanguageSplashVisible(false);
        splashHideDelayRef.current = null;
      }, delay);
    };

    window.addEventListener(LANGUAGE_TRANSITION_START_EVENT, onLanguageTransitionStart as EventListener);
    window.addEventListener(LANGUAGE_TRANSITION_END_EVENT, onLanguageTransitionEnd as EventListener);
    armSplashFailsafe();

    return () => {
      window.removeEventListener(LANGUAGE_TRANSITION_START_EVENT, onLanguageTransitionStart as EventListener);
      window.removeEventListener(LANGUAGE_TRANSITION_END_EVENT, onLanguageTransitionEnd as EventListener);
      clearSplashFailsafe();
      clearSplashHideDelay();
    };
  }, []);

  useEffect(() => {
    if (isLanguageSplashVisible) {
      setShouldRenderSplash(true);
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setShouldRenderSplash(false);
    }, 450);

    return () => window.clearTimeout(hideTimer);
  }, [isLanguageSplashVisible]);

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      {shouldRenderSplash && (
        <div
          className={`translate-transition-overlay fixed inset-0 z-[300] flex items-center justify-center transition-all duration-500 ease-out ${
            isLanguageSplashVisible
              ? 'is-visible opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className={`translate-loader ${isLanguageSplashVisible ? 'is-visible' : ''}`} aria-hidden="true">
            <span className="translate-loader-dot dot-a" />
            <span className="translate-loader-dot dot-b" />
            <span className="translate-loader-dot dot-c" />
          </div>
        </div>
      )}
      <Toaster position="top-right" />
      <Marquee />
      <Navbar currentView={currentView} onViewChange={(view) => handleViewChange(view, null)} />
      <main className="flex-grow w-full overflow-x-hidden">
        {currentView === 'home' && <Home onViewChange={(view, cat) => handleViewChange(view, cat || null)} />}
        {currentView === 'about' && <About />}
        {currentView === 'news' && <NewsPage />}
        {currentView === 'events' && (
          <EventsPage
            openMode={eventsOpenMode}
            onViewChange={(view) => handleViewChange(view, null)}
          />
        )}
        {currentView === 'drivers' && <DriversPage initialCategoryId={activeCategory} />}
        {currentView === 'rules' && <RulesPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'gallery' && <GalleryPage />}
        {currentView === 'privacy' && <PrivacyPolicyPage />}
        {currentView === 'terms' && <TermsOfServicePage />}
      </main>
      <Footer onViewChange={(view) => handleViewChange(view, null)} />
    </div>
  );
};

export default App;
