import type { ImageLoaderProps } from 'next/image';

type Meta = Record<string, { xs?: string; md?: string; lg?: string; lowResUrl?: string; blurDataURL?: string }> | undefined;

export function getMetaForUrl(metadata: Meta, url: string) {
  if (!metadata || typeof metadata !== 'object') return undefined;
  if (metadata[url]) return metadata[url];
  const urlBase = url.split('/').pop()?.split('?')[0];
  if (urlBase) {
    const entry = Object.entries(metadata).find(([k]) => {
      const kBase = k.split('/').pop()?.split('?')[0];
      return kBase && kBase === urlBase;
    });
    if (entry) return entry[1];
  }
  const first = Object.values(metadata)[0];
  return first || undefined;
}

export function makeVariantLoader(metadata: Meta) {
  return ({ src, width }: ImageLoaderProps): string => {
    const m = getMetaForUrl(metadata, src);
    if (!m) return src;
    if (width <= 420 && m.lowResUrl) return m.lowResUrl;
    if (width <= 640 && (m.xs || m.lowResUrl)) return m.xs || m.lowResUrl;
    if (width <= 828 && (m.md || m.xs || m.lowResUrl)) return m.md || m.xs || m.lowResUrl;
    if (m.lg || m.md || m.xs || m.lowResUrl) return m.lg || m.md || m.xs || m.lowResUrl!;
    return src;
  };
}

export function hasVariants(metadata: Meta, url: string): boolean {
  const m = getMetaForUrl(metadata, url);
  return !!(m?.lowResUrl || m?.xs || m?.md || m?.lg);
}
