import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Layout,
    Home,
    Menu,
    Maximize,
    Type,
    Star,
    Anchor,
    Info,
    FileText,
    List,
    Calendar,
    Clock,
    Trophy,
    Award,
    Image,
    Video,
    BookOpen,
    Phone,
    Users,
    Monitor,
    Inbox,
    Settings,
    Globe,
    Eye,
    Activity,
    Hexagon,
    LogOut
} from 'lucide-react';
import type { SidebarItem } from '../types/navigation';
import type { AdminLanguage } from '../utils/adminLanguage';
import { getSidebarUiLabel, translateSidebarTitle } from '../utils/adminLanguage';
import {
    getAdminSidebarLocalizedText,
    parseAdminSidebarLocalization,
    type SidebarLocalizationMap
} from '../utils/sidebarLocalization';
import './Sidebar.css';

interface SidebarProps {
    menuItems: SidebarItem[];
    user: any;
    onLogout: () => void;
    language: AdminLanguage;
    onLanguageChange: (lang: AdminLanguage) => void;
}

type SidebarGroupKey = 'content' | 'legal' | 'management';
type SidebarUiLabelKey = 'primaryNavigation' | 'groupContent' | 'groupLegal' | 'groupManagement' | 'emptyMenu' | 'logout';

const SIDEBAR_UI_LOCALIZATION_KEYS: Record<SidebarUiLabelKey, string> = {
    primaryNavigation: 'ADMIN_SIDEBAR_PRIMARY_NAVIGATION',
    groupContent: 'ADMIN_SIDEBAR_GROUP_CONTENT',
    groupLegal: 'ADMIN_SIDEBAR_GROUP_LEGAL',
    groupManagement: 'ADMIN_SIDEBAR_GROUP_MANAGEMENT',
    emptyMenu: 'ADMIN_SIDEBAR_EMPTY_MENU',
    logout: 'ADMIN_SIDEBAR_LOGOUT'
};

const normalizeSidebarLookupText = (value: string) =>
    (value || '')
        .toLocaleLowerCase('az')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ə/g, 'e')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ğ/g, 'g')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .trim();

const normalizeSidebarPathKey = (path?: string) => {
    const raw = String(path || '').trim().toLocaleLowerCase('az');
    if (!raw) return '';
    if (raw === '/admin') return '/';
    if (raw.startsWith('/admin?')) return `/${raw.slice('/admin'.length)}`;
    if (raw.startsWith('/admin/')) return raw.slice('/admin'.length);
    return raw;
};

const getSidebarItemLocalizationKey = (title: string, path?: string) => {
    const pathKey = normalizeSidebarPathKey(path);

    if (pathKey.includes('page=home')) return 'ADMIN_SIDEBAR_HOME';
    if (pathKey.includes('page=about')) return 'ADMIN_SIDEBAR_ABOUT';
    if (pathKey.includes('mode=news')) return 'ADMIN_SIDEBAR_NEWS';
    if (pathKey.includes('mode=events')) return 'ADMIN_SIDEBAR_EVENTS';
    if (pathKey.includes('mode=drivers')) return 'ADMIN_SIDEBAR_DRIVERS';
    if (pathKey.includes('mode=videos')) return 'ADMIN_SIDEBAR_GALLERY';
    if (pathKey.includes('page=rulespage')) return 'ADMIN_SIDEBAR_RULES';
    if (pathKey.includes('page=contactpage')) return 'ADMIN_SIDEBAR_CONTACT';
    if (pathKey.includes('page=privacypolicypage')) return 'ADMIN_SIDEBAR_PRIVACY_POLICY';
    if (pathKey.includes('page=termsofservicepage')) return 'ADMIN_SIDEBAR_TERMS_OF_SERVICE';
    if (pathKey.startsWith('/users-management')) return 'ADMIN_SIDEBAR_USER_MANAGEMENT';
    if (pathKey.includes('tab=general')) return 'ADMIN_SIDEBAR_SYSTEM_SETTINGS';
    if (pathKey.includes('tab=social')) return 'ADMIN_SIDEBAR_SOCIAL_MEDIA';
    if (pathKey.includes('tab=whatsapp')) return 'ADMIN_SIDEBAR_WHATSAPP';
    if (pathKey.startsWith('/translations')) return 'ADMIN_SIDEBAR_TRANSLATIONS';
    if (pathKey.startsWith('/applications')) return 'ADMIN_SIDEBAR_APPLICATIONS';

    const titleKey = normalizeSidebarLookupText(title);
    if (titleKey === 'ana sehife' || titleKey === 'ana sehife / naviqasiya / footer') return 'ADMIN_SIDEBAR_HOME';
    if (titleKey === 'haqqimizda') return 'ADMIN_SIDEBAR_ABOUT';
    if (titleKey === 'xeberler') return 'ADMIN_SIDEBAR_NEWS';
    if (titleKey === 'tedbirler') return 'ADMIN_SIDEBAR_EVENTS';
    if (titleKey === 'suruculer') return 'ADMIN_SIDEBAR_DRIVERS';
    if (titleKey === 'qalereya') return 'ADMIN_SIDEBAR_GALLERY';
    if (titleKey === 'qaydalar') return 'ADMIN_SIDEBAR_RULES';
    if (titleKey === 'elaqe') return 'ADMIN_SIDEBAR_CONTACT';
    if (titleKey === 'privacy policy') return 'ADMIN_SIDEBAR_PRIVACY_POLICY';
    if (titleKey === 'terms of service') return 'ADMIN_SIDEBAR_TERMS_OF_SERVICE';
    if (titleKey === 'istifadeci idaresi') return 'ADMIN_SIDEBAR_USER_MANAGEMENT';
    if (titleKey === 'sistem ayarlari') return 'ADMIN_SIDEBAR_SYSTEM_SETTINGS';
    if (titleKey === 'sosial media' || titleKey === 'sosyal') return 'ADMIN_SIDEBAR_SOCIAL_MEDIA';
    if (titleKey === 'whatsapp integration') return 'ADMIN_SIDEBAR_WHATSAPP';
    if (titleKey === 'translations') return 'ADMIN_SIDEBAR_TRANSLATIONS';
    if (titleKey === 'muracietler') return 'ADMIN_SIDEBAR_APPLICATIONS';

    return '';
};

const Sidebar: React.FC<SidebarProps> = ({ menuItems, user, onLogout, language, onLanguageChange }) => {
    const userRole = user?.role || 'secondary';
    const location = useLocation();
    const [sidebarLocalization, setSidebarLocalization] = useState<SidebarLocalizationMap>({});
    const normalizeText = (value: string) =>
        (value || '')
            .toLocaleLowerCase('az')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    useEffect(() => {
        let cancelled = false;

        const loadSidebarLocalization = async () => {
            try {
                const response = await fetch('/api/localization', { cache: 'no-store' });
                if (!response.ok) return;
                const data: unknown = await response.json();
                const normalized = parseAdminSidebarLocalization(data);
                if (!cancelled) {
                    setSidebarLocalization(normalized);
                }
            } catch {
                // keep static fallback labels
            }
        };

        void loadSidebarLocalization();
        return () => {
            cancelled = true;
        };
    }, []);

    const getLocalizedSidebarUiLabel = (key: SidebarUiLabelKey) =>
        getAdminSidebarLocalizedText(
            sidebarLocalization,
            SIDEBAR_UI_LOCALIZATION_KEYS[key],
            language,
            getSidebarUiLabel(language, key)
        );

    const normalizePath = (path?: string) => {
        if (!path) return path;
        if (path === '/frontend-settings' || path === '/admin/frontend-settings') {
            return '/general-settings?tab=general';
        }
        if (path === '/general-settings' || path === '/admin/general-settings') {
            return '/general-settings?tab=general';
        }
        return path;
    };

    const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
        Layout,
        Home,
        Menu,
        Maximize,
        Type,
        Star,
        Anchor,
        Info,
        FileText,
        List,
        Calendar,
        Clock,
        Trophy,
        Award,
        Image,
        Video,
        BookOpen,
        Phone,
        Users,
        Monitor,
        Inbox,
        Settings,
        Globe,
        Eye,
        Activity
    };

    const IconComponent = ({ name, className }: { name: string; className?: string }) => {
        const Icon = iconMap[name];
        if (!Icon) return <Layout className={className} size={18} />;
        return <Icon className={className} size={18} />;
    };

    // Better active check including query params
    const isCurrentActive = (path?: string) => {
        const normalizedPath = normalizePath(path);
        if (!normalizedPath) return false;
        if (normalizedPath.includes('?')) {
            return (location.pathname + location.search) === normalizedPath;
        }
        return location.pathname === normalizedPath;
    };

    const renderLinkItem = (item: SidebarItem, parentIcon?: string, forcedPath?: string) => (
        <li className="sidebar-item">
            <NavLink
                to={normalizePath(forcedPath || item.path) || '#'}
                className={() => `sidebar-link ${isCurrentActive(normalizePath(forcedPath || item.path)) ? 'active' : ''}`}
            >
                {(item.icon || parentIcon) && <IconComponent name={item.icon || parentIcon || ''} className="sidebar-icon" />}
                <span className="sidebar-text">{item.title}</span>
                {item.badge && (
                    <span className={`badge ${item.badge.color} sidebar-badge`}>
                        {item.badge.text}
                    </span>
                )}
            </NavLink>
        </li>
    );

    const filterByRole = (items: SidebarItem[]): SidebarItem[] => {
        const restrictedPaths = ['/frontend-settings', '/general-settings', '/users-management'];
        const hiddenRootPaths = new Set(['/', '/admin']);

        const filtered = items
            .map((item) => {
                const children = item.children ? filterByRole(item.children) : undefined;
                const normalizedPath = normalizePath(item.path);
                const normalizedPathKey = (normalizedPath || '').toLowerCase();
                const normalizedTitle = normalizeText(item.title || '');

                if (userRole === 'secondary') {
                    const isRestricted = restrictedPaths.some(p => normalizedPath?.toLowerCase().startsWith(p));
                    if (isRestricted) return null;
                }

                if (
                    hiddenRootPaths.has(normalizedPathKey) ||
                    normalizedTitle === 'panel ana sehife' ||
                    normalizedTitle === 'dashboard'
                ) {
                    return null;
                }

                // If parent has no direct path and all children are filtered out, hide it.
                if (!normalizedPath && (!children || children.length === 0)) return null;

                return { ...item, path: normalizedPath, children };
            })
            .filter(Boolean) as SidebarItem[];

        return filtered;
    };

    const dedupeMenuItems = (items: SidebarItem[]) => {
        const seenTitles = new Set<string>();

        return items.filter((item) => {
            const key = normalizeText(item.title || '');
            if (!key) return false;
            if (seenTitles.has(key)) return false;
            seenTitles.add(key);
            return true;
        });
    };

    const getFriendlyTitle = (title: string) => {
        const key = normalizeText(title);
        if (key === 'ana sehife / naviqasiya / footer') return 'Ana Səhifə';
        if (key === 'sosyal') return 'Sosial Media';
        return title;
    };

    const getGroupKey = (item: SidebarItem): SidebarGroupKey => {
        const path = normalizePath(item.path || '') || '';
        if (path.includes('page=privacypolicypage') || path.includes('page=termsofservicepage')) return 'legal';
        if (path.startsWith('/users-management') || path.startsWith('/general-settings') || path.startsWith('/applications') || path.startsWith('/translations')) return 'management';
        return 'content';
    };

    const getItemOrder = (item: SidebarItem) => {
        const path = normalizePath(item.path || '') || '';
        const title = normalizeText(item.title || '');

        if (path.includes('page=home')) return 10;
        if (path.includes('page=about')) return 20;
        if (path.includes('mode=news')) return 30;
        if (path.includes('mode=events')) return 40;
        if (path.includes('mode=drivers')) return 50;
        if (path.includes('mode=videos')) return 60;
        if (path.includes('page=rulespage')) return 70;
        if (path.includes('page=contactpage')) return 80;
        if (path.includes('page=privacypolicypage')) return 90;
        if (path.includes('page=termsofservicepage')) return 100;
        if (path.startsWith('/users-management')) return 110;
        if (path.includes('tab=general')) return 120;
        if (path.includes('tab=social') || title === 'sosial media') return 130;
        if (path.includes('tab=whatsapp') || title === 'whatsapp integration') return 135;
        if (path.startsWith('/translations')) return 138;
        if (path.startsWith('/applications')) return 140;

        return 999;
    };

    const groupLabels: Record<SidebarGroupKey, string> = {
        content: getLocalizedSidebarUiLabel('groupContent'),
        legal: getLocalizedSidebarUiLabel('groupLegal'),
        management: getLocalizedSidebarUiLabel('groupManagement')
    };

    const preparedItems = useMemo(
        () => dedupeMenuItems(filterByRole(menuItems))
            .map((item) => ({ ...item, title: getFriendlyTitle(item.title) }))
            .sort((a, b) => getItemOrder(a) - getItemOrder(b)),
        [menuItems, userRole]
    );

    const groupedItems = useMemo(() => {
        const buckets: Record<SidebarGroupKey, SidebarItem[]> = {
            content: [],
            legal: [],
            management: []
        };
        preparedItems.forEach((item) => {
            buckets[getGroupKey(item)].push(item);
        });
        return buckets;
    }, [preparedItems]);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="brand-logo">
                    <div className="logo-mark">
                        <Hexagon className="logo-icon" size={22} fill="currentColor" />
                    </div>
                </div>
                <div className="sidebar-lang-switch" aria-label="Admin language switch">
                    <button
                        type="button"
                        className={`sidebar-lang-btn ${language === 'az' ? 'active' : ''}`}
                        onClick={() => onLanguageChange('az')}
                    >
                        AZ
                    </button>
                    <button
                        type="button"
                        className={`sidebar-lang-btn ${language === 'ru' ? 'active' : ''}`}
                        onClick={() => onLanguageChange('ru')}
                    >
                        RU
                    </button>
                </div>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section-label">{getLocalizedSidebarUiLabel('primaryNavigation')}</div>
                {(['content', 'legal', 'management'] as SidebarGroupKey[]).map((groupKey) => {
                    const items = groupedItems[groupKey];
                    if (!items.length) return null;
                    return (
                        <div key={groupKey} className="sidebar-group">
                            <div className="sidebar-section-label sidebar-subsection-label">{groupLabels[groupKey]}</div>
                            <ul className="sidebar-menu">
                                {items.map(item => {
                                    const fallbackChildPath = item.children?.find(child => !!child.path)?.path;
                                    const effectivePath = item.path || fallbackChildPath;
                                    const translatedTitle = translateSidebarTitle(item.title, effectivePath, language);
                                    const localizationKey = getSidebarItemLocalizationKey(item.title, effectivePath);
                                    const localizedTitle = localizationKey
                                        ? getAdminSidebarLocalizedText(sidebarLocalization, localizationKey, language, translatedTitle)
                                        : translatedTitle;
                                    return (
                                        <React.Fragment key={`${item.title}-${effectivePath || 'no-path'}`}>
                                            {renderLinkItem({ ...item, title: localizedTitle }, item.icon, effectivePath)}
                                        </React.Fragment>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
                {preparedItems.length === 0 && (
                    <div className="empty-sidebar-msg">
                        <p>{getLocalizedSidebarUiLabel('emptyMenu')}</p>
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout}>
                    <LogOut size={18} />
                    <span>{getLocalizedSidebarUiLabel('logout')}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
