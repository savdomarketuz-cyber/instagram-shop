/**
 * Shared TypeScript interfaces for the entire application
 * Barcha sahifalarda va komponentlarda shu typlar ishlatiladi
 */

export interface Product {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    image: string;
    imageUrl?: string; // backward compat
    images?: string[];
    category: string;
    category_uz?: string;
    category_ru?: string;
    description?: string;
    description_uz?: string;
    description_ru?: string;
    rating?: number;
    reviewCount?: number;
    sales: number;
    tag?: string;
    tags?: string[];
    features?: string[];
    isDeleted?: boolean;
    isOriginal?: boolean;
    stockDetails?: Record<string, number>;
    stock?: number;
    groupId?: string;
    colorName?: string;
    sku?: string;
    article?: string;
    videoUrl?: string;
    image_metadata?: Record<string, { alt_uz?: string; alt_ru?: string }>;
    createdAt?: FirebaseTimestamp;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
    icon?: string;
    order?: number;
}

export interface Banner {
    id: string;
    imageUrl_uz: string;
    imageUrl_ru: string;
    title_uz?: string;
    title_ru?: string;
    tabName_uz?: string;
    tabName_ru?: string;
    order?: number;
}

export interface User {
    id?: string;
    phone: string;
    name?: string;
    username?: string;
    isAdmin?: boolean;
}

export interface Order {
    id: string;
    userPhone: string;
    items: OrderItem[];
    total: number;
    address?: string;
    coords?: [number, number];
    status: string;
    createdAt?: FirebaseTimestamp;
}

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface BannerSettings {
    desktopHeight: number;
    borderRadius: number;
}

export interface Toast {
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface Reel {
    id: string;
    videoUrl: string;
    thumbnailUrl?: string; // Optional cover image
    productId?: string; // Link to a product
    productName?: string;
    productPrice?: number;
    description?: string;
    createdAt?: FirebaseTimestamp;
    likes?: number;
    views?: number;
    // Allow for additional dynamic fields from products that double as reels
    [key: string]: any; 
}

export type Language = "uz" | "ru";

// Firebase Timestamp type (simplified)
export interface FirebaseTimestamp {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
}

/**
 * Helper function to get localized product name
 */
export function getLocalizedName(item: Product | CartItem, language: Language): string {
    return (language === 'uz' ? item.name_uz : item.name_ru) || item.name;
}

/**
 * Helper function to get product image URL (handles both 'image' and 'imageUrl' fields)
 */
export function getProductImage(item: Product | CartItem): string {
    return item.image || item.imageUrl || '';
}

/**
 * Calculate total stock from stockDetails
 */
export function getTotalStock(product: Product): number {
    if (!product.stockDetails) return product.stock ?? 0;
    return Object.values(product.stockDetails).reduce((sum, val) => sum + (Number(val) || 0), 0);
}

export interface Blog {
    id: string;
    slug: string;
    title_uz: string;
    title_ru: string;
    excerpt_uz?: string;
    excerpt_ru?: string;
    content_uz: string;
    content_ru: string;
    image?: string;
    category?: string;
    readTime?: number;
    views?: number;
    linkedProductIds?: string[];
    is_deleted?: boolean;
    created_at: string;
    updated_at: string;
}
