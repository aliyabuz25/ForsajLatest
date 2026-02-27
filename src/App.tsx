import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AdminAutoTranslate from './components/AdminAutoTranslate';
import VisualEditor from './pages/VisualEditor';
import UsersManager from './pages/UsersManager';
import SetupGuide from './components/SetupGuide';
import Login from './pages/Login';
import ApplicationsManager from './pages/ApplicationsManager';
import GeneralSettings from './pages/GeneralSettings';
import { Toaster } from 'react-hot-toast';
import type { SidebarItem } from './types/navigation';
import { ADMIN_USER_KEY, clearAdminSession, getAuthToken, SESSION_EXPIRED_EVENT } from './utils/session';
import { getStoredAdminLanguage, setStoredAdminLanguage, type AdminLanguage } from './utils/adminLanguage';
import './index.css';

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const titleMap: Record<string, string> = {
  DASHBOARD: 'Panel Ana Səhifə',
  'ANA SƏHİFƏ': 'Ana Səhifə / Naviqasiya / Footer',
  'SAYT MƏZMUNU': 'Ana Səhifə / Naviqasiya / Footer',
  'HAQQIMIZDA': 'Haqqımızda',
  'XƏBƏRLƏR': 'Xəbərlər',
  'TƏDBİRLƏR': 'Tədbirlər',
  'SÜRÜCÜLƏR': 'Sürücülər',
  QALEREYA: 'Qalereya',
  QAYDALAR: 'Qaydalar',
  'ƏLAQƏ': 'Əlaqə',
  'ADMİN HESABLARI': 'İstifadəçi İdarəsi',
  'SİSTEM AYARLARI': 'Sistem Ayarları',
  SOSYAL: 'Sosyal',
  'WHATSAPP INTEGRATION': 'WhatsApp Integration',
  'MƏXFİLİK SİYASƏTİ': 'PRIVACY POLICY',
  'XİDMƏT ŞƏRTLƏRİ': 'TERMS OF SERVICE',
};

const childTitleMap: Record<string, string> = {
  'Ümumi Görünüş': 'Ana Səhifə Blokları',
  'Naviqasiya': 'Menyu və Naviqasiya',
  'Giriş Hissəsi': 'Hero Bölməsi',
  'Sürüşən Yazı': 'Marquee Yazısı',
  'Sayt Sonu': 'Footer',
  'Xəbər Siyahısı': 'Xəbər Məzmunu',
  'Xəbər Səhifəsi': 'Xəbər Səhifəsi Mətni',
  'Tədbir Təqvimi': 'Tədbir Siyahısı',
  'Tədbir Səhifəsi': 'Tədbir Səhifəsi Mətni',
  'Sürücü Reytinqi': 'Sürücü Cədvəli',
  'Sürücülər Səhifəsi': 'Sürücülər Səhifəsi Mətni',
};

const prettifyItem = (item: SidebarItem): SidebarItem => {
  const title = titleMap[item.title] || item.title;
  return {
    ...item,
    title,
    children: item.children?.map((child) => ({
      ...child,
      title: childTitleMap[child.title] || child.title,
    })),
  };
};

const sanitizeMenuPath = (path?: string) => {
  if (!path) return path;
  if (path === '/frontend-settings' || path === '/admin/frontend-settings') {
    return '/general-settings?tab=general';
  }
  if (path === '/general-settings' || path === '/admin/general-settings') {
    return '/general-settings?tab=general';
  }
  return path;
};

const sanitizeSitemapItem = (item: SidebarItem): SidebarItem => ({
  ...item,
  path: sanitizeMenuPath(item.path),
  children: item.children?.map(sanitizeSitemapItem),
});

const mergeChildren = (children: SidebarItem[] = []) => {
  const merged = new Map<string, SidebarItem>();
  children.forEach((child) => {
    const key = `${normalizeText(child.title || '')}|${normalizeText((child as any).path || '')}`;
    if (!key) return;
    merged.set(key, child);
  });
  return Array.from(merged.values());
};

interface SitemapSignatureItem {
  title: string;
  path: string;
  icon: string;
  badgeText: string;
  badgeColor: string;
  children: SitemapSignatureItem[];
}

const serializeSitemapItem = (item: SidebarItem): SitemapSignatureItem => ({
  title: item.title || '',
  path: item.path || '',
  icon: item.icon || '',
  badgeText: item.badge?.text || '',
  badgeColor: item.badge?.color || '',
  children: Array.isArray(item.children) ? item.children.map(serializeSitemapItem) : []
});

const buildSitemapSignature = (items: SidebarItem[]) =>
  JSON.stringify((items || []).map(serializeSitemapItem));

const isSystemSettingsItem = (item: SidebarItem) => {
  const titleKey = normalizeText(item?.title || '');
  const pathKey = normalizeText(sanitizeMenuPath((item as any)?.path) || '');
  return (
    titleKey === 'sistem ayarlari' ||
    pathKey === '/frontend-settings' ||
    pathKey === '/admin/frontend-settings' ||
    pathKey === '/general-settings' ||
    pathKey === '/admin/general-settings' ||
    pathKey.startsWith('/general-settings?')
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [sitemap, setSitemap] = useState<SidebarItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [adminLanguage, setAdminLanguage] = useState<AdminLanguage>(() => getStoredAdminLanguage());
  const sitemapSignatureRef = useRef('');

  const uiText = {
    loading: adminLanguage === 'ru' ? 'Загрузка...' : 'Yüklənir...',
    notFound: adminLanguage === 'ru' ? 'Страница не найдена' : 'Səhifə tapılmadı'
  };

  const handleLanguageChange = (lang: AdminLanguage) => {
    setAdminLanguage(lang);
    setStoredAdminLanguage(lang);
  };

  useEffect(() => {
    document.documentElement.lang = adminLanguage === 'ru' ? 'ru' : 'az';
  }, [adminLanguage]);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem(ADMIN_USER_KEY);
    const token = getAuthToken();

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearAdminSession();
        setUser(null);
      }
    } else {
      clearAdminSession();
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = getAuthToken();
      if (!token) {
        clearAdminSession();
        return;
      }

      try {
        let nextUnreadCount = unreadCount;
        // Fetch unread count
        const unreadRes = await fetch('/api/applications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (unreadRes.status === 401 || unreadRes.status === 403) {
          clearAdminSession();
          return;
        }
        if (unreadRes.ok) {
          const { count } = await unreadRes.json();
          nextUnreadCount = Number(count) || 0;
          setUnreadCount(nextUnreadCount);
        }

        // Fetch sitemap
        const response = await fetch(`/api/sitemap?v=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          let items = Array.isArray(data) ? data : [];

          items = items
            .map((item: SidebarItem) => prettifyItem(item))
            .map((item: SidebarItem) => sanitizeSitemapItem(item));

          // Inject "Müraciətlər" item if not present
          const hasApplications = items.find((i: any) => i.path === '/applications');
          if (!hasApplications) {
            items = [
              ...items,
              {
                title: 'Müraciətlər',
                path: '/applications',
                icon: 'Inbox',
                badge: nextUnreadCount > 0 ? { text: nextUnreadCount.toString(), color: 'bg-red-500' } : undefined
              }
            ];
          } else if (nextUnreadCount > 0) {
            hasApplications.badge = { text: nextUnreadCount.toString(), color: 'bg-red-500' };
          } else {
            delete hasApplications.badge;
          }

          // Ensure a single canonical "Sistem Ayarları" item with required children.
          const requiredSystemChildren: SidebarItem[] = [
            { title: 'SEO Ayarları', path: '/general-settings?tab=seo', icon: 'Globe' },
            { title: 'Ümumi Parametrlər', path: '/general-settings?tab=general', icon: 'Sliders' },
            { title: 'Əlaqə və Sosial', path: '/general-settings?tab=contact', icon: 'Phone' },
            { title: 'WhatsApp Integration', path: '/general-settings?tab=whatsapp', icon: 'Phone' },
            { title: 'Marquee Ayarları', path: '/general-settings?tab=marquee', icon: 'Activity' },
            { title: 'Tətbiq Ayarları', path: '/general-settings?tab=stats', icon: 'Activity' },
            { title: 'Gizlənən Ayarlar', path: '/general-settings?tab=hidden', icon: 'Eye' },
          ];

          const systemCandidates = items.filter((item) => isSystemSettingsItem(item));
          items = items.filter((item) => !isSystemSettingsItem(item));

          const mergedSystemChildren = mergeChildren([
            ...requiredSystemChildren,
            ...systemCandidates.flatMap((item) => item.children || [])
          ]);

          const canonicalSystemItem: SidebarItem = {
            title: 'Sistem Ayarları',
            icon: 'Settings',
            path: '/general-settings?tab=general',
            children: mergedSystemChildren
          };

          const adminIdx = items.findIndex((item) => normalizeText((item as any).path || '') === '/users-management');
          if (adminIdx >= 0) {
            items.splice(adminIdx + 1, 0, canonicalSystemItem);
          } else {
            items.push(canonicalSystemItem);
          }

          // Add a direct top-level shortcut for social media links editing.
          const hasSocialShortcut = items.some((item) =>
            normalizeText(item.title || '') === 'sosyal' ||
            normalizeText(sanitizeMenuPath(item.path) || '') === '/general-settings?tab=social'
          );

          if (!hasSocialShortcut) {
            const socialShortcut: SidebarItem = {
              title: 'Sosyal',
              icon: 'Globe',
              path: '/general-settings?tab=social'
            };

            const settingsIdx = items.findIndex((item) =>
              normalizeText(item.title || '') === 'sistem ayarlari' ||
              normalizeText(sanitizeMenuPath(item.path) || '') === '/general-settings?tab=general'
            );
            const applicationsIdx = items.findIndex((item) =>
              normalizeText(item.path || '') === '/applications'
            );

            if (settingsIdx >= 0) {
              items.splice(settingsIdx + 1, 0, socialShortcut);
            } else if (applicationsIdx >= 0) {
              items.splice(applicationsIdx, 0, socialShortcut);
            } else {
              items.push(socialShortcut);
            }
          }

          const hasWhatsAppShortcut = items.some((item) =>
            normalizeText(item.title || '') === 'whatsapp integration' ||
            normalizeText(sanitizeMenuPath(item.path) || '') === '/general-settings?tab=whatsapp'
          );

          if (!hasWhatsAppShortcut) {
            const whatsappShortcut: SidebarItem = {
              title: 'WhatsApp Integration',
              icon: 'Phone',
              path: '/general-settings?tab=whatsapp'
            };

            const socialIdx = items.findIndex((item) =>
              normalizeText(sanitizeMenuPath(item.path) || '') === '/general-settings?tab=social'
            );
            const settingsIdx = items.findIndex((item) =>
              normalizeText(item.title || '') === 'sistem ayarlari' ||
              normalizeText(sanitizeMenuPath(item.path) || '') === '/general-settings?tab=general'
            );
            const applicationsIdx = items.findIndex((item) =>
              normalizeText(item.path || '') === '/applications'
            );

            if (socialIdx >= 0) {
              items.splice(socialIdx + 1, 0, whatsappShortcut);
            } else if (settingsIdx >= 0) {
              items.splice(settingsIdx + 1, 0, whatsappShortcut);
            } else if (applicationsIdx >= 0) {
              items.splice(applicationsIdx, 0, whatsappShortcut);
            } else {
              items.push(whatsappShortcut);
            }
          }

          const ensureShortcut = (shortcut: SidebarItem, preferredAfterTitles: string[] = []) => {
            const pathKey = normalizeText(sanitizeMenuPath(shortcut.path) || '');
            const titleKey = normalizeText(shortcut.title || '');
            const exists = items.some((item) =>
              normalizeText(item.title || '') === titleKey ||
              normalizeText(sanitizeMenuPath(item.path) || '') === pathKey
            );
            if (exists) return;

            const preferredIdx = items.findIndex((item) => {
              const t = normalizeText(item.title || '');
              return preferredAfterTitles.some((candidate) => t === normalizeText(candidate));
            });
            if (preferredIdx >= 0) {
              items.splice(preferredIdx + 1, 0, shortcut);
              return;
            }

            const applicationsIdx = items.findIndex((item) =>
              normalizeText(item.path || '') === '/applications'
            );
            if (applicationsIdx >= 0) {
              items.splice(applicationsIdx, 0, shortcut);
              return;
            }

            items.push(shortcut);
          };

          ensureShortcut(
            { title: 'PRIVACY POLICY', icon: 'FileText', path: '/?page=privacypolicypage' },
            ['Qaydalar', 'QAYDALAR']
          );
          ensureShortcut(
            { title: 'TERMS OF SERVICE', icon: 'FileText', path: '/?page=termsofservicepage' },
            ['PRIVACY POLICY']
          );

          // Final guard against duplicate top-level menu names.
          const dedupedByTitle = new Map<string, SidebarItem>();
          for (const item of items) {
            const titleKey = normalizeText(item.title || '');
            if (!titleKey) continue;
            const existing = dedupedByTitle.get(titleKey);
            if (!existing) {
              dedupedByTitle.set(titleKey, { ...item, children: mergeChildren(item.children || []) });
              continue;
            }

            dedupedByTitle.set(titleKey, {
              ...existing,
              path: existing.path || item.path,
              icon: existing.icon || item.icon,
              badge: existing.badge || item.badge,
              children: mergeChildren([...(existing.children || []), ...(item.children || [])])
            });
          }

          const nextSitemap = Array.from(dedupedByTitle.values());
          const nextSignature = buildSitemapSignature(nextSitemap);
          if (nextSignature !== sitemapSignatureRef.current) {
            sitemapSignatureRef.current = nextSignature;
            setSitemap(nextSitemap);
          }
        }
      } catch (err) {
        console.error('Fetch data failed', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Keep sidebar stable: do not auto-refresh sitemap on an interval.
    return undefined;
  }, [user]);

  if (isLoading) {
    return <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      alignItems: 'center', justifyContent: 'center',
      background: '#f4f6f9', color: '#3b82f6',
      fontSize: '1.2rem', fontWeight: '600'
    }}>{uiText.loading}</div>;
  }

  const isSitemapEmpty = !sitemap || sitemap.length === 0;

  return (
    <Router basename={import.meta.env.PROD ? '/admin' : '/'}>
      <div className="app-container">
        <AdminAutoTranslate language={adminLanguage} />
        <Toaster containerStyle={{ zIndex: 10001 }} position="top-right" reverseOrder={false} />
        {!user ? (
          <Login onLogin={setUser} language={adminLanguage} onLanguageChange={handleLanguageChange} />
        ) : (
          <>
            <Sidebar menuItems={sitemap} user={user} onLogout={() => {
              clearAdminSession();
              setUser(null);
            }} language={adminLanguage} onLanguageChange={handleLanguageChange} />
            <main className="main-content">
              <Header user={user} language={adminLanguage} />
              <div className="content-body">
                <Routes>
                  {isSitemapEmpty ? (
                    <Route path="*" element={<SetupGuide language={adminLanguage} />} />
                  ) : (
                    <>
                      <Route path="/" element={<VisualEditor />} />

                      <Route path="/applications" element={<ApplicationsManager />} />

                      <Route path="/general-settings" element={<GeneralSettings />} />

                      <Route path="/users-management" element={<UsersManager currentUser={user} />} />

                      <Route path="*" element={<div className="fade-in"><h1>{uiText.notFound}</h1></div>} />
                    </>
                  )}
                </Routes>
              </div>
            </main>
          </>
        )}
      </div>
    </Router>
  );
};

export default App;
