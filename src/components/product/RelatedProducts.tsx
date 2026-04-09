"use client";

import { Loader2 } from "lucide-react";
import { ProductCard } from "../home/ProductCard";

import { Product, CartItem, Language } from "@/types";
import { TranslationType } from "@/lib/translations";

interface RelatedProductsProps {
    relatedProducts: Product[];
    boughtTogether: Product[];
    popularProducts: Product[];
    language: Language;
    cart: CartItem[];
    wishlist: Product[];
    addToCart: (p: Product) => void;
    toggleWishlist: (p: Product) => void;
    updateQuantity: (id: string, q: number) => void;
    removeFromCart: (id: string) => void;
    popularLoading: boolean;
    t: TranslationType;
}

export const RelatedProducts = ({
    relatedProducts, boughtTogether, popularProducts, language, cart, wishlist, addToCart, toggleWishlist, updateQuantity, removeFromCart, popularLoading, t
}: RelatedProductsProps) => {

    const renderGrid = (products: Product[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 md:gap-x-6 gap-y-6 md:gap-y-10 px-4 max-w-[1440px] mx-auto">
            {products.map(p => (
                <ProductCard 
                    key={p.id}
                    item={p}
                    language={language}
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
    );

    return (
        <div className="mt-20 space-y-32">
            {relatedProducts.length > 0 && (
                <section className="animate-in fade-in duration-700">
                    <h2 className="text-xl font-bold text-gray-900 mb-8 px-8 flex items-center justify-between">
                        {t.product.mayLike}
                        <span className="text-[10px] font-black uppercase text-gray-400">AI Choice</span>
                    </h2>
                    {renderGrid(relatedProducts)}
                </section>
            )}

            {boughtTogether.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <h2 className="text-xl font-bold text-gray-900 mb-8 px-8 flex items-center justify-between">
                        {t.product.boughtTogether}
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-lg">Combo Deal</span>
                    </h2>
                    <div className="flex overflow-x-auto no-scrollbar gap-x-2 pb-8 px-4">
                        {boughtTogether.map(p => (
                            <div key={p.id} className="flex-shrink-0 w-[180px]">
                                <ProductCard 
                                    item={p}
                                    language={language}
                                    t={t}
                                    cart={cart}
                                    wishlist={wishlist}
                                    toggleWishlist={toggleWishlist}
                                    addToCart={addToCart}
                                    updateQuantity={updateQuantity}
                                    removeFromCart={removeFromCart}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {popularProducts.length > 0 && (
                <section className="animate-in fade-in duration-1000 mt-20">
                    <div className="mb-10 text-center">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">{t.product.popular}</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.product.bestsellers}</p>
                    </div>
                    {renderGrid(popularProducts)}
                    {popularLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-200" size={32} /></div>}
                </section>
            )}
        </div>
    );
};
