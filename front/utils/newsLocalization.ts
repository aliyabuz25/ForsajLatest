export type NewsLanguageCode = 'AZ' | 'RU' | 'ENG';
export type NewsLocalizedField = 'title' | 'category' | 'description';
export type NewsLocalizedFields = Record<NewsLocalizedField, string>;
export type NewsTranslations = Record<NewsLanguageCode, NewsLocalizedFields>;

const NEWS_LANGUAGE_CODES: NewsLanguageCode[] = ['AZ', 'RU', 'ENG'];
const NEWS_LOCALIZED_FIELDS: NewsLocalizedField[] = ['title', 'category', 'description'];
const NEWS_TRANSLATION_SOURCE_KEYS = ['translations', 'i18n', 'localized', 'localization', 'langs', 'languages'];
const NEWS_LANGUAGE_SOURCE_KEYS: Record<NewsLanguageCode, string[]> = {
  AZ: ['AZ', 'az', 'aze', 'azerbaijani', 'azerbaycanca', 'azerbaycan'],
  RU: ['RU', 'ru', 'rus', 'russian', 'russkiy'],
  ENG: ['ENG', 'EN', 'en', 'eng', 'english']
};
const NEWS_FIELD_ALIASES: Record<NewsLocalizedField, string[]> = {
  title: ['title', 'name', 'headline'],
  category: ['category', 'cat', 'type', 'tag'],
  description: ['description', 'desc', 'content', 'body', 'text', 'details']
};

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toNewsFieldString = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const normalizeKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const readObjectByKeys = (source: Record<string, any>, keys: string[]) => {
  const wanted = new Set(keys.map(normalizeKey));
  for (const [rawKey, rawValue] of Object.entries(source || {})) {
    if (!isObjectRecord(rawValue)) continue;
    if (!wanted.has(normalizeKey(rawKey))) continue;
    return rawValue;
  }
  return undefined;
};

const readStringByKeys = (source: Record<string, any>, keys: string[]) => {
  const wanted = new Set(keys.map(normalizeKey));
  for (const [rawKey, rawValue] of Object.entries(source || {})) {
    if (!wanted.has(normalizeKey(rawKey))) continue;
    const next = toNewsFieldString(rawValue);
    if (next) return next;
  }
  return '';
};

const createEmptyNewsLocalizedFields = (): NewsLocalizedFields => ({
  title: '',
  category: '',
  description: ''
});

const getLegacyNewsFieldByLanguage = (
  rawNews: Record<string, any>,
  field: NewsLocalizedField,
  lang: NewsLanguageCode
) => {
  if (lang === 'AZ') return '';

  const suffixes = lang === 'RU'
    ? ['Ru', 'RU', 'Rus', 'RUS', '_ru', '_RU', '_rus', '_RUS']
    : ['En', 'EN', 'Eng', 'ENG', '_en', '_EN', '_eng', '_ENG'];
  const fieldAliases = NEWS_FIELD_ALIASES[field] || [field];

  for (const fieldAlias of fieldAliases) {
    for (const suffix of suffixes) {
      const key = `${fieldAlias}${suffix}`;
      const value = rawNews[key];
      if (value !== undefined && value !== null && String(value) !== '') {
        return String(value);
      }
    }
  }

  return '';
};

export const normalizeNewsTranslations = (rawNews: Record<string, any> | null | undefined): NewsTranslations => {
  const source = isObjectRecord(rawNews) ? rawNews : {};
  const rawTranslations =
    readObjectByKeys(source, NEWS_TRANSLATION_SOURCE_KEYS) ||
    (isObjectRecord(source.translations) ? source.translations : {}) ||
    (isObjectRecord(source.i18n) ? source.i18n : {});

  const langSources: Partial<Record<NewsLanguageCode, Record<string, any>>> = {
    AZ: readObjectByKeys(rawTranslations, NEWS_LANGUAGE_SOURCE_KEYS.AZ),
    RU: readObjectByKeys(rawTranslations, NEWS_LANGUAGE_SOURCE_KEYS.RU),
    ENG: readObjectByKeys(rawTranslations, NEWS_LANGUAGE_SOURCE_KEYS.ENG)
  };

  const fieldSources: Partial<Record<NewsLocalizedField, Record<string, any>>> = NEWS_LOCALIZED_FIELDS.reduce((acc, field) => {
    const fieldSource = readObjectByKeys(rawTranslations, NEWS_FIELD_ALIASES[field]);
    if (fieldSource) acc[field] = fieldSource;
    return acc;
  }, {} as Partial<Record<NewsLocalizedField, Record<string, any>>>);

  return NEWS_LANGUAGE_CODES.reduce((acc, lang) => {
    const langSource = langSources[lang];
    const base = createEmptyNewsLocalizedFields();

    NEWS_LOCALIZED_FIELDS.forEach((field) => {
      const fromLangMap = langSource ? readStringByKeys(langSource, NEWS_FIELD_ALIASES[field]) : '';
      const fromFieldMap = fieldSources[field] ? readStringByKeys(fieldSources[field] as Record<string, any>, NEWS_LANGUAGE_SOURCE_KEYS[lang]) : '';
      const azBase = readStringByKeys(source, NEWS_FIELD_ALIASES[field]);

      if (lang === 'AZ') {
        base[field] = fromLangMap || fromFieldMap || azBase;
        return;
      }

      base[field] = fromLangMap || fromFieldMap || getLegacyNewsFieldByLanguage(source, field, lang);
    });

    acc[lang] = base;
    return acc;
  }, {} as NewsTranslations);
};

export const normalizeNewsWithLocalization = <T extends Record<string, any>>(rawNews: T): T & {
  title: string;
  category: string;
  description: string;
  translations: NewsTranslations;
} => {
  const source = isObjectRecord(rawNews) ? rawNews : {} as Record<string, any>;
  const translations = normalizeNewsTranslations(source);
  const az = translations.AZ;

  return {
    ...(source as T),
    title: az.title || toNewsFieldString(source.title),
    category: az.category || toNewsFieldString(source.category),
    description: az.description || toNewsFieldString(source.description),
    translations
  };
};

export const getLocalizedNewsField = (
  rawNews: Record<string, any> | null | undefined,
  field: NewsLocalizedField,
  lang: NewsLanguageCode
) => {
  if (!rawNews) return '';
  const normalized = normalizeNewsWithLocalization(rawNews);
  const direct = toNewsFieldString(normalized.translations?.[lang]?.[field]);
  if (direct) return direct;
  if (lang !== 'AZ') return toNewsFieldString(normalized.translations?.AZ?.[field]) || toNewsFieldString(normalized[field]);
  return toNewsFieldString(normalized[field]);
};
