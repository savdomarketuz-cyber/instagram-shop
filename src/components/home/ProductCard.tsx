"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, Check, Minus, Plus, Truck } from "lucide-react";
import { useStore } from "@/store/store";

import { Product, CartItem } from "@/types";
import { TranslationKeys } from "@/lib/translations";
import { getProductSlug } from "@/lib/slugify";

interface ProductCardProps {
    item: Product;
    language: "uz" | "ru";
    t: TranslationKeys;
    cart: CartItem[];
    wishlist: Product[];
    toggleWishlist: (product: Product) => void;
    addToCart: (product: Product) => void;
    updateQuantity: (id: string, qty: number) => void;
    removeFromCart: (id: string) => void;
    priority?: boolean;
}

export const ProductCard = ({
    item, language, t, cart, wishlist, toggleWishlist, addToCart, updateQuantity, removeFromCart, priority = false
}: ProductCardProps) => {
    const isInCart = cart.find(ci => ci.id === item.id);
    const isWished = wishlist.some(w => w.id === item.id);
    const totalStock = item.stockDetails ? Object.values(item.stockDetails).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;

    const handleToggleWishlist = (e: React.MouseEvent) => {

        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(item);
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart(item);
    };

    const mainMedia = item.images?.[0] || item.image || "/placeholder.png";
    const isVideo = mainMedia.toLowerCase().endsWith('.mp4');

    return (
        <div 
            className="group relative flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 active:scale-[0.97] transition-transform duration-150"
            style={{ overflowAnchor: 'none' }}
        >
            <Link 
                href={`/${language}/products/${getProductSlug(item)}`} 
                className="flex flex-col flex-1 outline-none" 
                prefetch={true}
                onClick={() => {
                    const query = useStore.getState().homeSearchQuery;
                    if (query && query.trim().length >= 2) {
                        fetch('/api/analytics/search-click', {
                            method: 'POST',
                            body: JSON.stringify({ productId: item.id, query: query.trim() })
                        }).catch(e => console.error("Click track error", e));
                    }
                }}
            >
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 border-b border-gray-50">
                    {isVideo ? (
                        <video
                            src={mainMedia}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                        />
                    ) : (
                        <Image
                            src={mainMedia}
                            alt={(item.image_metadata?.[mainMedia]?.[`alt_${language}` as keyof typeof item.image_metadata[string]] as string) || (item[`name_${language}` as keyof typeof item] as string) || item.name}
                            fill
                            sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 20vw, 16vw"
                            className="object-cover"
                            priority={priority}
                            referrerPolicy="no-referrer"
                            placeholder={item.image_metadata?.[mainMedia]?.blurDataURL ? "blur" : "empty"}
                            blurDataURL={item.image_metadata?.[mainMedia]?.blurDataURL}
                        />
                    )}

                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        {(item.oldPrice || 0) > 0 && (item.oldPrice || 0) > item.price && (
                            <div className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                -{Math.round((((item.oldPrice || 0) - item.price) / (item.oldPrice || 1)) * 100)}%
                            </div>
                        )}
                        {item.sales > 50 && (
                            <div className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                TOP
                            </div>
                        )}
                    </div>

                    {item.isOriginal && (
                        <div className="absolute bottom-2 left-2 z-10 bg-white/95 backdrop-blur-md border border-gray-100 px-2 py-1 rounded-lg shadow-xl shadow-green-500/10 flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white" strokeWidth={5} />
                            </div>
                            <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{t.common.original}</span>
                        </div>
                    )}

                    <button
                        onClick={handleToggleWishlist}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 shadow-sm ${isWished ? "bg-red-500 text-white" : "bg-white/80 text-gray-900 hover:bg-white"}`}
                    >
                        <Heart size={14} fill={isWished ? "currentColor" : "none"} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-xs font-medium text-gray-800 line-clamp-2 h-8 mb-2 leading-tight">
                        {item[`name_${language}`] || item.name}
                    </h3>

                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex items-center bg-yellow-400/10 px-1 py-0.5 rounded">
                            <Star size={10} className="text-yellow-500 fill-yellow-500 mr-1" />
                            <span className="text-[10px] font-black text-yellow-700">
                                {(item.reviewCount || 0) > 0 ? (item.rating || 0).toFixed(1) : t.common.new}
                            </span>
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold">({item.reviewCount || 0})</span>
                    </div>

                    <div className="mt-auto flex flex-col mb-3">
                        {(item.oldPrice || 0) > 0 && (
                            <span className="text-[10px] text-gray-400 line-through font-bold">{item.oldPrice?.toLocaleString()} so'm</span>
                        )}
                        <span className={`text-sm font-black italic ${(item.oldPrice || 0) > item.price ? "text-red-500" : "text-black"}`}>
                            {item.price.toLocaleString()} so'm
                        </span>
                    </div>
                </div>
            </Link>

            <div className="px-3 pb-3">
                {isInCart ? (
                    <div className="w-full h-[42px] bg-white border border-gray-200 rounded-xl flex items-center justify-between px-1 overflow-hidden shadow-sm">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (isInCart.quantity > 1) {
                                    updateQuantity(item.id, isInCart.quantity - 1);
                                } else {
                                    removeFromCart(item.id);
                                }
                            }}
                            className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                        >
                            <Minus size={14} strokeWidth={2.5} />
                        </button>
                        <span className="text-sm font-bold text-gray-800">{isInCart.quantity}</span>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (isInCart.quantity < (totalStock || 999)) {
                                    updateQuantity(item.id, isInCart.quantity + 1);
                                }
                            }}
                            className="w-10 h-full flex items-center justify-center text-black hover:bg-gray-50 transition-colors"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAddToCart}
                        className="w-full h-[42px] bg-[#2d6e3e] hover:bg-[#1f5430] text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/10"
                    >
                        <Truck size={12} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-tight">
                            {t.common.tomorrow}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};
