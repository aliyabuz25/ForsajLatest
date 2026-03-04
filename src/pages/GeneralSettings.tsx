import React, { useState, useEffect } from 'react';
import { Globe, Image as ImageIcon, BarChart3, Save, Upload, Mail, Eye, EyeOff, Activity, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import './GeneralSettings.css';

const HIDDEN_SETTINGS_STORAGE_KEY = 'forsaj_general_hidden_cards';
const PAGE_DEFAULT_TITLES: Record<string, string> = {
    general: 'SİSTEM AYARLARI',
    marquee: 'MARQUEE'
};
const SOCIAL_FIELD_IDS = ['SOCIAL_INSTAGRAM', 'SOCIAL_YOUTUBE', 'SOCIAL_FACEBOOK'] as const;
const DEFAULT_WHATSAPP_API_ENDPOINT = 'https://hubmsgpanel.octotech.az/api/message';
const DEFAULT_WHATSAPP_API_KEY = '037ed90b2bcc903c7f15d33003d6b99c';
const SETTINGS_NAV_ITEMS = [
    { id: 'seo-basic', label: 'SEO əsas' },
    { id: 'seo-social', label: 'OG / Twitter' },
    { id: 'seo-verify', label: 'Təsdiq kodları' },
    { id: 'contact-details', label: 'Əlaqə' },
    { id: 'departments', label: 'Şöbə e-poçtları' },
    { id: 'smtp-settings', label: 'SMTP' },
    { id: 'branding', label: 'Brendinq' },
    { id: 'social-links', label: 'Sosial linklər' },
    { id: 'whatsapp-settings', label: 'WhatsApp' },
    { id: 'marquee-settings', label: 'Marquee' },
    { id: 'stats', label: 'Statistika' }
] as const;

const normalizeExternalUrl = (rawValue: string) => {
    const value = (rawValue || '').trim();
    if (!value) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;
    if (/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(value)) return `https://${value}`;
    return value;
};

const GeneralSettings: React.FC = () => {
    const [pages, setPages] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [showWhatsAppApiKey, setShowWhatsAppApiKey] = useState(false);
    const [hiddenCards, setHiddenCards] = useState<string[]>(() => {
        try {
            const rawValue = localStorage.getItem(HIDDEN_SETTINGS_STORAGE_KEY);
            const parsed = rawValue ? JSON.parse(rawValue) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const location = useLocation();
    const activeTab = new URLSearchParams(location.search).get('tab');
    const isHiddenTab = activeTab === 'hidden';

    const isCardHidden = (sectionId: string) => hiddenCards.includes(sectionId);
    const shouldRenderCard = (sectionId: string) => isHiddenTab ? isCardHidden(sectionId) : !isCardHidden(sectionId);
    const getCardClassName = (sectionId: string) =>
        `settings-card shadow-sm${shouldRenderCard(sectionId) ? '' : ' settings-card-hidden'}`;

    const hideCard = (sectionId: string) => {
        setHiddenCards((prev) => prev.includes(sectionId) ? prev : [...prev, sectionId]);
    };

    const restoreCard = (sectionId: string) => {
        setHiddenCards((prev) => prev.filter((id) => id !== sectionId));
    };

    const renderCardAction = (sectionId: string) => {
        const hidden = isCardHidden(sectionId);
        const isRestoreAction = isHiddenTab && hidden;

        return (
            <button
                type="button"
                className="card-visibility-btn"
                onClick={() => (hidden ? restoreCard(sectionId) : hideCard(sectionId))}
                title={isRestoreAction ? 'Kartı geri gətir' : 'Kartı gizlət'}
                aria-label={isRestoreAction ? 'Kartı geri gətir' : 'Kartı gizlət'}
            >
                {isRestoreAction ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
        );
    };

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/site-content');
            if (!res.ok) throw new Error('site-content fetch failed');
            const data = await res.json();
            setPages(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Ayarlar yüklənərkən xəta baş verdi');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        localStorage.setItem(HIDDEN_SETTINGS_STORAGE_KEY, JSON.stringify(hiddenCards));
    }, [hiddenCards]);

    useEffect(() => {
        if (isLoading) return;
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');

        const tabToSection: Record<string, string> = {
            seo: 'seo-basic',
            general: 'branding',
            contact: 'contact-details',
            social: 'social-links',
            whatsapp: 'whatsapp-settings',
            stats: 'stats',
            marquee: 'marquee-settings',
        };

        const section = tab ? tabToSection[tab] : '';
        if (!section) return;

        setTimeout(() => {
            const target = document.querySelector(`[data-settings-section="${section}"]`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }, [location.search, isLoading]);

    const ensurePage = (draftPages: any[], pageId: string) => {
        let pageIdx = draftPages.findIndex((p) => p.id === pageId);
        if (pageIdx === -1) {
            draftPages.push({ id: pageId, title: PAGE_DEFAULT_TITLES[pageId] || pageId.toUpperCase(), sections: [], images: [], active: true });
            pageIdx = draftPages.length - 1;
        }
        if (!Array.isArray(draftPages[pageIdx].sections)) draftPages[pageIdx].sections = [];
        if (!Array.isArray(draftPages[pageIdx].images)) draftPages[pageIdx].images = [];
        return pageIdx;
    };

    const updateField = (id: string, value: string, isImage: boolean = false, pageId: string = 'general') => {
        const newPages = [...pages];
        const pageIdx = ensurePage(newPages, pageId);

        if (isImage) {
            const imgIdx = newPages[pageIdx].images.findIndex((img: any) => img.id === id);
            if (imgIdx === -1) {
                newPages[pageIdx].images.push({ id, path: value, alt: id, type: 'local' });
            } else {
                newPages[pageIdx].images[imgIdx].path = value;
            }
        } else {
            const secIdx = newPages[pageIdx].sections.findIndex((sec: any) => sec.id === id);
            if (secIdx === -1) {
                newPages[pageIdx].sections.push({ id, type: 'text', label: id, value });
            } else {
                newPages[pageIdx].sections[secIdx].value = value;
            }
        }
        setPages(newPages);
    };

    const getFieldValue = (id: string, isImage: boolean = false, pageId: string = 'general') => {
        const page = pages.find((p) => p.id === pageId);
        if (!page) return '';
        const sections = Array.isArray(page.sections) ? page.sections : [];
        const images = Array.isArray(page.images) ? page.images : [];
        if (isImage) {
            return images.find((img: any) => img.id === id)?.path || '';
        }
        return sections.find((sec: any) => sec.id === id)?.value || '';
    };

    const getPageActive = (pageId: string, fallback: boolean = true) => {
        const page = pages.find((p) => p.id === pageId);
        if (!page || page.active === undefined) return fallback;
        return Boolean(page.active);
    };

    const setPageActive = (pageId: string, active: boolean) => {
        const newPages = [...pages];
        const pageIdx = ensurePage(newPages, pageId);
        newPages[pageIdx].active = active;
        setPages(newPages);
    };

    const getMarqueeTextValue = () => {
        const marqueePage = pages.find((p) => p.id === 'marquee');
        if (!marqueePage) return '';
        return (
            marqueePage.sections?.find((sec: any) => sec.id === 'MARQUEE_TEXT')?.value ||
            marqueePage.sections?.[0]?.value ||
            ''
        );
    };

    const updateMarqueeTextValue = (value: string) => {
        const newPages = [...pages];
        const pageIdx = ensurePage(newPages, 'marquee');
        const sections = newPages[pageIdx].sections;
        const explicitIdx = sections.findIndex((sec: any) => sec.id === 'MARQUEE_TEXT');

        if (explicitIdx >= 0) {
            sections[explicitIdx].value = value;
        } else if (sections.length > 0) {
            sections[0].value = value;
        } else {
            sections.push({ id: 'MARQUEE_TEXT', type: 'text', label: 'MARQUEE_TEXT', value });
        }
        setPages(newPages);
    };

    const getMarqueeSectionValue = (id: string) => {
        const marqueePage = pages.find((p) => p.id === 'marquee');
        if (!marqueePage) return '';
        return marqueePage.sections?.find((sec: any) => sec.id === id)?.value || '';
    };

    const setMarqueeSectionValue = (id: string, value: string) => {
        const newPages = [...pages];
        const pageIdx = ensurePage(newPages, 'marquee');
        const sections = newPages[pageIdx].sections;
        const sectionIdx = sections.findIndex((sec: any) => sec.id === id);

        if (sectionIdx >= 0) {
            sections[sectionIdx].value = value;
        } else {
            sections.push({ id, type: 'text', label: id, value });
        }
        setPages(newPages);
    };

    const getMarqueeLinkValue = () => getMarqueeSectionValue('MARQUEE_LINK');
    const setMarqueeLinkValue = (value: string) => setMarqueeSectionValue('MARQUEE_LINK', value);

    const getMarqueeLinkActive = () => {
        const rawValue = (getMarqueeSectionValue('MARQUEE_LINK_ACTIVE') || '').toString().trim().toLowerCase();
        return rawValue === '1' || rawValue === 'true' || rawValue === 'yes' || rawValue === 'on';
    };

    const setMarqueeLinkActive = (active: boolean) => {
        setMarqueeSectionValue('MARQUEE_LINK_ACTIVE', active ? '1' : '0');
    };

    const getNormalizedSocialLink = (id: typeof SOCIAL_FIELD_IDS[number]) =>
        normalizeExternalUrl(getFieldValue(id));

    const sanitizeSocialLinks = (draftPages: any[]) =>
        draftPages.map((page) => {
            if (page?.id !== 'general' || !Array.isArray(page.sections)) return page;
            return {
                ...page,
                sections: page.sections.map((section: any) => {
                    if (!SOCIAL_FIELD_IDS.includes(section?.id)) return section;
                    return { ...section, value: normalizeExternalUrl(section?.value || '') };
                })
            };
        });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string, pageId: string = 'general') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        const toastId = toast.loading('Şəkil yüklənir...');

        try {
            const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('image upload failed');
            const data = await res.json();
            updateField(id, data.url, true, pageId);
            toast.success('Şəkil yükləndi', { id: toastId });
        } catch (err) {
            toast.error('Yükləmə xətası', { id: toastId });
        }
    };

    const saveChanges = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Yadda saxlanılır...');
        const payload = sanitizeSocialLinks(pages);
        setPages(payload);
        try {
            const res = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('save-content failed');
            toast.success('Ayarlar qeyd edildi!', { id: toastId });
        } catch (err) {
            toast.error('Xəta baş verdi', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const scrollToSection = (sectionId: string) => {
        const target = document.querySelector(`[data-settings-section="${sectionId}"]`);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading) return <div className="loading-state">Yüklənir...</div>;

    return (
        <div className="general-settings fade-in">
            <div className="settings-header">
                <div>
                    <h1>Sistem Ayarları</h1>
                    <p>{isHiddenTab ? 'Gizlədilmiş ayar kartları' : 'SEO, Brendinq və ümumi sayt tənzimləmələri'}</p>
                </div>
                <button className="save-btn" onClick={saveChanges} disabled={isSaving}>
                    <Save size={18} />
                    <span>Yadda Saxla</span>
                </button>
            </div>

            {isHiddenTab && hiddenCards.length === 0 && (
                <div className="hidden-settings-empty">
                    Gizlənmiş kart yoxdur. Kartları gizlətmək üçün normal görünüşdə kartın üzərinə gəlib göz ikonuna klikləyin.
                </div>
            )}

            {!isHiddenTab && (
                <div className="settings-quick-nav">
                    {SETTINGS_NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="quick-nav-btn"
                            onClick={() => scrollToSection(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="settings-grid">
                {/* SEO Section */}
                <div className={getCardClassName('seo-basic')} data-settings-section="seo-basic">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Globe size={20} className="text-blue-500" />
                                <h2>SEO və axtarış motoru</h2>
                            </div>
                            <p className="card-description">Axtarış nəticələrində görünən əsas meta məlumatlar.</p>
                        </div>
                        {renderCardAction('seo-basic')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Meta başlıq (sayt adı)</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_TITLE')}
                                onChange={(e) => updateField('SEO_TITLE', e.target.value)}
                                placeholder="Məs: Forsaj Club - Offroad & Motorsport"
                            />
                        </div>
                        <div className="field-group">
                            <label>Meta təsvir</label>
                            <textarea
                                value={getFieldValue('SEO_DESCRIPTION')}
                                onChange={(e) => updateField('SEO_DESCRIPTION', e.target.value)}
                                placeholder="Sayt haqqında qısa məlumat..."
                            />
                            <small className="field-help">Tövsiyə: 140-160 simvol arası qısa təsvir.</small>
                        </div>
                        <div className="field-group">
                            <label>Açar sözlər</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_KEYWORDS')}
                                onChange={(e) => updateField('SEO_KEYWORDS', e.target.value)}
                                placeholder="offroad, baki, yarış, mitsubishi, pajero"
                            />
                            <small className="field-help">Açar sözləri vergül ilə ayırın.</small>
                        </div>
                        <div className="field-group">
                            <label>Kanonik URL</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_CANONICAL_URL')}
                                onChange={(e) => updateField('SEO_CANONICAL_URL', e.target.value)}
                                placeholder="https://forsaj.az"
                            />
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>Robots direktivi</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_ROBOTS')}
                                    onChange={(e) => updateField('SEO_ROBOTS', e.target.value)}
                                    placeholder="index,follow"
                                />
                            </div>
                            <div className="field-group">
                                <label>Müəllif</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_AUTHOR')}
                                    onChange={(e) => updateField('SEO_AUTHOR', e.target.value)}
                                    placeholder="Forsaj Club"
                                />
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Dil (html lang)</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_LANGUAGE')}
                                onChange={(e) => updateField('SEO_LANGUAGE', e.target.value)}
                                placeholder="az"
                            />
                            <small className="field-help">Məs: `az`, `en`, `tr`.</small>
                        </div>
                    </div>
                </div>

                {/* Open Graph / Twitter SEO */}
                <div className={getCardClassName('seo-social')} data-settings-section="seo-social">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Globe size={20} className="text-cyan-500" />
                                <h2>Sosial paylaşım SEO (OG / Twitter)</h2>
                            </div>
                            <p className="card-description">Link paylaşılarkən görünən başlıq, təsvir və şəkil.</p>
                        </div>
                        {renderCardAction('seo-social')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>OG başlıq</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_OG_TITLE')}
                                onChange={(e) => updateField('SEO_OG_TITLE', e.target.value)}
                                placeholder="Sosial şəbəkə başlığı"
                            />
                        </div>
                        <div className="field-group">
                            <label>OG təsvir</label>
                            <textarea
                                value={getFieldValue('SEO_OG_DESCRIPTION')}
                                onChange={(e) => updateField('SEO_OG_DESCRIPTION', e.target.value)}
                                placeholder="Sosial şəbəkə paylaşım təsviri"
                            />
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>OG URL</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_OG_URL')}
                                    onChange={(e) => updateField('SEO_OG_URL', e.target.value)}
                                    placeholder="https://forsaj.az"
                                />
                            </div>
                            <div className="field-group">
                                <label>Twitter kart növü</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_CARD')}
                                    onChange={(e) => updateField('SEO_TWITTER_CARD', e.target.value)}
                                    placeholder="summary_large_image"
                                />
                            </div>
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>Twitter hesabı (site)</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_SITE')}
                                    onChange={(e) => updateField('SEO_TWITTER_SITE', e.target.value)}
                                    placeholder="@forsajclub"
                                />
                            </div>
                            <div className="field-group">
                                <label>Twitter müəllif</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_CREATOR')}
                                    onChange={(e) => updateField('SEO_TWITTER_CREATOR', e.target.value)}
                                    placeholder="@forsajclub"
                                />
                            </div>
                        </div>
                        <div className="field-group">
                            <label>OG şəkli</label>
                            <div className="logo-preview" style={{ minHeight: '140px' }}>
                                {getFieldValue('SEO_OG_IMAGE', true) ? (
                                    <img src={getFieldValue('SEO_OG_IMAGE', true)} alt="OG Şəkli" />
                                ) : (
                                    <div className="no-logo">OG şəkli yoxdur</div>
                                )}
                            </div>
                            <div className="form-grid two-cols" style={{ marginTop: '10px' }}>
                                <label className="upload-btn">
                                    <Upload size={14} /> Şəkil yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SEO_OG_IMAGE')} />
                                </label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_OG_IMAGE', true)}
                                    onChange={(e) => updateField('SEO_OG_IMAGE', e.target.value, true)}
                                    placeholder="https://forsaj.az/og-cover.jpg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Section */}
                <div className={getCardClassName('seo-verify')} data-settings-section="seo-verify">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <BarChart3 size={20} className="text-violet-500" />
                                <h2>Axtarış motoru təsdiqləri</h2>
                            </div>
                            <p className="card-description">Google, Bing və Yandex üçün doğrulama kodları.</p>
                        </div>
                        {renderCardAction('seo-verify')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Google təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_GOOGLE_VERIFICATION')}
                                onChange={(e) => updateField('SEO_GOOGLE_VERIFICATION', e.target.value)}
                                placeholder="google-site-verification kodu"
                            />
                        </div>
                        <div className="field-group">
                            <label>Bing təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_BING_VERIFICATION')}
                                onChange={(e) => updateField('SEO_BING_VERIFICATION', e.target.value)}
                                placeholder="msvalidate.01 kodu"
                            />
                        </div>
                        <div className="field-group">
                            <label>Yandex təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_YANDEX_VERIFICATION')}
                                onChange={(e) => updateField('SEO_YANDEX_VERIFICATION', e.target.value)}
                                placeholder="yandex-verification kodu"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Details Section */}
                <div className={getCardClassName('contact-details')} data-settings-section="contact-details">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <ImageIcon size={20} className="text-red-500" />
                                <h2>Əlaqə & Ünvan Məlumatları</h2>
                            </div>
                            <p className="card-description">Footer və əlaqə hissəsində görünən ofis və əlaqə məlumatları.</p>
                        </div>
                        {renderCardAction('contact-details')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Baş Ofis Ünvan (Sətir 1)</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_ADDRESS_1')}
                                onChange={(e) => updateField('CONTACT_ADDRESS_1', e.target.value)}
                                placeholder="Məs: AZADLIQ 102, BAKI"
                            />
                        </div>
                        <div className="field-group">
                            <label>Baş Ofis Ünvan (Sətir 2)</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_ADDRESS_2')}
                                onChange={(e) => updateField('CONTACT_ADDRESS_2', e.target.value)}
                                placeholder="Məs: AZƏRBAYCAN // SECTOR_01"
                            />
                        </div>
                        <div className="field-group">
                            <label>İş Saatları</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_HOURS')}
                                onChange={(e) => updateField('CONTACT_HOURS', e.target.value)}
                                placeholder="Məs: 09:00 - 18:00"
                            />
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>Əlaqə Nömrəsi</label>
                                <input
                                    type="text"
                                    value={getFieldValue('CONTACT_PHONE')}
                                    onChange={(e) => updateField('CONTACT_PHONE', e.target.value)}
                                    placeholder="+994 50 000 00 00"
                                />
                            </div>
                            <div className="field-group">
                                <label>Əlaqə E-poçtu</label>
                                <input
                                    type="text"
                                    value={getFieldValue('CONTACT_EMAIL')}
                                    onChange={(e) => updateField('CONTACT_EMAIL', e.target.value)}
                                    placeholder="info@forsaj.az"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department Emails Section */}
                <div className={getCardClassName('departments')} data-settings-section="departments">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Mail size={20} className="text-purple-500" />
                                <h2>Şöbə E-poçtları</h2>
                            </div>
                            <p className="card-description">Müraciətlərin istiqamətinə uyğun e-poçt ünvanları.</p>
                        </div>
                        {renderCardAction('departments')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Baş Ofis (HQ)</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_HQ_EMAIL')}
                                onChange={(e) => updateField('DEPT_HQ_EMAIL', e.target.value)}
                                placeholder="hq@forsaj.az"
                            />
                        </div>
                        <div className="field-group">
                            <label>Media və PR</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_PR_EMAIL')}
                                onChange={(e) => updateField('DEPT_PR_EMAIL', e.target.value)}
                                placeholder="pr@forsaj.az"
                            />
                        </div>
                        <div className="field-group">
                            <label>Texniki Dəstək</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_TECH_EMAIL')}
                                onChange={(e) => updateField('DEPT_TECH_EMAIL', e.target.value)}
                                placeholder="tech@forsaj.az"
                            />
                        </div>
                    </div>
                </div>

                {/* SMTP Section */}
                <div className={getCardClassName('smtp-settings')} data-settings-section="smtp-settings">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Mail size={20} className="text-emerald-500" />
                                <h2>SMTP Bildiriş Ayarları</h2>
                            </div>
                            <p className="card-description">Form müraciətləri göndəriləndə e-poçt bildirişi üçün SMTP məlumatları.</p>
                        </div>
                        {renderCardAction('smtp-settings')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>SMTP aktiv</label>
                            <select
                                value={getFieldValue('SMTP_ENABLED') || '1'}
                                onChange={(e) => updateField('SMTP_ENABLED', e.target.value)}
                            >
                                <option value="1">Aktiv</option>
                                <option value="0">Deaktiv</option>
                            </select>
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>SMTP Host</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SMTP_HOST')}
                                    onChange={(e) => updateField('SMTP_HOST', e.target.value)}
                                    placeholder="smtp.gmail.com"
                                />
                            </div>
                            <div className="field-group">
                                <label>SMTP Port</label>
                                <input
                                    type="number"
                                    value={getFieldValue('SMTP_PORT') || '587'}
                                    onChange={(e) => updateField('SMTP_PORT', e.target.value)}
                                    placeholder="587"
                                />
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Təhlükəsizlik (SSL/TLS)</label>
                            <select
                                value={getFieldValue('SMTP_SECURE') || '0'}
                                onChange={(e) => updateField('SMTP_SECURE', e.target.value)}
                            >
                                <option value="0">Yox (STARTTLS/587)</option>
                                <option value="1">Bəli (SSL/465)</option>
                            </select>
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>SMTP istifadəçi</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SMTP_USER')}
                                    onChange={(e) => updateField('SMTP_USER', e.target.value)}
                                    placeholder="noreply@forsaj.az"
                                />
                            </div>
                            <div className="field-group">
                                <label>SMTP şifrə / app password</label>
                                <div className="social-input-row">
                                    <input
                                        type={showSmtpPassword ? 'text' : 'password'}
                                        value={getFieldValue('SMTP_PASS')}
                                        onChange={(e) => updateField('SMTP_PASS', e.target.value)}
                                        placeholder="********"
                                    />
                                    <button
                                        type="button"
                                        className="social-test-link"
                                        onClick={() => setShowSmtpPassword((prev) => !prev)}
                                    >
                                        {showSmtpPassword ? 'Gizlət' : 'Göstər'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="form-grid two-cols">
                            <div className="field-group">
                                <label>Göndərən ünvanı (From)</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SMTP_FROM')}
                                    onChange={(e) => updateField('SMTP_FROM', e.target.value)}
                                    placeholder="Forsaj Club <noreply@forsaj.az>"
                                />
                            </div>
                            <div className="field-group">
                                <label>Qəbul edən ünvan(lar) (To)</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SMTP_TO')}
                                    onChange={(e) => updateField('SMTP_TO', e.target.value)}
                                    placeholder="admin@forsaj.az, support@forsaj.az"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branding Section */}
                <div className={getCardClassName('branding')} data-settings-section="branding">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <ImageIcon size={20} className="text-orange-500" />
                                <h2>Brendinq & Loqo</h2>
                            </div>
                            <p className="card-description">Light/Dark loqoları yükləyin, görünüşü dərhal önizləyin.</p>
                        </div>
                        {renderCardAction('branding')}
                    </div>
                    <div className="card-body">
                        <div className="logo-upload-grid">
                            <div className="logo-box">
                                <label>Əsas Loqo (Light)</label>
                                <div className="logo-preview">
                                    {getFieldValue('SITE_LOGO_LIGHT', true) ? (
                                        <img src={getFieldValue('SITE_LOGO_LIGHT', true)} alt="Logo Light" />
                                    ) : (
                                        <div className="no-logo">Loqo yoxdur</div>
                                    )}
                                </div>
                                <label className="upload-btn">
                                    <Upload size={14} /> Yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SITE_LOGO_LIGHT')} />
                                </label>
                            </div>
                            <div className="logo-box">
                                <label>Alternativ Loqo (Dark)</label>
                                <div className="logo-preview dark-bg">
                                    {getFieldValue('SITE_LOGO_DARK', true) ? (
                                        <img src={getFieldValue('SITE_LOGO_DARK', true)} alt="Logo Dark" />
                                    ) : (
                                        <div className="no-logo">Loqo yoxdur</div>
                                    )}
                                </div>
                                <label className="upload-btn">
                                    <Upload size={14} /> Yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SITE_LOGO_DARK')} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className={getCardClassName('social-links')} data-settings-section="social-links">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Globe size={20} className="text-pink-500" />
                                <h2>Sosial Media Linkləri</h2>
                            </div>
                            <p className="card-description">Sosial hesabları daxil edin və “Test et” ilə yoxlayın.</p>
                        </div>
                        {renderCardAction('social-links')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Instagram</label>
                            <div className="social-input-row">
                                <input
                                    type="text"
                                    value={getFieldValue('SOCIAL_INSTAGRAM')}
                                    onChange={(e) => updateField('SOCIAL_INSTAGRAM', e.target.value)}
                                    placeholder="https://instagram.com/forsajclub"
                                />
                                <a
                                    href={getNormalizedSocialLink('SOCIAL_INSTAGRAM') || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`social-test-link${getNormalizedSocialLink('SOCIAL_INSTAGRAM') ? '' : ' disabled'}`}
                                    onClick={(e) => {
                                        if (!getNormalizedSocialLink('SOCIAL_INSTAGRAM')) e.preventDefault();
                                    }}
                                >
                                    Test et
                                </a>
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Youtube</label>
                            <div className="social-input-row">
                                <input
                                    type="text"
                                    value={getFieldValue('SOCIAL_YOUTUBE')}
                                    onChange={(e) => updateField('SOCIAL_YOUTUBE', e.target.value)}
                                    placeholder="https://youtube.com/@forsajclub"
                                />
                                <a
                                    href={getNormalizedSocialLink('SOCIAL_YOUTUBE') || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`social-test-link${getNormalizedSocialLink('SOCIAL_YOUTUBE') ? '' : ' disabled'}`}
                                    onClick={(e) => {
                                        if (!getNormalizedSocialLink('SOCIAL_YOUTUBE')) e.preventDefault();
                                    }}
                                >
                                    Test et
                                </a>
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Facebook</label>
                            <div className="social-input-row">
                                <input
                                    type="text"
                                    value={getFieldValue('SOCIAL_FACEBOOK')}
                                    onChange={(e) => updateField('SOCIAL_FACEBOOK', e.target.value)}
                                    placeholder="https://facebook.com/forsajclub"
                                />
                                <a
                                    href={getNormalizedSocialLink('SOCIAL_FACEBOOK') || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`social-test-link${getNormalizedSocialLink('SOCIAL_FACEBOOK') ? '' : ' disabled'}`}
                                    onClick={(e) => {
                                        if (!getNormalizedSocialLink('SOCIAL_FACEBOOK')) e.preventDefault();
                                    }}
                                >
                                    Test et
                                </a>
                            </div>
                            <small className="field-help">
                                Domen ilə başlayan linklərdə (`instagram.com/...`) `https://` avtomatik əlavə ediləcək.
                            </small>
                        </div>
                    </div>
                </div>

                {/* WhatsApp Integration Section */}
                <div className={getCardClassName('whatsapp-settings')} data-settings-section="whatsapp-settings">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <MessageCircle size={20} className="text-green-500" />
                                <h2>WhatsApp Integration</h2>
                            </div>
                            <p className="card-description">Sürücü qeydiyyat müraciətlərində WhatsApp bildirişlərini HubMSG API ilə idarə edin.</p>
                        </div>
                        {renderCardAction('whatsapp-settings')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>WhatsApp bildirişləri</label>
                            <select
                                value={getFieldValue('WHATSAPP_ENABLED') || '1'}
                                onChange={(e) => updateField('WHATSAPP_ENABLED', e.target.value)}
                            >
                                <option value="1">Aktiv</option>
                                <option value="0">Deaktiv</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label>API Endpoint</label>
                            <input
                                type="text"
                                value={getFieldValue('WHATSAPP_API_ENDPOINT') || DEFAULT_WHATSAPP_API_ENDPOINT}
                                onChange={(e) => updateField('WHATSAPP_API_ENDPOINT', e.target.value)}
                                placeholder={DEFAULT_WHATSAPP_API_ENDPOINT}
                            />
                        </div>
                        <div className="field-group">
                            <label>API Key</label>
                            <div className="social-input-row">
                                <input
                                    type={showWhatsAppApiKey ? 'text' : 'password'}
                                    value={getFieldValue('WHATSAPP_API_KEY') || DEFAULT_WHATSAPP_API_KEY}
                                    onChange={(e) => updateField('WHATSAPP_API_KEY', e.target.value)}
                                    placeholder="x-api-key"
                                />
                                <button
                                    type="button"
                                    className="social-test-link"
                                    onClick={() => setShowWhatsAppApiKey((prev) => !prev)}
                                >
                                    {showWhatsAppApiKey ? 'Gizlət' : 'Göstər'}
                                </button>
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Təşkilatçı WhatsApp nömrələri</label>
                            <input
                                type="text"
                                value={getFieldValue('WHATSAPP_ORGANIZER_TO')}
                                onChange={(e) => updateField('WHATSAPP_ORGANIZER_TO', e.target.value)}
                                placeholder="994551234567, 994501112233"
                            />
                            <small className="field-help">Bir neçə nömrə üçün vergül istifadə edin. Ölkə kodu ilə daxil edin.</small>
                        </div>
                    </div>
                </div>

                {/* Marquee Section */}
                <div className={getCardClassName('marquee-settings')} data-settings-section="marquee-settings">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <Activity size={20} className="text-amber-500" />
                                <h2>Marquee Ayarları</h2>
                            </div>
                            <p className="card-description">Ana səhifənin üst hissəsindəki hərəkətli elan xəttini idarə edin.</p>
                        </div>
                        {renderCardAction('marquee-settings')}
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    checked={getPageActive('marquee', true)}
                                    onChange={(e) => setPageActive('marquee', e.target.checked)}
                                />
                                <span>Marquee aktivdir (səhifədə göstər)</span>
                            </label>
                        </div>
                        <div className="field-group">
                            <label>Marquee mətni</label>
                            <textarea
                                value={getMarqueeTextValue()}
                                onChange={(e) => updateMarqueeTextValue(e.target.value)}
                                placeholder="Məs: FORSAJ CLUB // OFFROAD MOTORSPORT HUB"
                            />
                        </div>
                        <div className="field-group">
                            <label>Link əlavə et</label>
                            <input
                                type="text"
                                value={getMarqueeLinkValue()}
                                onChange={(e) => setMarqueeLinkValue(e.target.value)}
                                placeholder="Məs: /events və ya https://forsaj.az/events"
                            />
                        </div>
                        <div className="field-group">
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    checked={getMarqueeLinkActive()}
                                    onChange={(e) => setMarqueeLinkActive(e.target.checked)}
                                />
                                <span>Link aktivdir (aktiv/deaktiv)</span>
                            </label>
                        </div>
                        <div className="field-group">
                            <label>Marquee arxa plan şəkli</label>
                            <div className="logo-preview" style={{ minHeight: '90px' }}>
                                {getFieldValue('marquee-image', true, 'marquee') ? (
                                    <img src={getFieldValue('marquee-image', true, 'marquee')} alt="Marquee Background" />
                                ) : (
                                    <div className="no-logo">Arxa plan şəkli yoxdur</div>
                                )}
                            </div>
                            <div className="form-grid two-cols" style={{ marginTop: '10px' }}>
                                <label className="upload-btn">
                                    <Upload size={14} /> Şəkil yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'marquee-image', 'marquee')} />
                                </label>
                                <input
                                    type="text"
                                    value={getFieldValue('marquee-image', true, 'marquee')}
                                    onChange={(e) => updateField('marquee-image', e.target.value, true, 'marquee')}
                                    placeholder="https://forsaj.az/marquee-bg.jpg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className={getCardClassName('stats')} data-settings-section="stats">
                    <div className="card-header">
                        <div className="card-title-wrap">
                            <div className="card-title-row">
                                <BarChart3 size={20} className="text-green-500" />
                                <h2>Sayt Statistikaları</h2>
                            </div>
                            <p className="card-description">Ana səhifədə göstərilən qısa statistik göstəricilər.</p>
                        </div>
                        {renderCardAction('stats')}
                    </div>
                    <div className="card-body">
                        <div className="stats-edit-grid">
                            <div className="field-group">
                                <label>Pilot Sayı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_PILOTS')}
                                    onChange={(e) => updateField('STATS_PILOTS', e.target.value)}
                                    placeholder="Susmaya görə: 140+"
                                />
                            </div>
                            <div className="field-group">
                                <label>Yarış Sayı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_RACES')}
                                    onChange={(e) => updateField('STATS_RACES', e.target.value)}
                                    placeholder="Susmaya görə: 50+"
                                />
                            </div>
                            <div className="field-group">
                                <label>Gənc İştirakçı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_YOUTH')}
                                    onChange={(e) => updateField('STATS_YOUTH', e.target.value)}
                                    placeholder="Susmaya görə: 20+"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GeneralSettings;
