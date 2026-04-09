import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem, User, Category, Toast, Language, SearchFacets } from "@/types";

// Re-export for backward compatibility
export type { Product, CartItem };

interface StoreState {
    cart: CartItem[];
    wishlist: Product[];
    user: User | null;
    language: Language;
    setLanguage: (lang: Language) => void;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    toggleWishlist: (product: Product) => void;
    clearCart: () => void;
    setUser: (user: User | null) => void;
    logout: () => void;
    // Cache for Home Page
    cachedProducts: Product[];
    cachedCategories: Category[];
    setCachedProducts: (products: Product[]) => void;
    setCachedCategories: (categories: Category[]) => void;
    homeScrollPosition: number;
    homeSearchQuery: string;
    setHomeScrollPosition: (pos: number) => void;
    setHomeSearchQuery: (query: string) => void;
    homeActiveFilter: string;
    homeActiveTab: string;
    setHomeActiveFilter: (filter: string) => void;
    setHomeActiveTab: (tab: string) => void;
    toast: Toast | null;
    showToast: (message: string, type?: Toast['type']) => void;
    searchResults: Product[] | null;
    searchFacets: SearchFacets | null;
    didYouMean: string | null;
    isSearchLoading: boolean;
    setSearchResults: (results: Product[] | null, facets?: SearchFacets | null, didYouMean?: string | null) => void;
    prefetchedProducts: Record<string, Product>;
    setPrefetchedProduct: (product: Product) => void;
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
            updateQuantity: (productId, quantity) => set((state) => {
                if (quantity <= 0) {
                    return { cart: state.cart.filter((item) => item.id !== productId) };
                }
                return {
                    cart: state.cart.map((item) =>
                        item.id === productId ? { ...item, quantity: Math.min(quantity, item.stock || 999) } : item
                    )
                };
            }),
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
            prefetchedProducts: {},
            setPrefetchedProduct: (product) => set((state) => ({
                prefetchedProducts: { ...state.prefetchedProducts, [product.id]: product }
            })),
            searchResults: null,
            searchFacets: null,
            didYouMean: null,
            isSearchLoading: false,
            setSearchResults: (results, facets = null, didYouMean = null) => set({ searchResults: results, searchFacets: facets, didYouMean: didYouMean }),
        }),
        {
            name: "velari-store",
            partialize: (state) => ({
                cart: state.cart,
                wishlist: state.wishlist,
                user: state.user,
                language: state.language,
                homeActiveFilter: state.homeActiveFilter,
                homeActiveTab: state.homeActiveTab,
            }),
            // Eski 'instagram-shop-storage' dan ma'lumotlarni ko'chirish
            onRehydrateStorage: () => (state) => {
                if (typeof window === 'undefined') return;
                try {
                    const oldKey = 'instagram-shop-storage';
                    const oldRaw = localStorage.getItem(oldKey);
                    const newRaw = localStorage.getItem('velari-store');
                    if (oldRaw && !newRaw && state) {
                        const old = JSON.parse(oldRaw);
                        if (old?.state) {
                            state.cart = old.state.cart || [];
                            state.wishlist = old.state.wishlist || [];
                            state.user = old.state.user || null;
                            state.language = old.state.language || 'uz';
                        }
                        localStorage.removeItem(oldKey);
                    }
                } catch {}
            },
        }
    )
);

