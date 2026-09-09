import type { ImageLoaderProps } from 'next/image';

type Meta = Record<string, { xs?: string; md?: string; lg?: string; lowResUrl?: string; blurDataURL?: string }> | undefined;

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find(Boolean);
}

export function getMetaForUrl(metadata: Meta, url: string) {
  if (!metadata || typeof metadata !== 'object') return undefined;
  if (metadata[url]) return metadata[url];
  const urlBase = url.split('/').pop()?.split('?')[0];
  if (urlBase) {
    const matches = Object.entries(metadata).filter(([k]) => {
      const kBase = k.split('/').pop()?.split('?')[0];
      return kBase === urlBase;
    });
    if (matches.length === 1) return matches[0][1];
  }
  return undefined;
}

export function makeVariantLoader(metadata: Meta) {
  return ({ src, width }: ImageLoaderProps): string => {
    const m = getMetaForUrl(metadata, src);
    if (!m) return src;

    const selected = firstDefined(
      width <= 420 ? m.lowResUrl : undefined,
      width <= 640 ? m.xs : undefined,
      width <= 828 ? m.md : undefined,
      m.lg,
      m.md,
      m.xs,
      m.lowResUrl
    );

    return selected || src;
  };
}

export function hasVariants(metadata: Meta, url: string): boolean {
  const m = getMetaForUrl(metadata, url);
  return !!(m?.lowResUrl || m?.xs || m?.md || m?.lg);
}
