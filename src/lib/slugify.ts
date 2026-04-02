/**
 * Generates an SEO-friendly slug from a product name and ID.
 */
export const getProductSlug = (item: any) => {
    if (!item) return '';
    const name = (item.name_uz || item.name || "product").toLowerCase();
    // transliterate Cyrillic to Latin if needed, but for now simple normalization
    const slug = name
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    return `${slug}-${item.id}`;
};

/**
 * Extracts the real product ID from an SEO-friendly slug.
 */
export const getProductIdFromSlug = (slug: string) => {
    if (!slug) return '';
    // UUID regex: 8-4-4-4-12 hex chars
    const uuidMatch = slug.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    if (uuidMatch) {
        return uuidMatch[1];
    }
    
    // Fallback: Check if it's just a raw ID or a simple numeric ID at the end
    const lastPart = slug.split('-').pop();
    if (lastPart && (lastPart.length >= 8)) {
        return slug.includes('-') ? lastPart : slug; // rough estimate
    }

    return slug;
};
