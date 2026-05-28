import type { ImageLoaderProps } from 'next/image';

type Meta = Record<string, { xs?: string; md?: string; lg?: string; lowResUrl?: string; blurDataURL?: string }> | undefined;

export function makeVariantLoader(metadata: Meta) {
  return ({ src, width }: ImageLoaderProps): string => {
    const m = metadata?.[src];
    if (!m) return src;
    if (width <= 360 && m.lowResUrl) return m.lowResUrl;
    if (width <= 640 && m.xs) return m.xs;
    if (width <= 828 && m.md) return m.md;
    if (m.lg) return m.lg;
    return src;
  };
}

export function hasVariants(metadata: Meta, url: string): boolean {
  const m = metadata?.[url];
  return !!(m?.xs && m?.md && m?.lg);
}
