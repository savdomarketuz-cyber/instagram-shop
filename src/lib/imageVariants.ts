import type { ImageLoaderProps } from 'next/image';

type Meta = Record<string, { xs?: string; md?: string; lg?: string; lowResUrl?: string; blurDataURL?: string }> | undefined;

export function makeVariantLoader(metadata: Meta) {
  return ({ src, width }: ImageLoaderProps): string => {
    const m = metadata?.[src];
    if (!m) return src;
    if (width <= 400 && m.lowResUrl) return m.lowResUrl;
    if (width <= 640 && (m.xs || m.lowResUrl)) return m.xs || m.lowResUrl;
    if (width <= 828 && (m.md || m.xs || m.lowResUrl)) return m.md || m.xs || m.lowResUrl;
    if (m.lg || m.md || m.xs || m.lowResUrl) return m.lg || m.md || m.xs || m.lowResUrl!;
    return src;
  };
}

export function hasVariants(metadata: Meta, url: string): boolean {
  const m = metadata?.[url];
  return !!(m?.lowResUrl || m?.xs || m?.md || m?.lg);
}
