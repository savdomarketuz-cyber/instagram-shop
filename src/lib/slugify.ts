/**
 * Generates an SEO-friendly slug from a product name and identifier (article or id).
 * Uses '--' as a separator for the identifier to handle identifiers with hyphens.
 */
export const getProductSlug = (item: any) => {
    if (!item) return '';
    const name = (item.name_uz || item.name || "product").toLowerCase();
    
    // Normalize name to be URL-friendly
    const slug = name
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    // Use article if available, otherwise fallback to id
    const identifier = item.article || item.id;
    
    // Use double hyphen as separator to reliably distinguish identifier even if it contains hyphens
    return `${slug}--${identifier}`;
};

/**
 * Extracts the product identifier (article or id) from an SEO-friendly slug.
 */
export const getProductIdFromSlug = (slug: string) => {
    if (!slug) return '';
    
    // If separated by '--', take the last part
    if (slug.includes('--')) {
        const parts = slug.split('--');
        return parts[parts.length - 1];
    }
    
    // Legacy support for single hyphen UUIDs or older slugs
    // UUID regex: 8-4-4-4-12 hex chars
    const uuidMatch = slug.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    if (uuidMatch) {
        return uuidMatch[1];
    }
    
    // Last resort fallback
    const parts = slug.split('-');
    return parts[parts.length - 1];
};
