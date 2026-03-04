import { useEffect } from 'react';
import { type AdminLanguage, translateAdminUiText } from '../utils/adminLanguage';

interface AdminAutoTranslateProps {
  language: AdminLanguage;
}

const TRANS_ATTRS = ['placeholder', 'title', 'aria-label'];

const isIgnoredElement = (el: Element | null) => {
  if (!el) return true;
  const tag = el.tagName.toLowerCase();
  return tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre' || tag === 'textarea';
};

const translateElementNode = (el: Element, language: AdminLanguage) => {
  if (isIgnoredElement(el)) return;
  TRANS_ATTRS.forEach((attr) => {
    const raw = el.getAttribute(attr);
    if (!raw) return;
    const translated = translateAdminUiText(language, raw);
    if (translated !== raw) el.setAttribute(attr, translated);
  });
};

const translateTextNode = (node: Text, language: AdminLanguage) => {
  if (!node.nodeValue) return;
  const parent = node.parentElement;
  if (isIgnoredElement(parent)) return;
  const translated = translateAdminUiText(language, node.nodeValue);
  if (translated !== node.nodeValue) node.nodeValue = translated;
};

const translateSubtree = (root: Node, language: AdminLanguage) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementNode(root as Element, language);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node as Text, language);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateElementNode(node as Element, language);
    }
    node = walker.nextNode();
  }
};

const AdminAutoTranslate: React.FC<AdminAutoTranslateProps> = ({ language }) => {
  useEffect(() => {
    const root = document.querySelector('.app-container') || document.body;
    if (!root) return;

    translateSubtree(root, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text, language);
          return;
        }
        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          translateElementNode(mutation.target as Element, language);
          return;
        }
        mutation.addedNodes.forEach((node) => translateSubtree(node, language));
      });
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANS_ATTRS,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
};

export default AdminAutoTranslate;
