#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const FRONT_DIR = path.resolve(process.cwd(), 'forsajqq/front');
const COMPONENTS_DIR = path.join(FRONT_DIR, 'components');
const APP_FILE = path.join(FRONT_DIR, 'App.tsx');
const SITE_STRUCT_FILE = path.join(FRONT_DIR, 'public', 'site-new-struct.json');
const OUTPUT_FILE = path.join(FRONT_DIR, 'public', 'localization.json');

const TARGET_LANGS = ['RU', 'ENG'];
const GOOGLE_LANG_BY_TARGET = {
  RU: 'ru',
  ENG: 'en',
};

const KEY_LIKE_RE = /^[A-Z0-9_]+$/;
const KEYISH_LABEL_RE = /^[A-Za-z0-9_.-]{2,120}$/;
const MANUAL_TEXT_OVERRIDES = {
  'ANA SƏHİFƏ': { RU: 'ГЛАВНАЯ', ENG: 'HOME' },
  'HAQQIMIZDA': { RU: 'О НАС', ENG: 'ABOUT US' },
  'XƏBƏRLƏR': { RU: 'НОВОСТИ', ENG: 'NEWS' },
  'TƏDBİRLƏR': { RU: 'СОБЫТИЯ', ENG: 'EVENTS' },
  'SÜRÜCÜLƏR': { RU: 'ПИЛОТЫ', ENG: 'DRIVERS' },
  'QALEREYA': { RU: 'ГАЛЕРЕЯ', ENG: 'GALLERY' },
  'QAYDALAR': { RU: 'ПРАВИЛА', ENG: 'RULES' },
  'ƏLAQƏ': { RU: 'КОНТАКТЫ', ENG: 'CONTACT' },
  'HAMISI': { RU: 'ВСЕ', ENG: 'ALL' },
  'OXU': { RU: 'ЧИТАТЬ', ENG: 'READ' },
  'XAL': { RU: 'ОЧКИ', ENG: 'POINTS' },
  'FOTOLAR': { RU: 'ФОТО', ENG: 'PHOTOS' },
  'FOTO': { RU: 'ФОТО', ENG: 'PHOTO' },
  'TOPLAM': { RU: 'ИТОГО', ENG: 'TOTAL' },
  'TELEFON': { RU: 'ТЕЛЕФОН', ENG: 'PHONE' },
  'MESAJINIZ': { RU: 'ВАШЕ СООБЩЕНИЕ', ENG: 'YOUR MESSAGE' },
  'SUMQAYIT': { RU: 'СУМГАИТ', ENG: 'SUMGAYIT' }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTranslatable = (text) => {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value)) return false;
  if (/^[0-9]+([.,:\/-][0-9]+)*$/.test(value)) return false;
  if (/^(true|false|yes|no|on|off|null|undefined)$/i.test(value)) return false;
  if (KEY_LIKE_RE.test(value)) return false;
  if (/^[A-Z0-9_.\/-]{2,40}$/.test(value)) return false;
  return /[A-Za-zƏəÖöÜüĞğŞşİıÇçА-Яа-я]/.test(value);
};

const stripLangSuffix = (key) => {
  const raw = String(key || '').trim();
  if (!raw) return raw;

  const suffixes = ['_RU', '_RUS', '.ru', '.rus', '_ENG', '_EN', '.eng', '.en'];
  for (const suffix of suffixes) {
    if (raw.endsWith(suffix)) return raw.slice(0, -suffix.length);
  }

  const prefixes = ['RU_', 'RUS_', 'ENG_', 'EN_'];
  for (const prefix of prefixes) {
    if (raw.startsWith(prefix)) return raw.slice(prefix.length);
  }

  return raw;
};

const listSourceFiles = async () => {
  const files = [APP_FILE];
  const dirEntries = await fs.readdir(COMPONENTS_DIR, { withFileTypes: true });
  for (const entry of dirEntries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.tsx')) continue;
    files.push(path.join(COMPONENTS_DIR, entry.name));
  }
  return files;
};

const extractScopedGetTextBindings = (source) => {
  const bindings = new Map();
  const bindingRe = /const\s*\{([^}]+)\}\s*=\s*useSiteContent\(\s*'([^']+)'\s*\)/g;
  let match;

  while ((match = bindingRe.exec(source)) !== null) {
    const destructured = match[1] || '';
    const pageId = (match[2] || '').trim().toLowerCase();
    if (!pageId) continue;

    for (const part of destructured.split(',')) {
      const token = part.trim();
      if (!token) continue;

      if (token === 'getText') {
        bindings.set('getText', pageId);
        continue;
      }

      const aliasMatch = /^getText\s*:\s*([A-Za-z_$][\w$]*)$/.exec(token);
      if (aliasMatch) {
        bindings.set(aliasMatch[1], pageId);
      }
    }
  }

  return bindings;
};

const setEntry = (pages, pageId, key, azValue) => {
  const normalizedPageId = String(pageId || '').trim().toLowerCase();
  const rawKey = String(key || '').trim();
  const normalizedKey = stripLangSuffix(rawKey);
  const value = String(azValue || '').trim();

  if (!normalizedPageId || !normalizedKey) return;
  if (!pages[normalizedPageId]) pages[normalizedPageId] = {};
  if (!pages[normalizedPageId][normalizedKey]) pages[normalizedPageId][normalizedKey] = { AZ: '' };

  if (value && !pages[normalizedPageId][normalizedKey].AZ) {
    pages[normalizedPageId][normalizedKey].AZ = value;
  }
};

const collectFromSource = async (pages) => {
  const files = await listSourceFiles();

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    const bindings = extractScopedGetTextBindings(source);
    if (bindings.size === 0) continue;

    for (const [fnName, pageId] of bindings.entries()) {
      const fnEscaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const callRe = new RegExp(`${fnEscaped}\\(\\s*'([^']+)'\\s*,\\s*'((?:\\\\'|[^'])*)'`, 'g');
      let callMatch;

      while ((callMatch = callRe.exec(source)) !== null) {
        const key = (callMatch[1] || '').trim();
        const rawDefault = (callMatch[2] || '').replace(/\\'/g, "'").replace(/\\n/g, '\n');
        setEntry(pages, pageId, key, rawDefault);
      }
    }
  }
};

const collectFromSiteStruct = async (pages) => {
  const raw = await fs.readFile(SITE_STRUCT_FILE, 'utf8');
  const payload = JSON.parse(raw);
  const sitePages = payload?.resources?.['site-content'];
  if (!Array.isArray(sitePages)) return;

  for (const page of sitePages) {
    const pageId = String(page?.id || page?.page_id || '').trim().toLowerCase();
    if (!pageId) continue;

    const sections = Array.isArray(page?.sections) ? page.sections : [];
    for (const section of sections) {
      const rawId = String(section?.id || '').trim();
      const rawLabel = String(section?.label || '').trim();
      const rawValue = String(section?.value || '').trim();
      const value = rawValue || rawLabel;

      if (rawId) {
        setEntry(pages, pageId, rawId, value);
      }

      if (rawLabel && KEYISH_LABEL_RE.test(rawLabel)) {
        setEntry(pages, pageId, rawLabel, value);
      }
    }
  }
};

const translateWithGoogle = async (text, targetLang) => {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=az&tl=${targetLang}&dt=t&q=${q}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json,text/plain,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`translate_http_${response.status}`);
  }

  const body = await response.text();
  const json = JSON.parse(body);

  if (!Array.isArray(json) || !Array.isArray(json[0])) return text;
  const translated = json[0]
    .map((part) => (Array.isArray(part) ? String(part[0] || '') : ''))
    .join('')
    .trim();

  return translated || text;
};

const buildTranslationCache = async (pages) => {
  const uniqueTexts = new Set();

  for (const page of Object.values(pages)) {
    for (const entry of Object.values(page)) {
      const azText = String(entry?.AZ || '').trim();
      if (azText && isTranslatable(azText)) uniqueTexts.add(azText);
    }
  }

  const textList = [...uniqueTexts];
  const cache = {
    RU: new Map(),
    ENG: new Map(),
  };

  const maxConcurrency = 3;
  for (const target of TARGET_LANGS) {
    const langCode = GOOGLE_LANG_BY_TARGET[target];
    let cursor = 0;
    let completed = 0;

    const worker = async () => {
      while (true) {
        const idx = cursor;
        cursor += 1;
        if (idx >= textList.length) return;

        const text = textList[idx];
        let translated = text;
        try {
          translated = await translateWithGoogle(text, langCode);
        } catch {
          translated = text;
        }

        cache[target].set(text, translated);
        completed += 1;

        if (completed % 50 === 0 || completed === textList.length) {
          console.log(`[${target}] translated ${completed}/${textList.length}`);
        }

        await wait(70);
      }
    };

    await Promise.all(new Array(maxConcurrency).fill(0).map(() => worker()));
  }

  return cache;
};

const applyTranslations = (pages, translationCache) => {
  for (const [pageId, entries] of Object.entries(pages)) {
    for (const [key, entry] of Object.entries(entries)) {
      const az = String(entry?.AZ || '').trim();
      const normalizedKey = String(key || '').trim().toUpperCase();
      const manual = MANUAL_TEXT_OVERRIDES[az.toUpperCase()];
      const record = {
        AZ: az,
        RU: az,
        ENG: az,
      };

      if (normalizedKey === 'SEO_LANGUAGE') {
        record.AZ = 'az';
        record.RU = 'ru';
        record.ENG = 'en';
      } else if (az && isTranslatable(az)) {
        record.RU = translationCache.RU.get(az) || az;
        record.ENG = translationCache.ENG.get(az) || az;
      }

      if (manual) {
        record.RU = manual.RU;
        record.ENG = manual.ENG;
      }

      entries[key] = record;
    }

    pages[pageId] = Object.fromEntries(
      Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'en'))
    );
  }
};

const main = async () => {
  const pages = {};

  await collectFromSource(pages);
  await collectFromSiteStruct(pages);

  const translationCache = await buildTranslationCache(pages);
  applyTranslations(pages, translationCache);

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    languages: ['AZ', 'RU', 'ENG'],
    pages: Object.fromEntries(
      Object.entries(pages).sort(([a], [b]) => a.localeCompare(b, 'en'))
    ),
  };

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  let keyCount = 0;
  for (const page of Object.values(output.pages)) {
    keyCount += Object.keys(page).length;
  }

  console.log(`localization.json generated: pages=${Object.keys(output.pages).length}, keys=${keyCount}`);
  console.log(`output: ${OUTPUT_FILE}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
