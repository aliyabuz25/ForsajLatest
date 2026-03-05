import { useCallback, useEffect, useRef, useState } from 'react';
import { type AdminLanguage, translateAdminUiText } from '../utils/adminLanguage';

interface AdminUiLocalizationProps {
  language: AdminLanguage;
}

interface LocalizedEntry {
  AZ: string;
  RU: string;
  ENG: string;
}

const ATTRS_TO_TRANSLATE = ['placeholder', 'title', 'aria-label'] as const;

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
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEntry = (rawEntry: unknown): LocalizedEntry => {
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

const buildLookup = (payload: unknown) => {
  const lookup = new Map<string, LocalizedEntry>();
  if (!isRecord(payload)) return lookup;
  const pages = isRecord(payload.pages) ? payload.pages : payload;

  for (const pageValue of Object.values(pages)) {
    if (!isRecord(pageValue)) continue;
    for (const entryValue of Object.values(pageValue)) {
      const entry = normalizeEntry(entryValue);
      const azValue = entry.AZ.trim();
      if (!azValue) continue;
      const token = normalizeToken(azValue);
      if (!token) continue;

      const current = lookup.get(token);
      if (!current) {
        lookup.set(token, entry);
        continue;
      }

      lookup.set(token, {
        AZ: current.AZ || entry.AZ,
        RU: current.RU || entry.RU,
        ENG: current.ENG || entry.ENG
      });
    }
  }

  return lookup;
};

const matchWhitespace = (source: string, translatedCore: string) => {
  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return translatedCore;
  return `${match[1]}${translatedCore}${match[3]}`;
};

const getLocalizedText = (
  text: string,
  language: AdminLanguage,
  lookup: Map<string, LocalizedEntry>
) => {
  if (language === 'az') return text;

  const core = text.trim();
  if (!core) return text;

  const token = normalizeToken(core);
  const entry = token ? lookup.get(token) : undefined;
  const localizedCore =
    language === 'ru'
      ? (entry?.RU?.trim() || '')
      : (entry?.ENG?.trim() || '');

  if (localizedCore) return matchWhitespace(text, localizedCore);
  return translateAdminUiText(language, text);
};

const shouldSkipNode = (node: Text) => {
  const parent = node.parentElement;
  if (!parent) return true;
  if (!node.nodeValue || !node.nodeValue.trim()) return true;
  if (parent.closest('.sidebar')) return true;
  if (parent.closest('.notranslate,[translate="no"]')) return true;
  if (parent.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""]')) return true;

  const tag = parent.tagName;
  return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'OPTION';
};

const AdminUiLocalization: React.FC<AdminUiLocalizationProps> = ({ language }) => {
  const [lookup, setLookup] = useState<Map<string, LocalizedEntry>>(new Map());
  const textOriginalsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const attrOriginalsRef = useRef<WeakMap<Element, Map<string, string>>>(new WeakMap());
  const debounceTimerRef = useRef<number | null>(null);

  const applyLocalization = useCallback(() => {
    if (language === 'az') {
      textOriginalsRef.current = new WeakMap();
      attrOriginalsRef.current = new WeakMap();
      return;
    }

    const root = document.querySelector<HTMLElement>('.main-content');
    if (!root) return;

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null = textWalker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      if (!shouldSkipNode(textNode)) {
        if (!textOriginalsRef.current.has(textNode)) {
          textOriginalsRef.current.set(textNode, textNode.nodeValue || '');
        }
        const original = textOriginalsRef.current.get(textNode) ?? '';
        const localized = getLocalizedText(original, language, lookup);
        if ((textNode.nodeValue || '') !== localized) {
          textNode.nodeValue = localized;
        }
      }
      currentNode = textWalker.nextNode();
    }

    const attrNodes = root.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label]');
    attrNodes.forEach((el) => {
      if (el.closest('.sidebar')) return;
      if (el.closest('.notranslate,[translate="no"]')) return;
      if (el.matches('input:not([type="button"]):not([type="submit"])')) return;
      if (el.matches('textarea,select,[contenteditable="true"],[contenteditable=""]')) return;

      let attrMap = attrOriginalsRef.current.get(el);
      if (!attrMap) {
        attrMap = new Map<string, string>();
        attrOriginalsRef.current.set(el, attrMap);
      }

      ATTRS_TO_TRANSLATE.forEach((attr) => {
        const current = el.getAttribute(attr);
        if (current === null) return;
        if (!attrMap!.has(attr)) {
          attrMap!.set(attr, current);
        }
        const original = attrMap!.get(attr) || '';
        const localized = getLocalizedText(original, language, lookup);
        if (localized !== current) {
          el.setAttribute(attr, localized);
        }
      });
    });
  }, [language, lookup]);

  useEffect(() => {
    let cancelled = false;
    const fetchLocalization = async () => {
      try {
        const response = await fetch('/api/localization', { cache: 'no-store' });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!cancelled) setLookup(buildLookup(payload));
      } catch {
        // keep fallbacks
      }
    };

    void fetchLocalization();
    const handleLocalizationReady = () => void fetchLocalization();
    window.addEventListener('forsaj-localization-ready', handleLocalizationReady);
    return () => {
      cancelled = true;
      window.removeEventListener('forsaj-localization-ready', handleLocalizationReady);
    };
  }, []);

  useEffect(() => {
    applyLocalization();
  }, [applyLocalization]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        applyLocalization();
      }, 120);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS_TO_TRANSLATE]
    });

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applyLocalization]);

  return null;
};

export default AdminUiLocalization;
