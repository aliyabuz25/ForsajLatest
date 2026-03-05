export type NewsLanguageCode = 'AZ' | 'RU' | 'ENG';
export type NewsLocalizedField = 'title' | 'category' | 'description';
export type NewsLocalizedFields = Record<NewsLocalizedField, string>;
export type NewsTranslations = Record<NewsLanguageCode, NewsLocalizedFields>;

const NEWS_LANGUAGE_CODES: NewsLanguageCode[] = ['AZ', 'RU', 'ENG'];
const NEWS_LOCALIZED_FIELDS: NewsLocalizedField[] = ['title', 'category', 'description'];

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toNewsFieldString = (value: unknown) => (value === undefined || value === null ? '' : String(value));

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

  for (const suffix of suffixes) {
    const key = `${field}${suffix}`;
    const value = rawNews[key];
    if (value !== undefined && value !== null && String(value) !== '') {
      return String(value);
    }
  }

  return '';
};

export const normalizeNewsTranslations = (rawNews: Record<string, any> | null | undefined): NewsTranslations => {
  const source = isObjectRecord(rawNews) ? rawNews : {};
  const rawTranslations = isObjectRecord(source.translations)
    ? source.translations
    : (isObjectRecord(source.i18n) ? source.i18n : {});

  const langSources: Partial<Record<NewsLanguageCode, Record<string, any>>> = {
    AZ: isObjectRecord(rawTranslations.AZ)
      ? rawTranslations.AZ
      : (isObjectRecord(rawTranslations.az) ? rawTranslations.az : undefined),
    RU: isObjectRecord(rawTranslations.RU)
      ? rawTranslations.RU
      : (isObjectRecord(rawTranslations.ru)
        ? rawTranslations.ru
        : (isObjectRecord(rawTranslations.RUS) ? rawTranslations.RUS : undefined)),
    ENG: isObjectRecord(rawTranslations.ENG)
      ? rawTranslations.ENG
      : (isObjectRecord(rawTranslations.EN)
        ? rawTranslations.EN
        : (isObjectRecord(rawTranslations.en) ? rawTranslations.en : undefined))
  };

  return NEWS_LANGUAGE_CODES.reduce((acc, lang) => {
    const langSource = langSources[lang];
    const base = createEmptyNewsLocalizedFields();

    NEWS_LOCALIZED_FIELDS.forEach((field) => {
      const fromLangMap = langSource ? toNewsFieldString(langSource[field]) : '';
      const azBase = toNewsFieldString(source[field]);

      if (lang === 'AZ') {
        base[field] = fromLangMap || azBase;
        return;
      }

      base[field] = fromLangMap || getLegacyNewsFieldByLanguage(source, field, lang);
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
