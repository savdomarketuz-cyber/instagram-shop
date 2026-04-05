"use client";

import { ProductCard } from "@/components/home/ProductCard";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { Product, Language } from "@/types";
import { Sparkles } from "lucide-react";

interface LinkedProductsProps {
    products: Product[];
    lang: Language;
}

export default function LinkedProducts({ products, lang }: LinkedProductsProps) {
    const { 
        cart, 
        wishlist, 
        toggleWishlist, 
        addToCart, 
        updateQuantity, 
        removeFromCart 
    } = useStore();
    
    const t = translations[lang];

    if (products.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-0 mt-32">
            <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                    <Sparkles size={24} />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">
                    {t.blog.relatedProducts}
                </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard 
                        key={product.id} 
                        item={product} 
                        language={lang}
                        t={t}
                        cart={cart}
                        wishlist={wishlist}
                        toggleWishlist={toggleWishlist}
                        addToCart={addToCart}
                        updateQuantity={updateQuantity}
                        removeFromCart={removeFromCart}
                    />
                ))}
            </div>
        </div>
    );
}
