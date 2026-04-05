"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { Trash2, Heart, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import { getProductSlug } from "@/lib/slugify";

export default function WishlistPage() {
    const { wishlist, toggleWishlist, user, language } = useStore();
    const t = translations[language];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (!user) {
        return (
            <div className="p-6 bg-white min-h-screen flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                    <Heart size={40} />
                </div>
                <p className="text-gray-500 font-medium">
                    {language === 'uz' ? 'Saralanganlarni ko\'rish uchun tizimga kiring' : 'Войдите в систему, чтобы увидеть избранное'}
                </p>
                <Link href="/login" className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg">
                    {t.account.login}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-white min-h-screen pb-24 w-full">
            <div className="flex items-center justify-between gap-4 mb-8 mt-4 w-full min-w-0">
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic truncate min-w-0 flex-1">{t.nav.wishlist}</h1>
                <Link href="/orders" className="flex items-center gap-2 px-6 py-3 bg-gray-50 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100 shadow-sm active:scale-95 group">
                    <Package size={14} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                    {language === 'uz' ? 'Buyurtmalar' : 'Заказы'}
                </Link>
            </div>

            {wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Heart size={48} className="mb-4 opacity-20" />
                    <p className="font-medium">{language === 'uz' ? 'Hozircha hech narsa yo\'q' : 'Пока ничего нет'}</p>
                    <Link href="/" className="mt-4 text-black font-bold border-b-2 border-black">
                        {language === 'uz' ? 'Mahsulotlarni ko\'rish' : 'Посмотреть товары'}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                    {wishlist.map((item) => (
                        <div key={item.id} className="relative group">
                            <Link href={`/products/${getProductSlug(item)}`} className="block">
                                <div className="aspect-[3/4] overflow-hidden rounded-[24px] md:rounded-[28px] bg-gray-50 mb-3 shadow-sm relative">
                                    <img 
                                        src={item.imageUrl || item.image || ''} 
                                        alt={item[`name_${language}`] || item.name} 
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                                    />
                                </div>
                                <h3 className="text-[12px] md:text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.5em]">
                                    {item[`name_${language}`] || item.name}
                                </h3>
                                <p className="text-sm font-black text-black mt-1 break-words">
                                    {item.price?.toLocaleString().replace(/\u00A0/g, ' ')} so'm
                                </p>
                            </Link>
                            <button
                                onClick={() => toggleWishlist(item)}
                                className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-2xl text-red-500 shadow-xl active:scale-90 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
