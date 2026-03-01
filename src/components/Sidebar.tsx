import React, { useEffect, useMemo } from 'react';
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
import './Sidebar.css';

interface SidebarProps {
    menuItems: SidebarItem[];
    user: any;
    onLogout: () => void;
    language: AdminLanguage;
    onLanguageChange: (lang: AdminLanguage) => void;
}

type SidebarGroupKey = 'content' | 'legal' | 'management';

const Sidebar: React.FC<SidebarProps> = ({ menuItems, user, onLogout, language, onLanguageChange }) => {
    const userRole = user?.role || 'secondary';
    const location = useLocation();
    const normalizeText = (value: string) =>
        (value || '')
            .toLocaleLowerCase('az')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

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
        if (path.startsWith('/users-management') || path.startsWith('/general-settings') || path.startsWith('/applications')) return 'management';
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
        if (path.startsWith('/applications')) return 140;

        return 999;
    };

    const groupLabels: Record<SidebarGroupKey, string> = {
        content: getSidebarUiLabel(language, 'groupContent'),
        legal: getSidebarUiLabel(language, 'groupLegal'),
        management: getSidebarUiLabel(language, 'groupManagement')
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

    useEffect(() => {
        const w = window as any;
        w.gtranslateSettings = {
            default_language: 'az',
            languages: ['az', 'ru', 'en'],
            wrapper_selector: '.gtranslate_wrapper',
            flag_size: 24,
            flag_style: '3d'
        };

        const scriptId = 'gtranslate-flags-script';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.gtranslate.net/widgets/latest/flags.js';
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="brand-logo">
                    <div className="logo-mark">
                        <Hexagon className="logo-icon" size={22} fill="currentColor" />
                    </div>
                    <span className="brand-name">
                        <strong>FORSAJ</strong>
                        <span>PANEL</span>
                    </span>
                    <div className="sidebar-gtranslate">
                        <div className="gtranslate_wrapper"></div>
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
                <div className="sidebar-section-label">{getSidebarUiLabel(language, 'primaryNavigation')}</div>
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
                                    return (
                                        <React.Fragment key={`${item.title}-${effectivePath || 'no-path'}`}>
                                            {renderLinkItem({ ...item, title: translatedTitle }, item.icon, effectivePath)}
                                        </React.Fragment>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
                {preparedItems.length === 0 && (
                    <div className="empty-sidebar-msg">
                        <p>{getSidebarUiLabel(language, 'emptyMenu')}</p>
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout}>
                    <LogOut size={18} />
                    <span>{getSidebarUiLabel(language, 'logout')}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
