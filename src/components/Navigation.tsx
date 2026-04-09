"use client";

import Link from "next/link";
import { Search, Heart, ShoppingBag, MessageSquare, Clapperboard, LayoutGrid, User, ShoppingCart, BookOpen, Camera, Loader2, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Logo from "./Logo";
import { getProductSlug } from "@/lib/slugify";
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
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);


    const isHomePage = pathname === `/${language}` || pathname === `/`;

    // Handle Search Focus from other pages
    useEffect(() => {
        if (isHomePage && searchParams?.get('focus') === 'true' && inputRef.current) {
            inputRef.current.focus();
            router.replace(`/${language}`, { scroll: false });
        }
    }, [isHomePage, searchParams, router, language]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const formObj = inputRef.current?.closest('form');
            if (formObj && !formObj.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { setSearchResults, isSearchLoading, setHomeSearchQuery: setStoreGlobalQuery } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = async (e?: React.FormEvent, forceQuery?: string) => {
        if (e) e.preventDefault();
        const activeQuery = forceQuery || search;
        
        setShowSuggestions(false);
        if (!activeQuery.trim()) {
            setSearchResults(null);
            return;
        }

        useStore.setState({ isSearchLoading: true });
        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: activeQuery, userPhone: user?.phone })
            });
            const data = res.ok ? await res.json() : { results: [], facets: null, didYouMean: null };
            setSearchResults(data.results || [], data.facets || null, data.didYouMean || null);
            setStoreGlobalQuery(activeQuery);
            if (!isHomePage) router.push(`/${language}`);
        } catch (err) {
            console.error("Semantic search failed", err);
        } finally {
            useStore.setState({ isSearchLoading: false });
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        
        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            return;
        }

        setShowSuggestions(true);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        
        debounceTimer.current = setTimeout(async () => {
            setIsSuggesting(true);
            try {
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: val, suggest: true, userPhone: user?.phone })
                });
                const data = await res.json();
                if (data.results) setSuggestions(data.results);
            } catch (err) {
                console.error("Live suggest failed: ", err);
            } finally {
                setIsSuggesting(false);
            }
        }, 300);
    };

    const handleVisualSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        useStore.setState({ isSearchLoading: true });
        if (!isHomePage) router.push(`/${language}`);

        try {
            // 1. Upload to S3 proxy or send as base64 (for speed we send base64 to search API)
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });
                const data = await res.json();
                setSearchResults(data.results || []);
                setSearch(""); // clear text
                useStore.setState({ isSearchLoading: false });
            };
        } catch (err) {
            console.error("Visual search failed", err);
            useStore.setState({ isSearchLoading: false });
        }
    };

    const l = (path: string) => `/${language}${path === '/' ? '' : path}`;

    return (
        <>
            {/* Main Header - Top Fixed */}
            <header className={`fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-[100] border-b border-gray-100 h-16 md:h-24 ${!isHomePage ? 'hidden md:block' : 'block'}`}>
                <div className="max-w-[1440px] mx-auto h-full px-4 md:px-10 flex items-center gap-3 md:gap-12">
                    
                    <div className="shrink-0 group">
                        <div className="md:hidden">
                            <Link href={l("/catalog")} className="flex items-center gap-2 bg-[#E8F5EC] px-4 py-2.5 rounded-xl active:scale-95 transition-all outline-none">
                                <LayoutGrid size={20} strokeWidth={3} className="text-[#2d6e3e]" />
                                <span className="text-[11px] font-black uppercase tracking-tighter text-[#2d6e3e]">Katalog</span>
                            </Link>
                        </div>
                        <div className="hidden md:block">
                            <Link href={l("/")} className="transition-transform active:scale-95 flex">
                                <Logo size="md" className="!items-start" />
                            </Link>
                        </div>
                    </div>

                    <Link href={l("/catalog")} className="hidden lg:flex items-center gap-3 bg-[#2d6e3e] text-white px-6 py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all group shadow-xl shadow-emerald-800/20">
                        <LayoutGrid size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{language === 'uz' ? 'Katalog' : 'Каталог'}</span>
                    </Link>

                    <form onSubmit={handleSearch} className="flex-1 relative group max-w-2xl">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t.common.search}
                            value={search}
                            onChange={handleSearchChange}
                            onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
                            className="w-full bg-[#F5F9F6] border-2 border-transparent rounded-xl md:rounded-2xl py-2 md:py-4 pl-10 md:pl-14 pr-12 md:pr-16 text-xs md:text-base font-bold placeholder:text-gray-400 focus:bg-white focus:border-[#2d6e3e]/30 focus:ring-4 focus:ring-[#2d6e3e]/5 outline-none transition-all shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1 md:gap-2">
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setSearch(""); 
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                        setSearchResults(null); 
                                        setStoreGlobalQuery("");
                                        if (debounceTimer.current) clearTimeout(debounceTimer.current);
                                    }}
                                    className="p-2 text-gray-400 hover:text-black transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${isSearchLoading ? 'bg-black text-white' : 'text-gray-400 hover:text-[#2d6e3e] hover:bg-white shadow-sm'}`}
                            >
                                {isSearchLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={20} />}
                            </button>
                        </div>

                        {/* Live Suggestions Dropdown */}
                        {showSuggestions && (search.trim().length > 0) && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[120]">
                                {isSuggesting ? (
                                    <div className="flex items-center justify-center p-6 bg-gray-50/50">
                                        <Loader2 size={24} className="animate-spin text-black/20" />
                                    </div>
                                ) : suggestions.length > 0 ? (
                                    <div className="flex flex-col max-h-[60vh] overflow-y-auto">
                                        {suggestions.map((item, idx) => (
                                            <Link 
                                                key={item.id} 
                                                href={`/${language}/products/${getProductSlug(item)}`}
                                                onClick={() => { 
                                                    setShowSuggestions(false); 
                                                    if (search.trim().length >= 2) {
                                                        fetch('/api/analytics/search-click', { method: 'POST', body: JSON.stringify({ productId: item.id, query: search.trim() }) }).catch(e => console.error("Click track error", e));
                                                    }
                                                }}
                                                className={`flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
                                            >
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative">
                                                    <Image 
                                                        src={item.image || item.images?.[0] || '/placeholder.png'} 
                                                        alt={item[`name_${language}`] || item.name} 
                                                        fill 
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-black truncate">{item[`name_${language}`] || item.name}</h4>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{item[`category_${language}`] || item.category}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs font-black italic">{item.price?.toLocaleString()} so'm</p>
                                                </div>
                                            </Link>
                                        ))}
                                        <button 
                                            type="submit" 
                                            onClick={() => handleSearch()}
                                            className="w-full p-4 bg-gray-50 hover:bg-gray-100 text-xs font-black text-black uppercase tracking-widest transition-colors"
                                        >
                                            Barcha natijalarni ko'rish
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center bg-gray-50/50">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Hech narsa topilmadi' : 'Ничего не найдено'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>

                    <div className="hidden md:flex items-center gap-2 md:gap-6 shrink-0 h-full">
                        <Link href={l("/reels")} className={`flex flex-col items-center gap-1 group transition-all ${pathname === l('/reels') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="relative p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                                <Clapperboard size={22} strokeWidth={pathname === l('/reels') ? 3 : 2} className="group-hover:scale-110 group-hover:-rotate-12 group-hover:text-black transition-all duration-300" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">Reels</span>
                        </Link>

                        <Link href={l("/blog")} className={`flex flex-col items-center gap-1 group transition-all ${pathname === l('/blog') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="relative p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                                <BookOpen size={22} strokeWidth={pathname === l('/blog') ? 3 : 2} className="group-hover:scale-110 group-hover:text-black transition-all duration-300" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">Blog</span>
                        </Link>

                        <Link href={`${l("/account")}?tab=orders`} className={`flex flex-col items-center gap-1 group transition-all ${pathname?.includes('/account') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 transition-colors">
                                <ShoppingBag size={22} strokeWidth={pathname?.includes('/account') ? 3 : 2} className="group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:text-black transition-all duration-300" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{language === 'uz' ? 'Buyurtmalar' : 'Заказы'}</span>
                        </Link>

                        <Link href={l("/wishlist")} className={`flex flex-col items-center gap-1 group transition-all ${pathname === l('/wishlist') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                                <Heart size={22} fill={wishlist.length > 0 ? "black" : "none"} strokeWidth={pathname === l('/wishlist') ? 3 : 2} className="transition-all duration-500 group-hover:scale-125" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{language === 'uz' ? 'Saralangan' : 'Избранное'}</span>
                        </Link>

                        <Link href={l("/cart")} className={`flex flex-col items-center gap-1 group transition-all ${pathname === l('/cart') ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                            <div className="p-2 rounded-xl group-hover:bg-gray-50 relative transition-colors">
                                <ShoppingCart size={22} strokeWidth={pathname === l('/cart') ? 3 : 2} />
                                {cartCount > 0 && <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">{cartCount}</span>}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter hidden xl:block">{t.nav.cart}</span>
                        </Link>

                        <div className="pl-4 md:pl-6 border-l border-gray-100 items-center gap-4 hidden lg:flex">
                            {user ? (
                                <Link href={l("/account")} className={`flex items-center gap-3 bg-[#F2F3F5] hover:bg-black hover:text-white px-6 py-3.5 rounded-2xl transition-all group shadow-sm hover:shadow-xl ${pathname?.includes('/account') ? 'bg-black text-white' : ''}`}>
                                    <User size={18} className="group-hover:scale-110 transition-transform duration-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">{t.nav.profile}</span>
                                </Link>
                            ) : (
                                <Link href={l("/login")} className="bg-[#F2F3F5] hover:bg-black hover:text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-xl">
                                    {language === 'uz' ? 'Kirish' : 'Войти'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* iOS-style Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 w-screen max-w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center z-[110]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}>
                <Link href={l("/")} className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${isHomePage ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <LayoutGrid size={24} strokeWidth={isHomePage ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Asosiy</span>
                </Link>
                <Link href={l("/reels")} className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === l('/reels') ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <Clapperboard size={24} strokeWidth={pathname === l('/reels') ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Reels</span>
                </Link>
                <Link href={l("/cart")} className={`relative flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === l('/cart') ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <ShoppingCart size={24} strokeWidth={pathname === l('/cart') ? 2.5 : 1.8} />
                    {cartCount > 0 && <span className="absolute top-1 right-1 bg-red-500 w-4 h-4 flex items-center justify-center rounded-full text-white text-[9px] font-bold">{cartCount}</span>}
                    <span className="text-[10px] font-semibold">Savat</span>
                </Link>
                <Link href={l("/wishlist")} className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname === l('/wishlist') ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <Heart size={24} strokeWidth={pathname === l('/wishlist') ? 2.5 : 1.8} fill={pathname === l('/wishlist') ? 'currentColor' : 'none'} />
                    <span className="text-[10px] font-semibold">Saralar</span>
                </Link>
                <Link href={user ? l("/account") : l("/login")} className={`flex flex-col items-center pt-2 pb-1 px-3 gap-0.5 transition-colors ${pathname?.includes('/account') ? 'text-[#2d6e3e]' : 'text-gray-400'}`}>
                    <User size={24} strokeWidth={pathname?.includes('/account') ? 2.5 : 1.8} />
                    <span className="text-[10px] font-semibold">Profil</span>
                </Link>
            </nav>
        </>
    );
}
