import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Globe2, Loader2, RefreshCw, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AdminLanguage } from '../utils/adminLanguage';
import { getLocalizedText } from '../utils/adminLanguage';
import { getAuthToken } from '../utils/session';
import './TranslationsManager.css';

type SiteLanguage = 'AZ' | 'RU' | 'ENG';

interface LocalizationEntry {
    AZ: string;
    RU: string;
    ENG: string;
}

interface LocalizationPayload {
    schemaVersion: number;
    generatedAt: string;
    languages: SiteLanguage[];
    pages: Record<string, Record<string, LocalizationEntry>>;
}

interface TranslationsManagerProps {
    language: AdminLanguage;
}

const DEFAULT_PAYLOAD: LocalizationPayload = {
    schemaVersion: 1,
    generatedAt: '',
    languages: ['AZ', 'RU', 'ENG'],
    pages: {}
};

const normalizePayload = (raw: any): LocalizationPayload => {
    if (!raw || typeof raw !== 'object') return DEFAULT_PAYLOAD;

    const rawPages = raw.pages && typeof raw.pages === 'object' ? raw.pages : {};
    const pages: Record<string, Record<string, LocalizationEntry>> = {};

    for (const [rawPageId, rawEntries] of Object.entries(rawPages as Record<string, any>)) {
        const pageId = String(rawPageId || '').trim().toLowerCase();
        if (!pageId || !rawEntries || typeof rawEntries !== 'object') continue;

        const normalizedEntries: Record<string, LocalizationEntry> = {};
        for (const [rawKey, rawEntry] of Object.entries(rawEntries as Record<string, any>)) {
            const key = String(rawKey || '').trim();
            if (!key) continue;

            const entry = rawEntry && typeof rawEntry === 'object'
                ? rawEntry
                : { AZ: String(rawEntry || '') };

            normalizedEntries[key] = {
                AZ: String(entry.AZ ?? entry.az ?? ''),
                RU: String(entry.RU ?? entry.ru ?? ''),
                ENG: String(entry.ENG ?? entry.EN ?? entry.en ?? '')
            };
        }

        pages[pageId] = normalizedEntries;
    }

    return {
        schemaVersion: Number(raw.schemaVersion) || 1,
        generatedAt: String(raw.generatedAt || ''),
        languages: ['AZ', 'RU', 'ENG'],
        pages
    };
};

const hasPayloadPages = (payload: LocalizationPayload) =>
    Object.values(payload.pages || {}).some((entries) => Object.keys(entries || {}).length > 0);

const mergePayload = (base: LocalizationPayload, override: LocalizationPayload): LocalizationPayload => {
    const mergedPages: LocalizationPayload['pages'] = { ...base.pages };

    for (const [pageId, overrideEntries] of Object.entries(override.pages || {})) {
        const baseEntries = mergedPages[pageId] || {};
        const nextEntries: Record<string, LocalizationEntry> = { ...baseEntries };

        for (const [key, overrideEntry] of Object.entries(overrideEntries || {})) {
            const baseEntry = baseEntries[key] || { AZ: '', RU: '', ENG: '' };
            nextEntries[key] = {
                AZ: String(overrideEntry.AZ ?? baseEntry.AZ ?? ''),
                RU: String(overrideEntry.RU ?? baseEntry.RU ?? ''),
                ENG: String(overrideEntry.ENG ?? baseEntry.ENG ?? '')
            };
        }

        mergedPages[pageId] = nextEntries;
    }

    return {
        schemaVersion: Number(override.schemaVersion) || Number(base.schemaVersion) || 1,
        generatedAt: String(override.generatedAt || base.generatedAt || ''),
        languages: ['AZ', 'RU', 'ENG'],
        pages: mergedPages
    };
};

const prettyPageName = (pageId: string) =>
    String(pageId || '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const isUnderscorePlaceholder = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text || !text.includes('_')) return false;
    return /^[A-Za-z0-9_]+$/.test(text);
};

const shouldHideTranslationEntry = (entry?: LocalizationEntry | null) => {
    if (!entry) return false;
    return [entry.AZ, entry.RU, entry.ENG].some((value) => isUnderscorePlaceholder(value));
};

const TranslationsManager: React.FC<TranslationsManagerProps> = ({ language }) => {
    const [payload, setPayload] = useState<LocalizationPayload>(DEFAULT_PAYLOAD);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [selectedPage, setSelectedPage] = useState('');
    const [selectedLang, setSelectedLang] = useState<SiteLanguage>(language === 'ru' ? 'RU' : 'AZ');
    const [search, setSearch] = useState('');
    const [showOnlyMissing, setShowOnlyMissing] = useState(false);

    const t = {
        title: getLocalizedText(language, 'Translations', 'Переводы'),
        subtitle: getLocalizedText(language, 'Bütün localization açarlarını dilə görə buradan redaktə edin', 'Редактируйте все ключи локализации по языкам'),
        loading: getLocalizedText(language, 'Yüklənir...', 'Загрузка...'),
        save: getLocalizedText(language, 'Yadda Saxla', 'Сохранить'),
        refresh: getLocalizedText(language, 'Yenilə', 'Обновить'),
        saved: getLocalizedText(language, 'Localization yadda saxlanıldı', 'Локализация сохранена'),
        saveError: getLocalizedText(language, 'Localization saxlanarkən xəta baş verdi', 'Ошибка сохранения локализации'),
        loadError: getLocalizedText(language, 'Localization yüklənərkən xəta baş verdi', 'Ошибка загрузки локализации'),
        page: getLocalizedText(language, 'Səhifələr', 'Страницы'),
        key: getLocalizedText(language, 'Açar', 'Ключ'),
        value: getLocalizedText(language, 'Dəyər', 'Значение'),
        sourceAz: getLocalizedText(language, 'AZ mənbə mətni', 'Исходный текст AZ'),
        search: getLocalizedText(language, 'Açar və ya mətn üzrə axtar...', 'Поиск по ключу или тексту...'),
        onlyMissing: getLocalizedText(language, 'Yalnız boş olanlar', 'Только пустые'),
        noData: getLocalizedText(language, 'Məlumat tapılmadı', 'Данные не найдены'),
        noPageSelected: getLocalizedText(language, 'Səhifə seçin', 'Выберите страницу'),
        changed: getLocalizedText(language, 'Dəyişikliklər var', 'Есть несохраненные изменения'),
        upToDate: getLocalizedText(language, 'Hamısı aktualdır', 'Все изменения сохранены'),
        fillMissing: getLocalizedText(language, 'Boş xanaları AZ ilə doldur', 'Заполнить пустые значения из AZ'),
        countLabel: getLocalizedText(language, 'açar', 'ключей')
    };

    const pageIds = useMemo(
        () => Object.keys(payload.pages || {}).sort((a, b) => a.localeCompare(b, 'en')),
        [payload]
    );

    useEffect(() => {
        if (!selectedPage && pageIds.length > 0) {
            setSelectedPage(pageIds[0]);
            return;
        }
        if (selectedPage && !pageIds.includes(selectedPage) && pageIds.length > 0) {
            setSelectedPage(pageIds[0]);
        }
    }, [pageIds, selectedPage]);

    const currentEntries = useMemo(
        () => (selectedPage ? payload.pages[selectedPage] || {} : {}),
        [payload, selectedPage]
    );

    const visibleKeys = useMemo(() => {
        const query = search.trim().toLowerCase();
        return Object.keys(currentEntries)
            .sort((a, b) => a.localeCompare(b, 'en'))
            .filter((key) => {
                const entry = currentEntries[key];
                if (!entry) return false;
                if (shouldHideTranslationEntry(entry)) return false;
                const currentValue = String(entry[selectedLang] || '').trim();
                if (showOnlyMissing && currentValue) return false;
                if (!query) return true;

                const haystack = [
                    key,
                    entry.AZ,
                    entry.RU,
                    entry.ENG
                ]
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(query);
            });
    }, [currentEntries, search, selectedLang, showOnlyMissing]);

    const completion = useMemo(() => {
        const keys = Object.keys(currentEntries);
        if (!keys.length) return 0;
        const translated = keys.filter((key) => String(currentEntries[key]?.[selectedLang] || '').trim()).length;
        return Math.round((translated / keys.length) * 100);
    }, [currentEntries, selectedLang]);

    const fetchLocalization = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            let apiPayload = DEFAULT_PAYLOAD;
            const response = await fetch('/api/localization', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            if (!response.ok) throw new Error('load_failed');
            const data = await response.json();
            apiPayload = normalizePayload(data);

            let staticPayload = DEFAULT_PAYLOAD;
            try {
                const staticResponse = await fetch('/localization.json');
                if (staticResponse.ok) {
                    const staticData = await staticResponse.json();
                    staticPayload = normalizePayload(staticData);
                }
            } catch {
                // optional fallback source
            }

            const merged = hasPayloadPages(staticPayload)
                ? mergePayload(staticPayload, apiPayload)
                : apiPayload;

            setPayload(merged);
            setDirty(false);
        } catch (error) {
            console.error(error);
            toast.error(t.loadError);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocalization();
    }, []);

    const updateEntry = (key: string, value: string) => {
        if (!selectedPage) return;
        setPayload((prev) => {
            const currentPage = prev.pages[selectedPage] || {};
            const currentEntry = currentPage[key] || { AZ: '', RU: '', ENG: '' };
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [selectedPage]: {
                        ...currentPage,
                        [key]: {
                            ...currentEntry,
                            [selectedLang]: value
                        }
                    }
                }
            };
        });
        setDirty(true);
    };

    const fillMissingWithAz = () => {
        if (!selectedPage || selectedLang === 'AZ') return;
        setPayload((prev) => {
            const currentPage = prev.pages[selectedPage] || {};
            const nextPage: Record<string, LocalizationEntry> = {};
            for (const [key, entry] of Object.entries(currentPage)) {
                const currentValue = String(entry[selectedLang] || '').trim();
                nextPage[key] = {
                    ...entry,
                    [selectedLang]: currentValue ? entry[selectedLang] : entry.AZ
                };
            }
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [selectedPage]: nextPage
                }
            };
        });
        setDirty(true);
    };

    const saveLocalization = async () => {
        if (!dirty) return;
        setSaving(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/localization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('save_failed');

            const result = await response.json();
            if (result?.data) {
                setPayload(normalizePayload(result.data));
            }
            setDirty(false);
            toast.success(t.saved);
        } catch (error) {
            console.error(error);
            toast.error(t.saveError);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="translations-loading fade-in">
                <Loader2 size={22} className="spin" />
                <span>{t.loading}</span>
            </div>
        );
    }

    return (
        <div className="translations-manager fade-in">
            <div className="translations-header">
                <div>
                    <h1>{t.title}</h1>
                    <p>{t.subtitle}</p>
                </div>
                <div className="translations-header-actions">
                    <button type="button" className="btn-secondary" onClick={fetchLocalization}>
                        <RefreshCw size={16} />
                        <span>{t.refresh}</span>
                    </button>
                    <button type="button" className="btn-primary" onClick={saveLocalization} disabled={!dirty || saving}>
                        {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                        <span>{t.save}</span>
                    </button>
                </div>
            </div>

            <div className="translations-status">
                {dirty ? (
                    <span className="status-chip status-dirty">{t.changed}</span>
                ) : (
                    <span className="status-chip status-clean">
                        <CheckCircle2 size={14} />
                        {t.upToDate}
                    </span>
                )}
                <span className="status-chip">
                    <Globe2 size={14} />
                    {selectedLang}: {completion}%
                </span>
            </div>

            <div className="translations-body">
                <aside className="translations-pages">
                    <div className="panel-title">{t.page}</div>
                    <div className="page-list">
                        {pageIds.map((pageId) => {
                            const count = Object.keys(payload.pages[pageId] || {}).length;
                            return (
                                <button
                                    key={pageId}
                                    type="button"
                                    className={`page-item ${selectedPage === pageId ? 'active' : ''}`}
                                    onClick={() => setSelectedPage(pageId)}
                                >
                                    <span className="page-item-name">{prettyPageName(pageId)}</span>
                                    <span className="page-item-meta">{count} {t.countLabel}</span>
                                </button>
                            );
                        })}
                        {!pageIds.length && <div className="empty-state">{t.noData}</div>}
                    </div>
                </aside>

                <section className="translations-editor">
                    {!selectedPage ? (
                        <div className="empty-state">{t.noPageSelected}</div>
                    ) : (
                        <>
                            <div className="editor-toolbar">
                                <div className="lang-tabs">
                                    {(['AZ', 'RU', 'ENG'] as SiteLanguage[]).map((langTab) => (
                                        <button
                                            key={langTab}
                                            type="button"
                                            className={`lang-tab ${selectedLang === langTab ? 'active' : ''}`}
                                            onClick={() => setSelectedLang(langTab)}
                                        >
                                            {langTab}
                                        </button>
                                    ))}
                                </div>
                                <div className="toolbar-search">
                                    <Search size={16} />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={t.search}
                                    />
                                </div>
                                <label className="missing-toggle">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyMissing}
                                        onChange={(event) => setShowOnlyMissing(event.target.checked)}
                                    />
                                    <span>{t.onlyMissing}</span>
                                </label>
                                {selectedLang !== 'AZ' && (
                                    <button type="button" className="btn-secondary" onClick={fillMissingWithAz}>
                                        {t.fillMissing}
                                    </button>
                                )}
                            </div>

                            <div className="translation-list">
                                {!visibleKeys.length ? (
                                    <div className="empty-state">{t.noData}</div>
                                ) : (
                                    visibleKeys.map((key) => {
                                        const entry = currentEntries[key];
                                        return (
                                            <div className="translation-row" key={key}>
                                                <div className="translation-meta">
                                                    <div className="translation-key">{key}</div>
                                                    {selectedLang !== 'AZ' && (
                                                        <div className="translation-source">
                                                            <span>{t.sourceAz}</span>
                                                            <p>{entry.AZ}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="translation-input-wrap">
                                                    <label>{t.value}</label>
                                                    <textarea
                                                        value={entry[selectedLang]}
                                                        onChange={(event) => updateEntry(key, event.target.value)}
                                                        rows={selectedLang === 'AZ' ? 2 : 3}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default TranslationsManager;
