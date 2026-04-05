"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Home, ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { mapProduct } from "@/lib/mappers";
import { useStore } from "@/store/store";
import { getAiRecommendations } from "@/lib/ai";
import { translations } from "@/lib/translations";
import { ProductCard } from "@/components/home/ProductCard";
import type { Product } from "@/types";

interface BrandedEmptyStateProps {
    title?: string;
    description?: string;
    type?: '404' | 'not-found' | 'error';
    showPopular?: boolean;
}

export default function BrandedEmptyState({ 
    title, 
    description, 
    type = 'not-found',
    showPopular = true
}: BrandedEmptyStateProps) {
    const { 
        language, cart, wishlist, toggleWishlist, addToCart, 
        updateQuantity, removeFromCart, user 
    } = useStore();
    const t = translations[language];

    const [popularProducts, setPopularProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(showPopular);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!showPopular) return;
            setLoading(true);

            // Fetch popular products as baseline
            const { data: popData } = await supabase
                .from("products")
                .select("*")
                .eq("is_deleted", false)
                .order("sales", { ascending: false })
                .limit(18);
            
            let finalProducts = popData ? popData.map(mapProduct) : [];

            // AI Recommendations if user logged in
            if (user?.phone && user.phone !== 'ADMIN' && finalProducts.length > 0) {
                try {
                    const { data: interests } = await supabase
                        .from("user_interests")
                        .select("*")
                        .eq("id", user.phone)
                        .single();
                    
                    if (interests) {
                        const recIds = await getAiRecommendations(interests, finalProducts, user.phone);
                        if (recIds && recIds.length > 0) {
                            // Prioritize recs but keep some popular as well
                            const recs = finalProducts.filter(p => recIds.includes(p.id));
                            const others = finalProducts.filter(p => !recIds.includes(p.id));
                            finalProducts = [...recs, ...others].slice(0, 12);
                        }
                    }
                } catch (e) { console.error("AI Recs failed", e); }
            } else {
                finalProducts = finalProducts.slice(0, 12);
            }

            setPopularProducts(finalProducts);
            setLoading(false);
        };
        fetchAllData();
    }, [showPopular, user?.phone]);

    const displayTitle = title || (type === '404' ? (language === 'uz' ? "Sahifa topilmadi" : "Страница не найдена") : (language === 'uz' ? "Mahsulot topilmadi" : "Товар не найден"));
    const displayDesc = description || (language === 'uz' 
        ? "Kechirasiz, siz qidirayotgan ma'lumot tizimda mavjud emas yoki o'chirilgan bo'lishi mumkin." 
        : "К сожалению, запрашиваемая вами информация не существует в системе или могла быть удалена.");

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
                <div className="relative mb-10 inline-block">
                    <div className="text-[120px] md:text-[200px] font-black italic tracking-tighter leading-none text-gray-50 select-none animate-in fade-in zoom-in duration-1000">
                        {type === '404' ? '404' : 'OOP!'}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-black rounded-[40px] flex items-center justify-center shadow-2xl rotate-12 animate-bounce duration-[2000ms]">
                            <Search size={40} className="text-white -rotate-12" strokeWidth={3} />
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-6 text-black">
                    {displayTitle}
                </h1>
                <p className="text-sm md:text-lg text-gray-400 font-medium max-w-xl mx-auto mb-12 leading-relaxed">
                    {displayDesc}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link href="/" className="px-10 py-5 bg-black text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        <Home size={18} strokeWidth={3} /> {language === 'uz' ? "Bosh sahifa" : "Главная"}
                    </Link>
                    <Link href="/catalog" className="px-10 py-5 bg-gray-50 text-black border border-gray-100 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-white hover:shadow-xl active:scale-95 transition-all flex items-center gap-3">
                        <ShoppingBag size={18} strokeWidth={3} /> {language === 'uz' ? "Katalog" : "Каталог"}
                    </Link>
                </div>
            </div>

            {/* Popular Products Section */}
            {showPopular && (
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 pb-32">
                    <div className="flex items-center justify-between mb-12">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Velari Trend</p>
                            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-black">
                                {language === 'uz' ? "Ommabop mahsulotlar" : "Популярные товары"}
                            </h2>
                        </div>
                        <Link href="/catalog" className="text-[10px] font-black uppercase tracking-widest text-black border-b-2 border-black pb-1 hover:text-gray-400 hover:border-gray-400 transition-all">
                            {language === 'uz' ? "Barchasi" : "Все"}
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-black mb-4" size={40} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Yuklanmoqda...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8">
                            {popularProducts.map((item, index) => (
                                <div key={item.id} className="animate-in fade-in slide-in-from-bottom-10" style={{ animationDelay: `${index * 50}ms` }}>
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Footer Brand Label */}
            <div className="border-t border-gray-50 py-10 text-center">
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em] select-none">
                    Velari Market • Premium Electronics Experience
                </p>
            </div>
        </div>
    );
}
