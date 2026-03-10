"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, Check, Minus, Plus, Truck } from "lucide-react";

interface ProductCardProps {
    item: any;
    language: "uz" | "ru";
    t: any;
    cart: any[];
    wishlist: any[];
    toggleWishlist: (product: any) => void;
    addToCart: (product: any) => void;
    updateQuantity: (id: string, qty: number) => void;
    removeFromCart: (id: string) => void;
}

export const ProductCard = ({
    item, language, t, cart, wishlist, toggleWishlist, addToCart, updateQuantity, removeFromCart
}: ProductCardProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isInCart = cart.find(ci => ci.id === item.id);
    const isWished = wishlist.some(w => w.id === item.id);

    const totalStock = item.stockDetails ? Object.values(item.stockDetails).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist({
            id: item.id,
            name: item.name,
            name_uz: item.name_uz,
            name_ru: item.name_ru,
            price: item.price,
            oldPrice: item.oldPrice,
            imageUrl: item.image,
            category: item.category,
            category_uz: item.category_uz,
            category_ru: item.category_ru,
            stock: totalStock
        });
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart({
            id: item.id,
            name: item.name,
            name_uz: item.name_uz,
            name_ru: item.name_ru,
            price: item.price,
            oldPrice: item.oldPrice,
            imageUrl: item.image,
            category: item.category,
            category_uz: item.category_uz,
            category_ru: item.category_ru,
            stock: totalStock
        });
    };

    return (
        <div 
            className="group relative flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 active:scale-[0.98] transition-all"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Link href={`/products/${item.id}`} className="flex flex-col flex-1 outline-none">
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 border-b border-gray-50">
                    <Image
                        src={item.images?.[0] || item.image || "/placeholder.png"}
                        alt={item[`name_${language}`] || item.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className={`object-cover transition-transform duration-700 group-hover:scale-105 ${item.videoUrl && isHovered ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />

                    {item.videoUrl && (
                        <video
                            ref={videoRef}
                            src={item.videoUrl}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                            muted
                            loop
                            playsInline
                            onMouseEnter={() => videoRef.current?.play()}
                            onMouseLeave={() => {
                                videoRef.current?.pause();
                                if (videoRef.current) videoRef.current.currentTime = 0;
                            }}
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
                            <span className="text-[10px] text-gray-400 line-through font-bold">{item.oldPrice?.toLocaleString()} $</span>
                        )}
                        <span className={`text-sm font-black italic ${(item.oldPrice || 0) > item.price ? "text-red-500" : "text-black"}`}>
                            {item.price.toLocaleString()} $
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
                        className="w-full h-[42px] bg-[#7000FF] hover:bg-[#5a00cc] text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10"
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
