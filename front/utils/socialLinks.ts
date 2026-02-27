interface ContentSection {
  id?: string;
  label?: string;
  value?: string;
}

export type SocialPlatform = 'instagram' | 'youtube' | 'facebook';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

const SOCIAL_ORDER: SocialPlatform[] = ['instagram', 'youtube', 'facebook'];
const KEY_LIKE_VALUE = /^[A-Z0-9_]+$/;

const detectPlatform = (section?: ContentSection): SocialPlatform | null => {
  const haystack = `${section?.id || ''} ${section?.label || ''}`.toLowerCase();
  if (haystack.includes('insta')) return 'instagram';
  if (haystack.includes('youtube')) return 'youtube';
  if (haystack.includes('facebook') || haystack.includes('fb')) return 'facebook';
  return null;
};

const normalizeExternalUrl = (rawValue?: string): string => {
  const value = String(rawValue || '').trim();
  if (!value || value === '#' || KEY_LIKE_VALUE.test(value)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(value)) return `https://${value}`;
  return value;
};

export const resolveSocialLinks = (
  sections: ContentSection[] | undefined,
  getGeneralText: (key: string) => string
): SocialLink[] => {
  const byPlatform: Partial<Record<SocialPlatform, string>> = {};

  for (const section of sections || []) {
    const platform = detectPlatform(section);
    if (!platform) continue;
    const normalized = normalizeExternalUrl(section.value);
    if (normalized) {
      byPlatform[platform] = normalized;
    }
  }

  const generalFallback: Record<SocialPlatform, string> = {
    instagram: normalizeExternalUrl(getGeneralText('SOCIAL_INSTAGRAM')),
    youtube: normalizeExternalUrl(getGeneralText('SOCIAL_YOUTUBE')),
    facebook: normalizeExternalUrl(getGeneralText('SOCIAL_FACEBOOK'))
  };

  return SOCIAL_ORDER
    .map((platform) => ({
      platform,
      url: byPlatform[platform] || generalFallback[platform]
    }))
    .filter((item) => Boolean(item.url));
};

