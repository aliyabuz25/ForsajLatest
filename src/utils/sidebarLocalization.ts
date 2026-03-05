import type { AdminLanguage } from './adminLanguage';

export interface SidebarLocalizationEntry {
  AZ: string;
  RU: string;
  ENG: string;
}

export type SidebarLocalizationMap = Record<string, SidebarLocalizationEntry>;

const PAGE_KEY = 'admin_sidebar';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const normalizeToken = (value: string) =>
  (value || '')
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const normalizeEntry = (rawEntry: unknown): SidebarLocalizationEntry => {
  if (!isRecord(rawEntry)) {
    return {
      AZ: toText(rawEntry),
      RU: '',
      ENG: ''
    };
  }

  return {
    AZ: toText(rawEntry.AZ ?? rawEntry.az ?? ''),
    RU: toText(rawEntry.RU ?? rawEntry.ru ?? ''),
    ENG: toText(rawEntry.ENG ?? rawEntry.EN ?? rawEntry.en ?? '')
  };
};

export const parseAdminSidebarLocalization = (payload: unknown): SidebarLocalizationMap => {
  if (!isRecord(payload)) return {};
  const pagesSource = isRecord(payload.pages) ? payload.pages : payload;

  let rawPage: unknown = null;
  for (const [rawPageId, rawPageEntries] of Object.entries(pagesSource)) {
    if (normalizeToken(rawPageId) === normalizeToken(PAGE_KEY)) {
      rawPage = rawPageEntries;
      break;
    }
  }

  if (!isRecord(rawPage)) return {};

  const normalizedMap: SidebarLocalizationMap = {};
  for (const [rawKey, rawEntry] of Object.entries(rawPage)) {
    const key = normalizeToken(rawKey);
    if (!key) continue;
    normalizedMap[key] = normalizeEntry(rawEntry);
  }

  return normalizedMap;
};

const toSiteLanguage = (lang: AdminLanguage): keyof SidebarLocalizationEntry =>
  lang === 'ru' ? 'RU' : 'AZ';

export const getAdminSidebarLocalizedText = (
  map: SidebarLocalizationMap,
  key: string,
  lang: AdminLanguage,
  fallback: string
) => {
  const normalizedKey = normalizeToken(key);
  if (!normalizedKey) return fallback;

  const entry = map[normalizedKey];
  if (!entry) return fallback;

  const localizedValue = toText(entry[toSiteLanguage(lang)]).trim();
  if (localizedValue) return localizedValue;

  const azFallback = toText(entry.AZ).trim();
  return azFallback || fallback;
};
