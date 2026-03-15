"use client";

import { ProductSkeleton } from "./ProductSkeleton";
import { ProductCard } from "./ProductCard";
import { WatchedProduct } from "./WatchedProduct";
import { Product, User, CartItem } from "@/types";
import { TranslationKeys } from "@/lib/translations";

interface ProductGridProps {
    products: Product[];
    loading: boolean;
    language: "uz" | "ru";
    t: TranslationKeys;
    cart: CartItem[];
    wishlist: Product[];
    user: User | null;
    toggleWishlist: (product: Product) => void;
    addToCart: (product: Product) => void;
    updateQuantity: (id: string, qty: number) => void;
    removeFromCart: (id: string) => void;
}

export const ProductGrid = ({
    products, loading, language, t, cart, wishlist, user, toggleWishlist, addToCart, updateQuantity, removeFromCart
}: ProductGridProps) => {
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 md:gap-x-6 gap-y-6 md:gap-y-10">
                {[...Array(12)].map((_, i) => (
                    <ProductSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="py-20 text-center text-gray-400 font-bold bg-gray-50/50 rounded-[40px] uppercase tracking-widest text-[10px]">
                {t.common.noProducts}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 md:gap-x-6 gap-y-6 md:gap-y-10">
            {products.map((item) => (
                <WatchedProduct key={item.id} product={item} userPhone={user?.phone}>
                    <ProductCard 
                        item={item}
                        language={language}
                        t={t}
                        cart={cart}
                        wishlist={wishlist}
                        toggleWishlist={toggleWishlist}
                        addToCart={addToCart}
                        updateQuantity={updateQuantity}
                        removeFromCart={removeFromCart}
                    />
                </WatchedProduct>
            ))}
        </div>
    );
};
