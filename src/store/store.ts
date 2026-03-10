import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Product {
    id: string;
    name: string; // compatibility
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    imageUrl: string;
    category: string;
    category_uz?: string;
    category_ru?: string;
    description?: string;
    description_uz?: string;
    description_ru?: string;
    stock?: number;
    sku?: string;
    groupId?: string;
    colorName?: string;
    sales?: number;
    isDeleted?: boolean;
    article?: string;
}

interface CartItem extends Product {
    quantity: number;
}

interface StoreState {
    cart: CartItem[];
    wishlist: Product[];
    user: { id?: string; phone: string; name?: string; username?: string; isAdmin?: boolean } | null;
    language: "uz" | "ru";
    setLanguage: (lang: "uz" | "ru") => void;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    toggleWishlist: (product: Product) => void;
    clearCart: () => void;
    setUser: (user: { id?: string; phone: string; name?: string; username?: string; isAdmin?: boolean } | null) => void;
    logout: () => void;
    // Cache for Home Page
    cachedProducts: any[];
    cachedCategories: any[];
    setCachedProducts: (products: any[]) => void;
    setCachedCategories: (categories: any[]) => void;
    homeScrollPosition: number;
    homeSearchQuery: string;
    setHomeScrollPosition: (pos: number) => void;
    setHomeSearchQuery: (query: string) => void;
    homeActiveFilter: string;
    homeActiveTab: string;
    setHomeActiveFilter: (filter: string) => void;
    setHomeActiveTab: (tab: string) => void;
    toast: { message: string, type: 'success' | 'error' | 'info' } | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            cart: [],
            wishlist: [],
            user: null,
            language: "uz",
            setLanguage: (lang) => set({ language: lang }),
            addToCart: (product) => set((state) => {
                const existing = state.cart.find((item) => item.id === product.id);
                const maxStock = product.stock ?? 999;

                if (existing) {
                    if (existing.quantity >= maxStock) return {};
                    return {
                        cart: state.cart.map((item) =>
                            item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, maxStock) } : item
                        ),
                    };
                }
                return { cart: [...state.cart, { ...product, quantity: 1 }] };
            }),
            removeFromCart: (productId) => set((state) => ({
                cart: state.cart.filter((item) => item.id !== productId)
            })),
            updateQuantity: (productId, quantity) => set((state) => ({
                cart: state.cart.map((item) =>
                    item.id === productId ? { ...item, quantity: quantity } : item
                )
            })),
            toggleWishlist: (product) => set((state) => {
                const exists = state.wishlist.some(item => item.id === product.id);
                if (exists) {
                    return { wishlist: state.wishlist.filter(item => item.id !== product.id) };
                }
                return { wishlist: [...state.wishlist, product] };
            }),
            clearCart: () => set({ cart: [] }),
            setUser: (user) => set({ user }),
            logout: () => set({ user: null, cart: [], wishlist: [] }),
            cachedProducts: [],
            cachedCategories: [],
            setCachedProducts: (products) => set({ cachedProducts: products }),
            setCachedCategories: (categories) => set({ cachedCategories: categories }),
            homeScrollPosition: 0,
            homeSearchQuery: "",
            setHomeScrollPosition: (pos) => set({ homeScrollPosition: pos }),
            setHomeSearchQuery: (query) => set({ homeSearchQuery: query }),
            homeActiveFilter: "all",
            homeActiveTab: "for_you",
            setHomeActiveFilter: (filter) => set({ homeActiveFilter: filter }),
            setHomeActiveTab: (tab) => set({ homeActiveTab: tab }),
            toast: null,
            showToast: (message, type = 'success') => {
                set({ toast: { message, type } });
                setTimeout(() => set({ toast: null }), 3000);
            },
        }),
        {
            name: "instagram-shop-storage",
        }
    )
);
