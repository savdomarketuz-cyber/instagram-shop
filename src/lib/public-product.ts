/**
 * Mahsulot sahifasi brauzerga uzatadigan ustunlar — faqat ProductClient va uning
 * komponentlari (ProductMedia, ProductInfo, ProductDescriptionModal, variantlar, savat,
 * RecentlyViewed, metrika, promo) haqiqatda ishlatadiganlari.
 *
 * Ichki maydonlar ATAYLAB kiritilmagan: cost_price, additional_expenses, comm_*,
 * barcode, embedding*, image_embedding, ai_persona*, sales, total_views,
 * total_wishlists, total_returns, cashback_*, created_at, updated_at, va h.k.
 * Yangi maydon kerak bo'lsa — shu yerga qo'shing (select("*") ishlatmang).
 *
 * Bitta literal satr (join yoki + emas): Supabase select() tipini shu satrdan chiqaradi.
 */
export const PUBLIC_PRODUCT_COLUMNS = 'id, article, sku, model, name, name_uz, name_ru, description, description_uz, description_ru, price, old_price, stock, stock_details, image, images, image_metadata, video_url, category_id, brand_id, group_id, color_name, is_original, is_deleted, express_delivery, avg_rating, review_count';
