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

let siteContentCache: PageContent[] | null = null;
let siteContentInFlight: Promise<PageContent[]> | null = null;
let siteContentCacheAt = 0;
const CACHE_TTL_MS = 10000;
const CONTENT_VERSION_KEY = 'forsaj_site_content_version';
const SITE_LANG_KEY = 'forsaj_site_lang';
const TRANSLATION_CACHE_KEY = 'forsaj_free_translation_cache_v1';
type SiteLang = 'AZ' | 'RU' | 'ENG';

type TranslationStore = Record<string, Record<string, string>>;
const translationStore: TranslationStore = (() => {
    try {
        const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
        return {};
    }
})();
const translationInFlight = new Map<string, Promise<string>>();

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

const buildLanguageCandidates = (rawKey: string | number, lang: SiteLang) => {
    const key = String(rawKey || '').trim();
    if (!key) return [];
    if (lang === 'AZ') return [key];
    return [
        `${key}_${lang}`,
        `${lang}_${key}`,
        `${key}.${lang.toLowerCase()}`,
        key
    ];
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

const saveTranslationStore = () => {
    try {
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationStore));
    } catch {
        // ignore quota/storage errors
    }
};

const canAutoTranslate = (value: string) => {
    const text = (value || '').trim();
    if (!text) return false;
    if (text.length < 2) return false;
    if (/^[A-Z0-9_]+$/.test(text)) return false; // key tokens
    if (/^https?:\/\//i.test(text)) return false;
    if (/<[a-z][\s\S]*>/i.test(text)) return false; // html content
    return true;
};

const getLangCode = (lang: SiteLang) => {
    if (lang === 'RU') return 'ru';
    if (lang === 'ENG') return 'en';
    return 'az';
};

const tryMyMemory = async (text: string, target: 'ru' | 'en') => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=az|${target}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('mymemory_failed');
    const data = await response.json();
    const translated = String(data?.responseData?.translatedText || '').trim();
    if (!translated) throw new Error('mymemory_empty');
    return translated;
};

const tryLibreTranslate = async (text: string, target: 'ru' | 'en') => {
    const endpoints = [
        'https://translate.argosopentech.com/translate',
        'https://libretranslate.de/translate'
    ];
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: 'az',
                    target,
                    format: 'text'
                })
            });
            if (!response.ok) continue;
            const data = await response.json();
            const translated = String(data?.translatedText || '').trim();
            if (translated) return translated;
        } catch {
            // try next endpoint
        }
    }
    throw new Error('libre_failed');
};

const translateFree = async (text: string, lang: SiteLang): Promise<string> => {
    if (lang === 'AZ') return text;
    if (!canAutoTranslate(text)) return text;

    const target = getLangCode(lang) as 'ru' | 'en';
    const byLang = translationStore[lang] || (translationStore[lang] = {});
    if (byLang[text]) return byLang[text];

    const inFlightKey = `${lang}:${text}`;
    if (translationInFlight.has(inFlightKey)) {
        return translationInFlight.get(inFlightKey) as Promise<string>;
    }

    const promise = (async () => {
        try {
            let translated = '';
            try {
                translated = await tryMyMemory(text, target);
            } catch {
                translated = await tryLibreTranslate(text, target);
            }
            byLang[text] = translated || text;
            saveTranslationStore();
            window.dispatchEvent(new CustomEvent('forsaj-translation-updated'));
            return byLang[text];
        } catch {
            byLang[text] = text;
            return text;
        } finally {
            translationInFlight.delete(inFlightKey);
        }
    })();

    translationInFlight.set(inFlightKey, promise);
    return promise;
};

const fetchSiteContentOnce = async (): Promise<PageContent[]> => {
    if (siteContentCache && Date.now() - siteContentCacheAt < CACHE_TTL_MS) return siteContentCache;
    if (siteContentInFlight) return siteContentInFlight;

    siteContentInFlight = (async () => {
        const version = localStorage.getItem(CONTENT_VERSION_KEY) || '';
        let data: any[] = [];
        let loadedFromStruct = false;

        try {
            const structResponse = await fetch(`/api/site-new-struct?v=${encodeURIComponent(version)}`);
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
            const response = await fetch(`/api/site-content?v=${encodeURIComponent(version)}`);
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

export const useSiteContent = (scopePageId?: string) => {
    const [content, setContent] = useState<PageContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, forceUpdate] = useState(0);
    const [language, setLanguage] = useState<SiteLang>(() => {
        const saved = localStorage.getItem(SITE_LANG_KEY) as SiteLang | null;
        if (saved === 'AZ' || saved === 'RU' || saved === 'ENG') return saved;
        return 'AZ';
    });

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                if (siteContentCache) {
                    if (isMounted) setContent(siteContentCache);
                    return;
                }

                const mapped = await fetchSiteContentOnce();
                if (isMounted) setContent(mapped as any);
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
                .then((mapped) => { if (isMounted) setContent(mapped); })
                .catch((err) => console.error('Failed to refresh site content from storage event:', err));
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === SITE_LANG_KEY) {
                const next = (event.newValue || 'AZ') as SiteLang;
                if (next === 'AZ' || next === 'RU' || next === 'ENG') {
                    setLanguage(next);
                }
                return;
            }
            if (event.key !== CONTENT_VERSION_KEY) return;
            refresh();
        };

        const onLangChange = () => {
            const next = (localStorage.getItem(SITE_LANG_KEY) || 'AZ') as SiteLang;
            if (next === 'AZ' || next === 'RU' || next === 'ENG') {
                setLanguage(next);
            }
        };
        const onTranslationUpdate = () => {
            forceUpdate((x) => x + 1);
        };

        const interval = window.setInterval(() => {
            refresh();
        }, 15000);

        window.addEventListener('storage', onStorage);
        window.addEventListener('forsaj-language-changed', onLangChange as EventListener);
        window.addEventListener('forsaj-translation-updated', onTranslationUpdate as EventListener);
        return () => {
            isMounted = false;
            window.clearInterval(interval);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('forsaj-language-changed', onLangChange as EventListener);
            window.removeEventListener('forsaj-translation-updated', onTranslationUpdate as EventListener);
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

        if (language !== 'AZ' && canAutoTranslate(resolved)) {
            const cached = translationStore[language]?.[resolved];
            if (cached) return cached;
            void translateFree(resolved, language);
        }

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
        const lang = next === 'AZ' || next === 'RU' || next === 'ENG' ? next : 'AZ';
        localStorage.setItem(SITE_LANG_KEY, lang);
        setLanguage(lang);
        window.dispatchEvent(new CustomEvent('forsaj-language-changed'));
    };

    return { content, isLoading, getPage, getText, getImage, getUrl, language, setSiteLanguage };
};
