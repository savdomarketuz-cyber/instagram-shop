"use client";

import Link from "next/link";
import { Search, Heart, ShoppingBag, MessageSquare, Clapperboard, LayoutGrid, User, ShoppingCart } from "lucide-react";
import Logo from "./Logo";
import { useStore } from "@/store/store";
import { usePathname, useRouter } from "next/navigation";
import { translations } from "@/lib/translations";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function Navigation() {
    const user = useStore(state => state.user);
    const cart = useStore(state => state.cart);
    const wishlist = useStore(state => state.wishlist);
    const language = useStore(state => state.language);
    const setHomeSearchQuery = useStore(state => state.setHomeSearchQuery);
    const pathname = usePathname();
    const router = useRouter();
    const t = translations[language];
    
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState("");
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const isHomePage = pathname === "/";
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    // Handle Search Focus from other pages
    useEffect(() => {
        if (isHomePage && searchParams?.get('focus') === 'true' && inputRef.current) {
            inputRef.current.focus();
            // Optional: push to clean URL without params
            router.replace('/', { scroll: false });
        }
    }, [isHomePage, searchParams, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHomeSearchQuery(search);
        if (pathname !== "/") router.push("/");
    };

    return (
        <>
            {/* Main Header - Top Fixed */}
            {/* Logic: Hidden on mobile if NOT on home page */}
            <header className={`fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-[100] border-b border-gray-100 h-16 md:h-24 ${!isHomePage ? 'hidden md:block' : 'block'}`}>
                <div className="max-w-[1440px] mx-auto h-full px-4 md:px-10 flex items-center gap-3 md:gap-12">
                    
                    {/* Logo Section (Desktop) / Katalog Button (Mobile Home) */}
                    <div className="shrink-0 group">
                        <div className="md:hidden">
                            <Link href="/catalog" className="flex items-center gap-2 bg-[#E8F5EC] px-4 py-2.5 rounded-xl active:scale-95 transition-all outline-none">
                                <LayoutGrid size={20} strokeWidth={3} className="text-[#2d6e3e]" />
                                <span className="text-[11px] font-black uppercase tracking-tighter text-[#2d6e3e]">Katalog</span>
                            </Link>
                        </div>
                        <div className="hidden md:block">
                            <Link href="/" className="transition-transform active:scale-95 flex">
                                <Logo size="md" className="!items-start" />
                            </Link>
                        </div>
                    </div>

                    {/* Catalog Button (Desktop only) */}
                    <Link href="/catalog" className="hidden lg:flex items-center gap-3 bg-[#2d6e3e] text-white px-6 py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all group shadow-xl shadow-emerald-800/20">
                        <LayoutGrid size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{language === 'uz' ? 'Katalog' : 'Каталог'}</span>
                    </Link>

                    {/* Search Bar - Globalized */}
                    <form onSubmit={handleSearch} className="flex-1 relative group max-w-2xl">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t.common.search}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setHomeSearchQuery(e.target.value);
                            }}
                            className="w-full bg-[#F5F9F6] border-2 border-transparent rounded-xl md:rounded-2xl py-2 md:py-4 pl-10 md:pl-14 pr-4 md:pr-6 text-xs md:text-base font-bold placeholder:text-gray-400 focus:bg-white focus:border-[#2d6e3e]/30 focus:ring-4 focus:ring-[#2d6e3e]/5 outline-none transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
                            <button type="submit" className="bg-[#2d6e3e] text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1f5430] active:scale-95 transition-all">
                                QIDIRISH
                            </button>
                        </div>
                    </form>

                    {/* Desktop Navigation Actions (HIDDEN on Mobile) */}
                    <div className="hidden md:flex items-center gap-2 md:gap-6 shrink-0 h-full">
                        
                        <Link href="/reels" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/reels' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="relative p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                                <Clapperboard size={22} strokeWidth={pathname === '/reels' ? 3 : 2} className="group-hover:scale-110 group-hover:-rotate-12 group-hover:text-black transition-all duration-300" />
                                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">Reels</span>
                        </Link>

                        <Link href="/account?tab=orders" className={`flex flex-col items-center gap-1 group transition-all ${pathname?.includes('/account') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                                <ShoppingBag size={22} strokeWidth={pathname?.includes('/account') ? 3 : 2} className="group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:text-black transition-all duration-300" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{language === 'uz' ? 'Buyurtmalar' : 'Заказы'}</span>
                        </Link>

                        <Link href="/wishlist" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/wishlist' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                                <Heart size={22} fill={wishlist.length > 0 ? "black" : "none"} strokeWidth={pathname === '/wishlist' ? 3 : 2} className={`transition-all duration-500 group-hover:scale-125 ${wishlist.length > 0 ? "text-black animate-pulse" : ""}`} />
                                {wishlist.length > 0 && (
                                    <span className="absolute top-1 right-1 bg-black text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                        {wishlist.length}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{language === 'uz' ? 'Saralangan' : 'Избранное'}</span>
                        </Link>

                        <Link href="/cart" className={`flex flex-col items-center gap-1 group transition-all ${pathname === '/cart' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                                <ShoppingCart size={22} strokeWidth={pathname === '/cart' ? 3 : 2} className="group-hover:translate-x-1.5 group-hover:-rotate-6 transition-all duration-300" />
                                {cartCount > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white animate-bounce">
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{t.nav.cart}</span>
                        </Link>

                        <div className="pl-4 md:pl-6 border-l border-gray-100 items-center gap-4 hidden lg:flex">
                            {user ? (
                                <Link href="/messages" className="flex items-center gap-3 bg-[#F2F3F5] hover:bg-black hover:text-white px-6 py-3.5 rounded-2xl transition-all group shadow-sm hover:shadow-xl">
                                    <MessageSquare size={18} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">Chat</span>
                                </Link>
                            ) : (
                                <Link href="/login" className="bg-[#F2F3F5] hover:bg-black hover:text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-xl">
                                    Kirish
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* iOS-style Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center z-[110]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}>
                <Link href="/" className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === '/' ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <LayoutGrid size={24} strokeWidth={pathname === '/' ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Asosiy</span>
                </Link>
                <Link href="/reels" className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === '/reels' ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <Clapperboard size={24} strokeWidth={pathname === '/reels' ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Reels</span>
                </Link>
                <Link href="/cart" className={`relative flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === '/cart' ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <ShoppingCart size={24} strokeWidth={pathname === '/cart' ? 2.5 : 1.8} />
                    {cartCount > 0 && <span className="absolute top-1 right-1 bg-red-500 w-4 h-4 flex items-center justify-center rounded-full text-white text-[9px] font-bold">{cartCount}</span>}
                    <span className="text-[10px] font-semibold">Savat</span>
                </Link>
                <Link href="/wishlist" className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === '/wishlist' ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <Heart size={24} strokeWidth={pathname === '/wishlist' ? 2.5 : 1.8} fill={pathname === '/wishlist' ? 'currentColor' : 'none'} />
                    <span className="text-[10px] font-semibold">Saralar</span>
                </Link>
                <Link href={user ? "/account" : "/login"} className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname?.includes('/account') ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <User size={24} strokeWidth={pathname?.includes('/account') ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Profil</span>
                </Link>
            </nav>
        </>
    );
}
