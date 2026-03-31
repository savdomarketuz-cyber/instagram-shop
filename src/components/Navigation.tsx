"use client";

import Link from "next/link";
import { Search, Heart, ShoppingBag, MessageSquare, Clapperboard, LayoutGrid, User, ShoppingCart } from "lucide-react";
import Logo from "./Logo";
import { useStore } from "@/store/store";
import { usePathname, useRouter } from "next/navigation";
import { translations } from "@/lib/translations";
import { useState } from "react";

export default function Navigation() {
    const user = useStore(state => state.user);
    const cart = useStore(state => state.cart);
    const wishlist = useStore(state => state.wishlist);
    const language = useStore(state => state.language);
    const setHomeSearchQuery = useStore(state => state.setHomeSearchQuery);
    const pathname = usePathname();
    const router = useRouter();
    const t = translations[language];
    
    const [search, setSearch] = useState("");
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHomeSearchQuery(search);
        if (pathname !== "/") router.push("/");
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-[100] border-b border-gray-100 h-20 md:h-24">
            <div className="max-w-[1440px] mx-auto h-full px-4 md:px-10 flex items-center gap-4 md:gap-12">
                
                {/* Logo Section */}
                <Link href="/" className="shrink-0 group transition-transform active:scale-95">
                    <Logo size="md" className="!items-start" />
                </Link>

                {/* Catalog Button */}
                <Link href="/catalog" className="hidden lg:flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all group shadow-xl shadow-black/10">
                    <LayoutGrid size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{language === 'uz' ? 'Katalog' : 'Каталог'}</span>
                </Link>

                {/* Search Bar - Globalized */}
                <form onSubmit={handleSearch} className="flex-1 relative group max-w-2xl">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <Search className="text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder={t.common.search}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setHomeSearchQuery(e.target.value);
                        }}
                        className="w-full bg-[#F2F3F5] border-2 border-transparent rounded-[24px] py-4 pl-14 pr-6 text-base font-bold placeholder:text-gray-400 focus:bg-white focus:border-black outline-none transition-all shadow-sm hover:bg-[#EBEDF0]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
                        <button type="submit" className="bg-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                            QIDIRISH
                        </button>
                    </div>
                </form>

                {/* Navigation Actions */}
                <div className="flex items-center gap-2 md:gap-6 shrink-0">
                    
                    {/* Reels */}
                    <Link href="/reels" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/reels' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                        <div className="relative p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                            <Clapperboard size={22} strokeWidth={pathname === '/reels' ? 3 : 2} />
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">Reels</span>
                    </Link>

                    {/* Orders */}
                    <Link href="/account?tab=orders" className={`flex flex-col items-center gap-1 group transition-all ${pathname?.includes('/account') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                        <div className="p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                            <ShoppingBag size={22} strokeWidth={pathname?.includes('/account') ? 3 : 2} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">{language === 'uz' ? 'Buyurtmalar' : 'Заказы'}</span>
                    </Link>

                    {/* Wishlist */}
                    <Link href="/wishlist" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/wishlist' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                        <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                            <Heart size={22} fill={wishlist.length > 0 ? "black" : "none"} strokeWidth={pathname === '/wishlist' ? 3 : 2} className={wishlist.length > 0 ? "text-black" : ""} />
                            {wishlist.length > 0 && (
                                <span className="absolute top-1 right-1 bg-black text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                    {wishlist.length}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">{language === 'uz' ? 'Saralangan' : 'Избранное'}</span>
                    </Link>

                    {/* Cart */}
                    <Link href="/cart" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/cart' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                        <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                            <ShoppingCart size={22} strokeWidth={pathname === '/cart' ? 3 : 2} />
                            {cartCount > 0 && (
                                <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white animate-bounce">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">{t.nav.cart}</span>
                    </Link>

                    {/* Login / Chat Dynamic Button */}
                    <div className="pl-4 md:pl-6 border-l border-gray-100 flex items-center gap-4">
                        {user ? (
                            <Link href="/messages" className="flex items-center gap-3 bg-[#F2F3F5] hover:bg-black hover:text-white px-6 py-3.5 rounded-2xl transition-all group">
                                <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">Chat</span>
                            </Link>
                        ) : (
                            <Link href="/login" className="bg-[#F2F3F5] hover:bg-black hover:text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                                Kirish
                            </Link>
                        )}
                    </div>

                </div>
            </div>

            {/* Mobile Bottom Bar - Essential Actions */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 px-6 py-3 flex justify-between items-center pb-8">
                <Link href="/" className={`p-2 ${pathname === '/' ? 'text-black' : 'text-gray-400'}`}>
                    <LayoutGrid size={24} />
                </Link>
                <Link href="/reels" className={`p-2 ${pathname === '/reels' ? 'text-black' : 'text-gray-400'}`}>
                    <Clapperboard size={24} />
                </Link>
                <Link href="/cart" className="relative p-2 text-black">
                    <ShoppingCart size={24} strokeWidth={3} />
                    {cartCount > 0 && <span className="absolute top-1 right-1 bg-red-600 w-2 h-2 rounded-full border border-white" />}
                </Link>
                <Link href="/wishlist" className={`p-2 ${pathname === '/wishlist' ? 'text-black' : 'text-gray-400'}`}>
                    <Heart size={24} />
                </Link>
                <Link href={user ? "/messages" : "/login"} className={`p-2 ${user ? 'text-black' : 'text-gray-400'}`}>
                    <User size={24} />
                </Link>
            </div>
        </header>
    );
}
