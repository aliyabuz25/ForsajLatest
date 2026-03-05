import { useState, useEffect } from 'react';

interface ContentSection {
    id: string;
    type: 'text' | 'image';
    label: string;
    value: string;
    url?: string;
}

interface ImageSection {
    id: string;
    path: string;
    alt: string;
    type: 'local' | 'remote';
}

interface PageContent {
    id: string;
    title: string;
    active?: boolean;
    sections: ContentSection[];
    images: ImageSection[];
}

interface LocalizationEntry {
    AZ?: string;
    RU?: string;
    ENG?: string;
}

type LocalizationPageMap = Record<string, LocalizationEntry>;
type LocalizationMap = Record<string, LocalizationPageMap>;
type LocalizationValueIndex = Record<string, LocalizationEntry>;

let siteContentCache: PageContent[] | null = null;
let siteContentInFlight: Promise<PageContent[]> | null = null;
let siteContentCacheAt = 0;
let localizationCache: LocalizationMap | null = null;
let localizationValueIndexCache: LocalizationValueIndex | null = null;
let localizationInFlight: Promise<LocalizationMap> | null = null;
const CACHE_TTL_MS = 60000;
const CONTENT_VERSION_KEY = 'forsaj_site_content_version';
const SITE_LANG_KEY = 'forsaj_site_lang';
type SiteLang = 'AZ' | 'RU' | 'ENG';
const FETCH_OPTIONS: RequestInit = {
    cache: 'default'
};

const normalizeSiteLanguage = (rawValue?: string | null): SiteLang => {
    const value = String(rawValue || '').trim().toUpperCase();
    if (value === 'RU') return 'RU';
    if (value === 'ENG' || value === 'EN') return 'ENG';
    return 'AZ';
};

const normalizeContent = (data: any): PageContent[] => {
    if (!Array.isArray(data)) return [];
    return data.map((p: any) => ({
        id: String(p?.page_id || p?.id || '').toLowerCase(),
        title: p?.title || '',
        active: typeof p?.active === 'boolean' ? p.active : true,
        sections: Array.isArray(p?.sections) ? p.sections : [],
        images: Array.isArray(p?.images) ? p.images : []
    }));
};

const extractSiteContentResource = (payload: any) => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        const resource = payload?.resources?.['site-content'];
        if (Array.isArray(resource)) return resource;
    }
    return [];
};

const normalizeToken = (value: string) =>
    (value || '')
        .toLocaleLowerCase('az')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '');

const isKeyLikeValue = (value?: string) => /^[A-Z0-9_]+$/.test((value || '').trim());

const stripLanguageAffixes = (rawKey: string | number) => {
    const key = String(rawKey || '').trim();
    if (!key) return '';

    const suffixes = ['_RU', '_RUS', '.ru', '.rus', '_ENG', '_EN', '.eng', '.en'];
    for (const suffix of suffixes) {
        if (key.endsWith(suffix)) {
            return key.slice(0, -suffix.length);
        }
    }

    const prefixes = ['RU_', 'RUS_', 'ENG_', 'EN_'];
    for (const prefix of prefixes) {
        if (key.startsWith(prefix)) {
            return key.slice(prefix.length);
        }
    }

    return key;
};

const buildLanguageCandidates = (rawKey: string | number, lang: SiteLang) => {
    const key = String(rawKey || '').trim();
    if (!key) return [];
    if (lang === 'AZ') return [key];
    if (lang === 'RU') {
        return [
            `${key}_RU`,
            `RU_${key}`,
            `${key}.ru`,
            `${key}_RUS`,
            `RUS_${key}`,
            `${key}.rus`,
            key
        ];
    }
    return [
        `${key}_ENG`,
        `ENG_${key}`,
        `${key}.eng`,
        `${key}_EN`,
        `EN_${key}`,
        `${key}.en`,
        key
    ];
};

const buildLocalizationCandidates = (rawKey: string | number, lang: SiteLang) => {
    const key = String(rawKey || '').trim();
    if (!key) return [];

    const base = stripLanguageAffixes(key);
    const candidates = [
        key,
        base,
        ...buildLanguageCandidates(base || key, lang)
    ];

    return [...new Set(candidates.map(normalizeToken).filter(Boolean))];
};

const normalizeLocalization = (payload: any): LocalizationMap => {
    const source = payload?.pages && typeof payload.pages === 'object' ? payload.pages : payload;
    if (!source || typeof source !== 'object') return {};

    const normalized: LocalizationMap = {};
    for (const [rawPageId, rawPageValues] of Object.entries(source as Record<string, any>)) {
        const pageId = String(rawPageId || '').trim().toLowerCase();
        if (!pageId || !rawPageValues || typeof rawPageValues !== 'object') continue;

        const pageMap: LocalizationPageMap = {};
        for (const [rawKey, rawEntry] of Object.entries(rawPageValues as Record<string, any>)) {
            const normalizedKey = normalizeToken(stripLanguageAffixes(rawKey));
            if (!normalizedKey) continue;

            const entry = rawEntry && typeof rawEntry === 'object'
                ? rawEntry
                : { AZ: String(rawEntry || '') };

            pageMap[normalizedKey] = {
                AZ: String(entry.AZ ?? entry.az ?? ''),
                RU: String(entry.RU ?? entry.ru ?? ''),
                ENG: String(entry.ENG ?? entry.EN ?? entry.en ?? '')
            };
        }

        normalized[pageId] = pageMap;
    }

    return normalized;
};

const getEntryValue = (entry: LocalizationEntry, lang: SiteLang) => {
    if (lang === 'AZ') return String(entry.AZ || '').trim();
    if (lang === 'RU') return String(entry.RU || '').trim();
    return String(entry.ENG || '').trim();
};

const scoreEntryValue = (entry: LocalizationEntry, lang: SiteLang) => {
    const az = String(entry.AZ || '').trim();
    const translated = getEntryValue(entry, lang);
    if (!translated) return 0;
    if (!az) return 2;
    return normalizeToken(az) === normalizeToken(translated) ? 1 : 2;
};

const buildLocalizationValueIndex = (localization: LocalizationMap): LocalizationValueIndex => {
    const index: LocalizationValueIndex = {};

    for (const pageMap of Object.values(localization)) {
        for (const entry of Object.values(pageMap)) {
            const az = String(entry.AZ || '').trim();
            const normalizedAz = normalizeToken(az);
            if (!normalizedAz) continue;

            const existing = index[normalizedAz];
            if (!existing) {
                index[normalizedAz] = {
                    AZ: az,
                    RU: String(entry.RU || '').trim(),
                    ENG: String(entry.ENG || '').trim()
                };
                continue;
            }

            if (!existing.AZ && az) existing.AZ = az;

            if (scoreEntryValue(entry, 'RU') > scoreEntryValue(existing, 'RU')) {
                existing.RU = String(entry.RU || '').trim();
            }
            if (scoreEntryValue(entry, 'ENG') > scoreEntryValue(existing, 'ENG')) {
                existing.ENG = String(entry.ENG || '').trim();
            }
        }
    }

    return index;
};

const resolveLocalizedText = (
    localization: LocalizationMap,
    localizationValueIndex: LocalizationValueIndex,
    pageId: string,
    key: string | number,
    lang: SiteLang,
    defaultValue: string
) => {
    if (lang === 'AZ' || typeof key === 'number') return '';

    const pageMap = localization[pageId.toLowerCase()];
    if (!pageMap) return '';

    const keyCandidates = buildLocalizationCandidates(key, lang);
    for (const normalizedKey of keyCandidates) {
        const entry = pageMap[normalizedKey];
        if (!entry) continue;

        const preferred = (lang === 'RU' ? entry.RU : entry.ENG) || entry.AZ || '';
        const value = String(preferred || '').trim();
        if (!value) continue;

        const normalizedValue = normalizeToken(value);
        const normalizedEntryAz = normalizeToken(String(entry.AZ || '').trim());
        if (isKeyLikeValue(value) && keyCandidates.includes(normalizedValue)) continue;

        if (lang !== 'AZ' && normalizedEntryAz && normalizedEntryAz === normalizedValue) {
            const byEntryAz = localizationValueIndex[normalizedEntryAz];
            if (byEntryAz) {
                const byEntryAzValue = String((lang === 'RU' ? byEntryAz.RU : byEntryAz.ENG) || '').trim();
                if (byEntryAzValue && normalizeToken(byEntryAzValue) !== normalizedValue) {
                    return byEntryAzValue;
                }
            }
        }

        if (defaultValue && normalizeToken(defaultValue) === normalizedValue) {
            const byDefault = localizationValueIndex[normalizeToken(defaultValue)];
            if (byDefault) {
                const byDefaultValue = String((lang === 'RU' ? byDefault.RU : byDefault.ENG) || '').trim();
                if (byDefaultValue && normalizeToken(byDefaultValue) !== normalizedValue) {
                    return byDefaultValue;
                }
            }
            return value;
        }
        return value;
    }

    if (defaultValue && !isKeyLikeValue(defaultValue)) {
        const normalizedDefault = normalizeToken(defaultValue);
        const byValue = localizationValueIndex[normalizedDefault];
        if (byValue) {
            const preferred = (lang === 'RU' ? byValue.RU : byValue.ENG) || byValue.AZ || '';
            const value = String(preferred || '').trim();
            if (value) return value;
        }
    }

    return '';
};

const findSectionByKey = (sections: ContentSection[], key: string | number, lang: SiteLang) => {
    const candidates = buildLanguageCandidates(key, lang);
    if (candidates.length === 0) return undefined;
    const normalizedCandidates = candidates.map(normalizeToken);

    return sections.find((section) => {
        const sectionId = normalizeToken(section.id || '');
        const sectionLabel = normalizeToken(section.label || '');
        return normalizedCandidates.some((candidate) =>
            sectionId === candidate ||
            sectionLabel === candidate ||
            sectionLabel === normalizeToken(`KEY: ${candidate}`)
        );
    });
};

const findSectionByFallback = (sections: ContentSection[], fallbackValue: string) => {
    const target = normalizeToken(fallbackValue || '');
    if (!target) return undefined;
    return sections.find((section) =>
        normalizeToken(section.value || '') === target || normalizeToken(section.label || '') === target
    );
};

const fetchSiteContentOnce = async (): Promise<PageContent[]> => {
    if (siteContentCache && Date.now() - siteContentCacheAt < CACHE_TTL_MS) return siteContentCache;
    if (siteContentInFlight) return siteContentInFlight;

    siteContentInFlight = (async () => {
        const version = localStorage.getItem(CONTENT_VERSION_KEY) || '';
        let data: any[] = [];
        let loadedFromStruct = false;

        try {
            const structResponse = await fetch(
                `/api/site-new-struct?v=${encodeURIComponent(version)}`,
                FETCH_OPTIONS
            );
            if (structResponse.ok) {
                const struct = await structResponse.json();
                const fromStruct = extractSiteContentResource(struct);
                if (Array.isArray(fromStruct)) {
                    data = fromStruct;
                    loadedFromStruct = true;
                }
            }
        } catch {
            // fallback handled below
        }

        if (!loadedFromStruct) {
            const response = await fetch(
                `/api/site-content?v=${encodeURIComponent(version)}`,
                FETCH_OPTIONS
            );
            if (!response.ok) throw new Error('Failed to fetch site content');
            data = await response.json();
        }

        const normalized = normalizeContent(data);
        siteContentCache = normalized;
        siteContentCacheAt = Date.now();
        return normalized;
    })().finally(() => {
        siteContentInFlight = null;
    });

    return siteContentInFlight;
};

const fetchLocalizationOnce = async (): Promise<LocalizationMap> => {
    if (localizationCache) return localizationCache;
    if (localizationInFlight) return localizationInFlight;

    localizationInFlight = (async () => {
        try {
            const apiResponse = await fetch('/api/localization', FETCH_OPTIONS);
            if (apiResponse.ok) {
                const payload = await apiResponse.json();
                const normalized = normalizeLocalization(payload);
                localizationCache = normalized;
                localizationValueIndexCache = buildLocalizationValueIndex(normalized);
                return normalized;
            }

            const staticResponse = await fetch('/localization.json', FETCH_OPTIONS);
            if (!staticResponse.ok) return {};
            const payload = await staticResponse.json();
            const normalized = normalizeLocalization(payload);
            localizationCache = normalized;
            localizationValueIndexCache = buildLocalizationValueIndex(normalized);
            return normalized;
        } catch {
            return {};
        }
    })().finally(() => {
        localizationInFlight = null;
    });

    return localizationInFlight;
};

export const useSiteContent = (scopePageId?: string) => {
    const [content, setContent] = useState<PageContent[]>([]);
    const [localization, setLocalization] = useState<LocalizationMap>(() => localizationCache || {});
    const [localizationValueIndex, setLocalizationValueIndex] = useState<LocalizationValueIndex>(() => localizationValueIndexCache || {});
    const [isLoading, setIsLoading] = useState(true);
    const [language, setLanguage] = useState<SiteLang>(() =>
        normalizeSiteLanguage(localStorage.getItem(SITE_LANG_KEY))
    );

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                const [mapped, localized] = await Promise.all([
                    siteContentCache ? Promise.resolve(siteContentCache) : fetchSiteContentOnce(),
                    fetchLocalizationOnce()
                ]);
                if (!isMounted) return;
                setContent(mapped);
                setLocalization(localized);
                setLocalizationValueIndex(localizationValueIndexCache || buildLocalizationValueIndex(localized));
            } catch (err) {
                console.error('Failed to load site content from API:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadContent();

        const refresh = () => {
            siteContentCache = null;
            siteContentCacheAt = 0;
            fetchSiteContentOnce()
                .then((mapped) => {
                    if (!isMounted) return;
                    setContent(mapped);
                    setIsLoading(false);
                })
                .catch((err) => console.error('Failed to refresh site content from storage event:', err));
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === SITE_LANG_KEY) {
                setLanguage(normalizeSiteLanguage(event.newValue));
                return;
            }
            if (event.key !== CONTENT_VERSION_KEY) return;
            refresh();
        };

        const onLangChange = () => {
            setLanguage(normalizeSiteLanguage(localStorage.getItem(SITE_LANG_KEY)));
        };

        const onVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            const staleFor = Date.now() - siteContentCacheAt;
            if (staleFor > 60000) {
                refresh();
            }
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener('forsaj-language-changed', onLangChange as EventListener);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            isMounted = false;
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('forsaj-language-changed', onLangChange as EventListener);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const getPage = (id: string) => {
        if (!id) return undefined;
        return (content as PageContent[]).find(p => p.id === id.toLowerCase());
    };

    const getText = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let sectionIdOrIndex: string | number;
        let defaultValue: string;

        if (scopePageId) {
            // Usage: getText(key, default)
            pageId = scopePageId;
            sectionIdOrIndex = arg1;
            defaultValue = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            // Usage: getText(pageId, key, default)
            pageId = arg1;
            sectionIdOrIndex = arg2 as string | number;
            defaultValue = arg3;
        }

        if (!pageId) return defaultValue;

        if (typeof sectionIdOrIndex !== 'number') {
            const localized = resolveLocalizedText(
                localization,
                localizationValueIndex,
                pageId,
                sectionIdOrIndex,
                language,
                defaultValue
            );
            if (localized) return localized;
        }

        const page = getPage(pageId);
        if (!page) return defaultValue;
        const sections = Array.isArray(page.sections) ? page.sections : [];

        let section = typeof sectionIdOrIndex === 'number'
            ? sections[sectionIdOrIndex]
            : findSectionByKey(sections, sectionIdOrIndex, language);

        if (!section && typeof sectionIdOrIndex !== 'number' && defaultValue) {
            section = findSectionByFallback(sections, defaultValue);
        }

        if (!section) return defaultValue;
        const value = String(section.value || '');
        const keyCandidates = buildLanguageCandidates(sectionIdOrIndex, language).map(v => v.toUpperCase());
        const resolved = isKeyLikeValue(value) && keyCandidates.includes(value.toUpperCase())
            ? defaultValue
            : (value || defaultValue);

        return resolved;
    };

    const getImage = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let imageIdOrIndex: string | number;
        let defaultPath: string;

        if (scopePageId) {
            pageId = scopePageId;
            imageIdOrIndex = arg1;
            defaultPath = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            pageId = arg1;
            imageIdOrIndex = arg2 as string | number;
            defaultPath = arg3;
        }

        if (!pageId) return { path: defaultPath, alt: '' };

        const page = getPage(pageId);
        if (!page) return { path: defaultPath, alt: '' };
        const images = Array.isArray(page.images) ? page.images : [];

        const image = typeof imageIdOrIndex === 'number'
            ? images[imageIdOrIndex]
            : images.find(img => normalizeToken(img.id || '') === normalizeToken(String(imageIdOrIndex)));

        if (image) return { path: image.path, alt: image.alt };
        if (images.length > 0) return { path: images[0].path || defaultPath, alt: images[0].alt || '' };
        return { path: defaultPath, alt: '' };
    };

    const getUrl = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let sectionIdOrIndex: string | number;
        let defaultUrl: string;

        if (scopePageId) {
            pageId = scopePageId;
            sectionIdOrIndex = arg1;
            defaultUrl = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            pageId = arg1;
            sectionIdOrIndex = arg2 as string | number;
            defaultUrl = arg3;
        }

        if (!pageId) return defaultUrl;

        const page = getPage(pageId);
        if (!page) return defaultUrl;
        const sections = Array.isArray(page.sections) ? page.sections : [];

        const section = typeof sectionIdOrIndex === 'number'
            ? sections[sectionIdOrIndex]
            : findSectionByKey(sections, sectionIdOrIndex, language);

        return section?.url || defaultUrl;
    };

    const setSiteLanguage = (next: SiteLang) => {
        const lang = normalizeSiteLanguage(next);
        localStorage.setItem(SITE_LANG_KEY, lang);
        setLanguage(lang);
        window.dispatchEvent(new CustomEvent('forsaj-language-changed'));
    };

    return { content, isLoading, getPage, getText, getImage, getUrl, language, setSiteLanguage };
};
