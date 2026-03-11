"use client";

import { Loader2 } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { WatchedProduct } from "./WatchedProduct";

interface ProductGridProps {
    products: any[];
    loading: boolean;
    language: "uz" | "ru";
    t: any;
    cart: any[];
    wishlist: any[];
    user: any;
    toggleWishlist: (product: any) => void;
    addToCart: (product: any) => void;
    updateQuantity: (id: string, qty: number) => void;
    removeFromCart: (id: string) => void;
}

export const ProductGrid = ({
    products, loading, language, t, cart, wishlist, user, toggleWishlist, addToCart, updateQuantity, removeFromCart
}: ProductGridProps) => {
    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-purple-600" />
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="py-20 text-center text-gray-400 font-medium">
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
