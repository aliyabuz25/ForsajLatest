export type EventLanguageCode = 'AZ' | 'RU' | 'ENG';
export type EventLocalizedField = 'title' | 'location' | 'category' | 'description' | 'rules';
export type EventLocalizedFields = Record<EventLocalizedField, string>;
export type EventTranslations = Record<EventLanguageCode, EventLocalizedFields>;

const EVENT_LANGUAGE_CODES: EventLanguageCode[] = ['AZ', 'RU', 'ENG'];
const EVENT_LOCALIZED_FIELDS: EventLocalizedField[] = ['title', 'location', 'category', 'description', 'rules'];

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toEventFieldString = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const createEmptyEventLocalizedFields = (): EventLocalizedFields => ({
  title: '',
  location: '',
  category: '',
  description: '',
  rules: ''
});

const getLegacyEventFieldByLanguage = (
  rawEvent: Record<string, any>,
  field: EventLocalizedField,
  lang: EventLanguageCode
) => {
  if (lang === 'AZ') return '';

  const suffixes = lang === 'RU'
    ? ['Ru', 'RU', 'Rus', 'RUS', '_ru', '_RU', '_rus', '_RUS']
    : ['En', 'EN', 'Eng', 'ENG', '_en', '_EN', '_eng', '_ENG'];

  for (const suffix of suffixes) {
    const key = `${field}${suffix}`;
    const value = rawEvent[key];
    if (value !== undefined && value !== null && String(value) !== '') {
      return String(value);
    }
  }

  return '';
};

export const normalizeEventTranslations = (rawEvent: Record<string, any> | null | undefined): EventTranslations => {
  const source = isObjectRecord(rawEvent) ? rawEvent : {};
  const rawTranslations = isObjectRecord(source.translations)
    ? source.translations
    : (isObjectRecord(source.i18n) ? source.i18n : {});

  const langSources: Partial<Record<EventLanguageCode, Record<string, any>>> = {
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

  return EVENT_LANGUAGE_CODES.reduce((acc, lang) => {
    const langSource = langSources[lang];
    const base = createEmptyEventLocalizedFields();

    EVENT_LOCALIZED_FIELDS.forEach((field) => {
      const fromLangMap = langSource ? toEventFieldString(langSource[field]) : '';
      const azBase = toEventFieldString(source[field]);

      if (lang === 'AZ') {
        base[field] = fromLangMap || azBase;
        return;
      }

      base[field] = fromLangMap || getLegacyEventFieldByLanguage(source, field, lang);
    });

    acc[lang] = base;
    return acc;
  }, {} as EventTranslations);
};

export const normalizeEventWithLocalization = <T extends Record<string, any>>(rawEvent: T): T & {
  title: string;
  location: string;
  category: string;
  description: string;
  rules: string;
  translations: EventTranslations;
} => {
  const source = isObjectRecord(rawEvent) ? rawEvent : {} as Record<string, any>;
  const translations = normalizeEventTranslations(source);
  const az = translations.AZ;

  return {
    ...(source as T),
    title: az.title || toEventFieldString(source.title),
    location: az.location || toEventFieldString(source.location),
    category: az.category || toEventFieldString(source.category),
    description: az.description || toEventFieldString(source.description),
    rules: az.rules || toEventFieldString(source.rules),
    translations
  };
};

export const getLocalizedEventField = (
  rawEvent: Record<string, any> | null | undefined,
  field: EventLocalizedField,
  lang: EventLanguageCode
) => {
  if (!rawEvent) return '';
  const normalized = normalizeEventWithLocalization(rawEvent);
  const direct = toEventFieldString(normalized.translations?.[lang]?.[field]);
  if (direct) return direct;
  if (lang !== 'AZ') return toEventFieldString(normalized.translations?.AZ?.[field]) || toEventFieldString(normalized[field]);
  return toEventFieldString(normalized[field]);
};
