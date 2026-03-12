"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, Heart, ShoppingBag, User, MessageCircle, Clapperboard, Headset, LayoutGrid } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { translations } from "@/lib/translations";

export default function Navigation() {
    const { cart, language } = useStore();
    const pathname = usePathname();
    const t = translations[language];
    const [cartCount, setCartCount] = useState(0);

    const isReels = pathname === "/reels";

    useEffect(() => {
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    }, [cart]);

    return (
        <>
            {/* Desktop Sidebar Navigation */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col p-8 z-50">
                <Link href="/" className="relative w-full h-12 mb-12">
                    <Image
                        src="/logo.png"
                        alt="Velari"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </Link>
                
                <div className="flex-1 space-y-2">
                    <Link href="/" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${pathname === '/' ? 'bg-black text-white shadow-xl shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Home size={24} />
                        <span className="font-black uppercase tracking-widest text-[10px]">{t.nav.home}</span>
                    </Link>

                    <Link href="/catalog" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${pathname === '/catalog' ? 'bg-black text-white shadow-xl shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutGrid size={24} />
                        <span className="font-black uppercase tracking-widest text-[10px]">{language === 'uz' ? 'Katalog' : 'Каталог'}</span>
                    </Link>

                    <Link href="/cart" className={`flex items-center gap-4 p-4 rounded-2xl transition-all relative ${pathname === '/cart' ? 'bg-black text-white shadow-xl shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <ShoppingBag size={24} />
                        <span className="font-black uppercase tracking-widest text-[10px]">{t.nav.cart}</span>
                        {cartCount > 0 && (
                            <span className="absolute top-4 right-4 bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    <Link href="/messages" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${pathname === '/messages' ? 'bg-black text-white shadow-xl shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <MessageCircle size={24} />
                        <span className="font-black uppercase tracking-widest text-[10px]">{language === 'uz' ? 'DM Chat' : 'Чat'}</span>
                    </Link>
                </div>

                <div className="mt-auto pt-8 border-t border-gray-50">
                    <Link
                        href={isReels ? "/chat" : "/reels"}
                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isReels ? 'bg-orange-500 text-white' : 'bg-gray-100 text-black hover:bg-black hover:text-white'}`}
                    >
                        {isReels ? <Headset size={24} /> : <Clapperboard size={24} />}
                        <span className="font-black uppercase tracking-widest text-[10px]">{isReels ? "Support" : "Reels"}</span>
                    </Link>
                </div>
            </nav>

            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
                <nav className="w-full max-w-md bg-white/80 border-t border-gray-100/50 px-2 py-3 pb-8 flex justify-between items-end backdrop-blur-2xl pointer-events-auto">
                    <Link href="/" className={`flex flex-col items-center flex-1 transition-all duration-300 ${pathname === '/' ? 'text-black scale-110' : 'text-gray-400'}`}>
                        <Home size={22} strokeWidth={pathname === '/' ? 2.5 : 2} />
                        <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{t.nav.home}</span>
                    </Link>

                    <Link href="/catalog" className={`flex flex-col items-center flex-1 transition-all duration-300 ${pathname === '/catalog' ? 'text-black scale-110' : 'text-gray-400'}`}>
                        <LayoutGrid size={22} strokeWidth={pathname === '/catalog' ? 2.5 : 2} />
                        <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{language === 'uz' ? 'Katalog' : 'Каталог'}</span>
                    </Link>

                    {/* Central REELS / CHAT Button */}
                    <div className="flex-1 flex justify-center -mt-6">
                        <Link
                            href={isReels ? "/chat" : "/reels"}
                            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 shadow-2xl relative overflow-hidden
                                ${isReels
                                    ? "bg-black text-white rotate-[360deg] scale-110"
                                    : "bg-[#f0f0f0] text-black hover:bg-black hover:text-white"
                                }`}
                        >
                            {isReels ? (
                                <Headset size={24} strokeWidth={2.5} className="animate-in zoom-in duration-300" />
                            ) : (
                                <Clapperboard size={24} strokeWidth={2.5} className="animate-pulse" />
                            )}
                            <span className={`text-[8px] font-black uppercase mt-0.5 ${isReels ? 'text-white' : 'text-black'} group-hover:text-white`}>
                                {isReels ? "Chat" : "Reels"}
                            </span>

                            {!isReels && (
                                <div className="absolute top-0 right-0 p-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                </div>
                            )}
                        </Link>
                    </div>

                    <Link href="/cart" className={`flex flex-col items-center flex-1 transition-all duration-300 ${pathname === '/cart' ? 'text-black scale-110' : 'text-gray-400'}`}>
                        <div className="relative">
                            <ShoppingBag size={22} strokeWidth={pathname === '/cart' ? 2.5 : 2} />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{t.nav.cart}</span>
                    </Link>

                    <Link href="/messages" className={`flex flex-col items-center flex-1 transition-all duration-300 ${pathname === '/messages' ? 'text-black scale-110' : 'text-gray-400'}`}>
                        <MessageCircle size={22} strokeWidth={pathname === '/messages' ? 2.5 : 2} />
                        <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{language === 'uz' ? 'DM' : 'Чат'}</span>
                    </Link>
                </nav>
            </div>
        </>
    );
}
