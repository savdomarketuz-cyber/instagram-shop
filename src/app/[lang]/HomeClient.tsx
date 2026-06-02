"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Sparkles, MapPin, ChevronRight, ChevronLeft, User, X, Loader2, LayoutGrid } from "lucide-react";
import { useStore } from "@/store/store";
import { useShallow } from "zustand/react/shallow";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapBanner } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import { useSearchParams, useRouter } from "next/navigation";

// Components
import { BannerSection } from "@/components/home/BannerSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ProductGrid } from "@/components/home/ProductGrid";
import TrustStrip from "@/components/velari/TrustStrip";
import RecentlyViewed, { getRecentlyViewedIds } from "@/components/velari/RecentlyViewed";
import PromoCountdown from "@/components/velari/PromoCountdown";
import StoriesRow from "@/components/velari/StoriesRow";
import FeaturedCategories from "@/components/home/FeaturedCategories";

import type { Product, Category, Banner } from "@/types";

interface HomeClientProps {
    initialProducts: Product[];
    initialCategories: Category[];
    initialBanners: Banner[];
    initialBannerSettings: { desktopHeight: number; borderRadius: number };
    initialPromo?: any;
    initialFeaturedCategories?: any[];
}

export default function HomeClient({
    initialProducts,
    initialCategories,
    initialBanners,
    initialBannerSettings,
    initialPromo,
    initialFeaturedCategories,
}: HomeClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlCategory = searchParams.get("category");
    const urlBrand = searchParams.get("brand");

    const { 
        cart, wishlist, language, user, addToCart, updateQuantity, removeFromCart, 
        toggleWishlist, setCachedProducts, homeScrollPosition, setHomeScrollPosition, 
        homeSearchQuery, setHomeSearchQuery, homeActiveFilter, setHomeActiveFilter, 
        homeActiveTab, setHomeActiveTab, searchResults, searchFacets, didYouMean, 
        isSearchLoading, setSearchResults 
    } = useStore(useShallow(state => ({
        cart: state.cart,
        wishlist: state.wishlist,
        language: state.language,
        user: state.user,
        addToCart: state.addToCart,
        updateQuantity: state.updateQuantity,
        removeFromCart: state.removeFromCart,
        toggleWishlist: state.toggleWishlist,
        setCachedProducts: state.setCachedProducts,
        homeScrollPosition: state.homeScrollPosition,
        setHomeScrollPosition: state.setHomeScrollPosition,
        homeSearchQuery: state.homeSearchQuery,
        setHomeSearchQuery: state.setHomeSearchQuery,
        homeActiveFilter: state.homeActiveFilter,
        setHomeActiveFilter: state.setHomeActiveFilter,
        homeActiveTab: state.homeActiveTab,
        setHomeActiveTab: state.setHomeActiveTab,
        searchResults: state.searchResults,
        searchFacets: state.searchFacets,
        didYouMean: state.didYouMean,
        isSearchLoading: state.isSearchLoading,
        setSearchResults: state.setSearchResults,
    })));

    const t = translations[language];
    
    // UI State
    const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
    const [aiProductIds, setAiProductIds] = useState<string[]>([]);
    const [personalOrder, setPersonalOrder] = useState<string[]>([]);
    const [personalReasons, setPersonalReasons] = useState<Record<string, { uz: string; ru: string }>>({});
    const personalizeDoneRef = useRef<string | null>(null);
    const [allCategories, setAllCategories] = useState<Category[]>(initialCategories);
    const [banners, setBanners] = useState<Banner[]>(initialBanners);
    const [search, setSearch] = useState(homeSearchQuery);
    const [activeFilter, setActiveFilter] = useState(urlCategory || homeActiveFilter);
    const [activeParent, setActiveParent] = useState("all");

    // URL ?category= bo'lganda fokuslangan "kategoriya sahifasi" rejimi uchun nom
    const activeCategoryName = useMemo(() => {
        if (!urlCategory) return "";
        const c = allCategories.find(cat => String(cat.id) === String(urlCategory));
        return c ? ((c as any)[`name_${language}`] || c.name) : "";
    }, [urlCategory, allCategories, language]);
    const [activeTab, setActiveTab] = useState(homeActiveTab);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(initialProducts.length >= 20);
    const [bannerSettings, setBannerSettings] = useState(initialBannerSettings);
    const [catalogCategoryCount, setCatalogCategoryCount] = useState(0);
    const [catalogProductCount, setCatalogProductCount] = useState(0);
    const [locationLabel, setLocationLabel] = useState(language === "ru" ? "Ташкент, Юнусабад" : "Toshkent, Yunusobod");

    const observerTarget = useRef(null);

    // Sync activeFilter with URL category if it changes
    useEffect(() => {
        if (urlCategory) {
            setActiveFilter(urlCategory);
            setHomeActiveFilter(urlCategory);
        }
    }, [urlCategory, setHomeActiveFilter]);

    // Katalog tugmasi uchun kategoriya va mahsulot sonini olish
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const [catRes, prodRes] = await Promise.all([
                    supabase.from("categories").select("id", { count: "exact", head: true }),
                    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_deleted", false),
                ]);
                if (catRes.count != null) setCatalogCategoryCount(catRes.count);
                if (prodRes.count != null) setCatalogProductCount(prodRes.count);
            } catch {}
        };
        fetchCounts();
    }, []);

    // Sync local search with store
    useEffect(() => {
        setSearch(homeSearchQuery);
    }, [homeSearchQuery]);

    // GPS asosida yetkazib berish manzilini aniqlash (keshlangan, sahifa ochilganda avto)
    useEffect(() => {
        const langCode = language === "ru" ? "ru" : "uz";
        const cacheKey = `velari_geo_label_${langCode}`;

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                setLocationLabel(cached);
                return;
            }
        } catch {}

        if (typeof navigator === "undefined" || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${langCode}&countrycodes=uz`);
                    const data = await res.json();
                    const a = data?.address;
                    if (!a) return;

                    const city = a.city || a.town || a.county || a.state || "";
                    const district = a.city_district || a.suburb || a.neighbourhood || a.borough || "";
                    const label = [city, district].filter(Boolean).join(", ");

                    if (label) {
                        setLocationLabel(label);
                        try { localStorage.setItem(cacheKey, label); } catch {}
                    }
                } catch {
                    // Tarmoq/geocoder xatosi — default qoladi
                }
            },
            () => { /* Ruxsat berilmadi — default qoladi */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
    }, [language]);

    // Shaxsiy smart-chegirmalarni yuklash (login mijoz) — kartochkalarda ko'rsatish uchun
    useEffect(() => {
        if (user?.phone && user.phone !== 'ADMIN') {
            useStore.getState().fetchPersonalOffers();
        }
    }, [user?.phone]);

    // Omborlar (yetkazish vaqti + do'kon nomi uchun) — bir marta
    useEffect(() => {
        useStore.getState().fetchWarehouses();
    }, []);

    // Shaxsiy tavsiya — persona-asosli moslashtirish (mehmon + login, sabab bilan).
    // attentionIds: yaqinda ko'rilgan (mehmon ham) + server (login) signali endpoint'da qo'shiladi.
    useEffect(() => {
        if (allProducts.length === 0 || user?.phone === 'ADMIN') return;
        const key = user?.phone || "guest";
        if (personalizeDoneRef.current === key) return;
        personalizeDoneRef.current = key;

        const run = async () => {
            try {
                const attentionIds = getRecentlyViewedIds();
                const res = await fetch("/api/ai/personalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ attentionIds, limit: 24 }),
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.results?.length) {
                    const order: string[] = [];
                    const reasons: Record<string, { uz: string; ru: string }> = {};
                    data.results.forEach((r: any) => {
                        order.push(r.id);
                        reasons[r.id] = { uz: r.reason_uz, ru: r.reason_ru };
                    });
                    setPersonalOrder(order);
                    setPersonalReasons(reasons);
                    setAiProductIds(order);
                }
            } catch { /* sokin */ }
        };
        run();
    }, [user?.phone, allProducts.length]);

    // "Siz uchun" tabida mahsulotlarni shaxsiy tartibga ko'ra qayta saralash.
    const displayProducts = useMemo(() => {
        if (searchResults) return searchResults;
        if (activeTab === "for_you" && personalOrder.length > 0) {
            const rank = new Map(personalOrder.map((id, i) => [id, i]));
            return [...allProducts].sort((a, b) => {
                const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
                const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
                return ra - rb;
            });
        }
        return allProducts;
    }, [searchResults, activeTab, personalOrder, allProducts]);

    // Real-time updates for Banners and Settings (Supabase Realtime)
    useEffect(() => {
        const bannersChannel = supabase
            .channel('banners-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, async () => {
                const { data } = await supabase.from('banners').select('*').eq('active', true).order('order_index');
                setBanners((data || []).map(mapBanner));
            })
            .subscribe();

        const settingsChannel = supabase
            .channel('settings-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.banners' }, (payload: any) => {
                if (payload.new && payload.new.data) {
                    setBannerSettings({
                        desktopHeight: payload.new.data.desktopHeight || 210,
                        borderRadius: payload.new.data.borderRadius || 32
                    });
                }
            })
            .subscribe();

        if (homeScrollPosition > 0) {
            window.scrollTo({ top: homeScrollPosition, behavior: 'instant' as ScrollBehavior });
        }

        let timeoutId: NodeJS.Timeout;
        const handleScrollEvent = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setHomeScrollPosition(window.scrollY);
            }, 300);
        };

        window.addEventListener('scroll', handleScrollEvent);

        return () => {
            supabase.removeChannel(bannersChannel);
            supabase.removeChannel(settingsChannel);
            window.removeEventListener('scroll', handleScrollEvent);
        };
    }, [homeScrollPosition, setHomeScrollPosition]);

    // Re-fetch when filters change (reset pagination)
    useEffect(() => {
        const isDefault = activeFilter === 'all' && activeTab === 'for_you' && !search && !urlBrand;
        if (!isDefault || allProducts.length === 0) {
            fetchProducts(false);
        }
        // fetchProducts is intentionally omitted — it's defined below and stable enough
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter, activeTab, search, urlBrand]);

    const fetchProducts = async (isLoadMore = false) => {
        if (isLoadMore && (!hasMore || isFetchingMore)) return;

        if (isLoadMore) setIsFetchingMore(true);
        else {
            setLoading(true);
            setPageNumber(0);
        }

        try {
            const currentPage = isLoadMore ? pageNumber + 1 : 0;
            const from = currentPage * 20;
            const to = from + 19;

            let query = supabase
                .from("products")
                .select("*")
                .eq("is_deleted", false);

            if (activeFilter !== 'all') {
                const targetCategory = allCategories.find(c => c.id === activeFilter || c.name === activeFilter);
                if (targetCategory) {
                    // Recursive function to get all subcategory IDs
                    const getAllCategoryIds = (catId: string): string[] => {
                        const children = allCategories.filter(c => c.parentId === catId);
                        let ids = [catId];
                        for (const child of children) {
                            ids = [...ids, ...getAllCategoryIds(child.id)];
                        }
                        return ids;
                    };
                    
                    const categoryIds = getAllCategoryIds(targetCategory.id);
                    query = query.in("category_id", categoryIds);
                }
            }

            // Brend bo'yicha filtr (story CTA / ?brand= havolasi uchun)
            if (urlBrand) {
                query = query.eq("brand_id", urlBrand);
            }

            if (search.trim()) {
                const searchPattern = `%${search.trim()}%`;
                const orFilter = [
                    `name.ilike.${searchPattern}`,
                    `name_uz.ilike.${searchPattern}`,
                    `name_ru.ilike.${searchPattern}`,
                    `description.ilike.${searchPattern}`,
                    `description_uz.ilike.${searchPattern}`,
                    `description_ru.ilike.${searchPattern}`,
                    `article.ilike.${searchPattern}`,
                    `sku.ilike.${searchPattern}`
                ].join(',');
                query = query.or(orFilter);
            }

            if (activeTab === "popular") {
                query = query.order("sales", { ascending: false });
            } else {
                query = query.order("created_at", { ascending: false });
            }

            const { data: newProductsData, error } = await query.range(from, to);
            
            if (error) throw error;

            const newProducts = (newProductsData || []).map(mapProduct);

            const availableProducts = newProducts.filter(p => {
                const totalStock = p.stockDetails ? Object.values(p.stockDetails).reduce((a: number, b: number) => a + (Number(b) || 0), 0) : (p.stock || 0);
                return totalStock > 0;
            });

            if (isLoadMore) {
                setAllProducts(prev => [...prev, ...availableProducts]);
                setPageNumber(currentPage);
            } else {
                setAllProducts(availableProducts);
                if (activeFilter === 'all' && !search) setCachedProducts(availableProducts);
            }

            setHasMore(newProducts.length === 20);
        } catch (error) {
            console.error("Home Data Fetch failed:", error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading && !isFetchingMore) {
                fetchProducts(true);
            }
        }, { threshold: 0.1, rootMargin: '200px' });

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, isFetchingMore, pageNumber]);

    const mobileSearchTimer = useRef<NodeJS.Timeout | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);

    // Qidiruvni to'liq tozalash: kutilayotgan debounce + uchayotgan so'rovni bekor qiladi.
    // Aks holda eskirgan javob qaytib, o'chirilgan so'zni qidiruv maydoniga tiklab qo'yardi.
    const clearMobileSearch = () => {
        if (mobileSearchTimer.current) { clearTimeout(mobileSearchTimer.current); mobileSearchTimer.current = null; }
        if (searchAbortRef.current) { searchAbortRef.current.abort(); searchAbortRef.current = null; }
        setSearch("");
        setSearchResults(null);
        setHomeSearchQuery("");
        useStore.setState({ isSearchLoading: false });
    };

    const handleMobileSearch = async (e?: React.FormEvent, queryArg?: string) => {
        if (e) e.preventDefault();
        // Enter bosilganda kutilayotgan debounce takror qidiruv qilmasin
        if (mobileSearchTimer.current) { clearTimeout(mobileSearchTimer.current); mobileSearchTimer.current = null; }
        const q = (queryArg ?? search).trim();
        if (!q) { setSearchResults(null); return; }

        // Oldingi uchayotgan so'rovni bekor qilamiz
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        useStore.setState({ isSearchLoading: true });
        try {
            const res = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q, userPhone: user?.phone }),
                signal: controller.signal,
            });
            // Bu so'rov eskirgan (yangi qidiruv yoki tozalash bo'lgan) bo'lsa — natijani qo'llamaymiz
            if (searchAbortRef.current !== controller) return;
            const data = res.ok ? await res.json() : { results: [], facets: null, didYouMean: null };
            setSearchResults(data.results || [], data.facets || null, data.didYouMean || null);
            setHomeSearchQuery(q);
        } catch (err) {
            if ((err as any)?.name === "AbortError") return; // bekor qilingan — sokin
            console.error(err);
        } finally {
            if (searchAbortRef.current === controller) {
                searchAbortRef.current = null;
                useStore.setState({ isSearchLoading: false });
            }
        }
    };

    const handleMobileSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        if (!val.trim()) { clearMobileSearch(); return; }
        if (mobileSearchTimer.current) clearTimeout(mobileSearchTimer.current);
        mobileSearchTimer.current = setTimeout(() => handleMobileSearch(undefined, val), 600);
    };

    return (
        <main style={{ minHeight: "100svh", background: "#FAFAF6", paddingBottom: 100 }} className="max-w-[1440px] mx-auto">
            <h1 className="sr-only">{t.common.homeTitle}</h1>

            {/* ── MOBILE: Velari sticky header ── */}
            <div className="md:hidden" style={{
                position: "sticky", top: 0, zIndex: 100,
                background: homeScrollPosition > 30 ? "rgba(250,250,246,0.92)" : "#FAFAF6",
                backdropFilter: homeScrollPosition > 30 ? "blur(20px) saturate(180%)" : "none",
                WebkitBackdropFilter: homeScrollPosition > 30 ? "blur(20px) saturate(180%)" : "none",
                borderBottom: homeScrollPosition > 30 ? "0.5px solid rgba(15,20,16,0.06)" : "none",
                transition: "background 240ms ease",
                padding: "12px 20px 12px",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#9AA29C", fontWeight: 500 }}>
                            {language === "ru" ? "Доставка в" : "Yetkazib berish"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <MapPin size={14} color="#2D6E3E" />
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F1410", letterSpacing: -0.2 }}>
                                {locationLabel}
                            </span>
                            <ChevronRight size={13} color="#9AA29C" />
                        </div>
                    </div>
                    <Link href={`/${language}/account`} style={{
                        width: 40, height: 40, borderRadius: 20, background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(15,20,16,0.05)", position: "relative", flexShrink: 0,
                        textDecoration: "none",
                    }}>
                        <User size={18} color="#0F1410" />
                        {user && <div style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, background: "#2D6E3E", border: "2px solid #FAFAF6" }} />}
                    </Link>
                </div>
                <form onSubmit={handleMobileSearch}>
                    <div style={{
                        width: "100%", height: 46, borderRadius: 23,
                        background: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
                        boxShadow: "0 2px 10px rgba(15,20,16,0.04)", border: "1px solid rgba(15,20,16,0.05)",
                    }}>
                        {isSearchLoading ? <Loader2 size={18} color="#9AA29C" className="animate-spin" /> : <Search size={18} color="#9AA29C" />}
                        <input
                            type="text"
                            placeholder={language === "uz" ? "Mahsulot qidirish..." : "Поиск товаров..."}
                            value={search}
                            onChange={handleMobileSearchChange}
                            style={{ flex: 1, fontSize: 14, color: "#0F1410", background: "none", border: "none", outline: "none", fontWeight: 500 }}
                        />
                        {search && (
                            <button type="button" onClick={clearMobileSearch}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                                <X size={16} color="#9AA29C" />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── MOBILE: Gradient Catalog CTA ── */}
            {!searchResults && !urlCategory && (
                <div className="md:hidden" style={{ padding: "10px 20px 0" }}>
                    <Link href={`/${language}/catalog`} style={{
                        height: 52, borderRadius: 18, display: "flex", alignItems: "center",
                        justifyContent: "space-between", padding: "0 18px",
                        background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)",
                        boxShadow: "0 8px 20px rgba(45,110,62,0.28)", color: "#fff", textDecoration: "none",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: "rgba(255,255,255,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <LayoutGrid size={17} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
                                    {language === "uz" ? "Katalog" : "Каталог"}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>
                                    {catalogCategoryCount > 0 && catalogProductCount > 0
                                        ? (language === "uz"
                                            ? `${catalogCategoryCount} kategoriya · ${catalogProductCount} mahsulot`
                                            : `${catalogCategoryCount} категорий · ${catalogProductCount} товаров`)
                                        : (language === "uz" ? "Barcha mahsulotlar" : "Все товары")
                                    }
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
                    </Link>
                </div>
            )}

            {/* Stories: mobilda yuqorida; desktopda pastda (kategoriyalardan keyin) ko'rsatiladi */}
            {!searchResults && !urlCategory && <StoriesRow language={language} device="mobile" />}
            {!searchResults && !urlCategory && <PromoCountdown language={language} initialSettings={initialPromo} />}

            {/* ── DESKTOP HERO: chapda asosiy banner, o'ngda promo + bonus ── */}
            {!searchResults && !urlCategory && (
                <div className="hidden md:block px-10 mt-8">
                    <div className="grid grid-cols-3 gap-5" style={{ height: bannerSettings.desktopHeight }}>
                        {/* Chap: asosiy HTML banner */}
                        <div className="col-span-2 h-full">
                            {banners.length > 0 && (
                                <BannerSection
                                    banners={banners}
                                    language={language}
                                    heightPx={bannerSettings.desktopHeight}
                                    borderRadius={bannerSettings.borderRadius}
                                    intervalMs={3000}
                                    bare
                                />
                            )}
                        </div>
                        {/* O'ng: tepada vaqtli chegirma (promo), pastda ro'yxatdan o'tish bonusi */}
                        <div className="col-span-1 h-full flex flex-col gap-5">
                            <PromoCountdown language={language} initialSettings={initialPromo} variant="card" />
                            <Link
                                href={`/${language}/login`}
                                className="flex flex-1 min-h-0 flex-col justify-between transition-transform hover:-translate-y-0.5"
                                style={{
                                    background: "linear-gradient(135deg,#FBF4E6 0%,#F7ECD4 100%)",
                                    borderRadius: 24, padding: "20px 22px", textDecoration: "none",
                                    border: "1px solid #F0E3C8", position: "relative", overflow: "hidden",
                                }}
                            >
                                <div style={{ position: "absolute", bottom: -28, right: -20, fontSize: 110, lineHeight: 1, opacity: 0.12 }}>🎁</div>
                                <div style={{ position: "relative" }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#C99A2E" }}>
                                        🎁 {language === "uz" ? "Bonus" : "Бонус"}
                                    </div>
                                    <div style={{ fontSize: 36, fontWeight: 900, color: "#0F1410", lineHeight: 1, marginTop: 8, letterSpacing: -1 }}>
                                        +30 000
                                    </div>
                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#7A6A45", marginTop: 7, maxWidth: "85%" }}>
                                        {language === "uz" ? "Ro'yxatdan o'ting va so'mlik promokodga ega bo'ling" : "Зарегистрируйтесь и получите промокод"}
                                    </div>
                                </div>
                                <div style={{ position: "relative", alignSelf: "flex-start", background: "#0F1410", color: "#fff", padding: "11px 22px", borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
                                    {language === "uz" ? "Olish →" : "Получить →"}
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
            {!searchResults && !urlCategory && (
                <div className="md:hidden">
                    {banners.length > 0 ? (
                        <BannerSection
                            banners={banners}
                            language={language}
                            aspectRatio="16/10"
                            borderRadius={24}
                            intervalMs={3000}
                            outerPadding="12px 20px 0"
                        />
                    ) : (
                        <div style={{ margin: "12px 20px 0" }}><div style={{
                            position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "16/10",
                            background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)",
                            boxShadow: "0 16px 40px rgba(45,110,62,0.25)",
                        }}>
                            <div style={{ position: "absolute", top: -30, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                            <div style={{ position: "absolute", bottom: -40, left: -15, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                            <div style={{ position: "absolute", inset: 0, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.18)", fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "#fff" }}>
                                        {language === "uz" ? "YANGI KOLLEKSIYA" : "НОВАЯ КОЛЛЕКЦИЯ"}
                                    </div>
                                    <h2 style={{ margin: "10px 0 0", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.4, lineHeight: 1.15, maxWidth: "70%" }}>
                                        {language === "uz" ? "Premium sifat mahsulotlar" : "Премиум товары"}
                                    </h2>
                                </div>
                                <Link href={`/${language}/catalog`} style={{
                                    alignSelf: "flex-start", padding: "10px 18px", borderRadius: 20,
                                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#0F1410", textDecoration: "none",
                                }}>
                                    {language === "uz" ? "Ko'rish →" : "Смотреть →"}
                                </Link>
                            </div>
                        </div></div>
                    )}
                </div>
            )}

            {/* Kategoriya vitrinasi — mobilda banner tagida, desktopda hero tagida (komponent o'zi mos blokni ko'rsatadi) */}
            {!searchResults && !urlCategory && <FeaturedCategories language={language} initial={initialFeaturedCategories} />}

            {/* Stories — desktopda kategoriyalardan keyin (kattaroq) */}
            {!searchResults && !urlCategory && <StoriesRow language={language} device="desktop" />}

            {/* CategoryFilter faqat desktopda — mobilda o'rnini kategoriya vitrinasi bosadi */}
            {!searchResults && (
                <div className="hidden md:block md:px-10">
                    <CategoryFilter
                        allCategories={allCategories}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        activeParent={activeParent}
                        setActiveParent={setActiveParent}
                        language={language}
                        translations={t}
                        setHomeActiveFilter={setHomeActiveFilter}
                    />
                </div>
            )}

            {!searchResults && !urlCategory && <TrustStrip language={language} />}

            <div className="px-2 md:px-10 mt-4">
                {searchResults && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24, padding: "0 8px", animation: "velari-slide-in 300ms cubic-bezier(0.22,1,0.36,1)" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: "#0F1410", margin: 0 }}>
                                    {language === "uz" ? "Qidiruv natijalari" : "Результаты поиска"}
                                </h2>
                                <p style={{ fontSize: 13, color: "#9AA29C", marginTop: 4, fontWeight: 500 }}>
                                    {searchResults.length} {language === "uz" ? "ta mahsulot" : "товаров"}
                                </p>
                                {didYouMean && searchResults.length > 0 && (
                                    <p style={{ marginTop: 8, fontSize: 13, color: "#5A625C" }}>
                                        {language === "uz" ? "Balki: " : "Может быть: "}
                                        <button
                                            onClick={async () => {
                                                useStore.setState({ isSearchLoading: true, homeSearchQuery: didYouMean });
                                                setSearch(didYouMean);
                                                try {
                                                    const res = await fetch("/api/search", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ query: didYouMean }),
                                                    });
                                                    const data = await res.json();
                                                    setSearchResults(data.results || [], data.facets || null, data.didYouMean || null);
                                                } catch (e) {
                                                    console.error("Did you mean search failed", e);
                                                } finally {
                                                    useStore.setState({ isSearchLoading: false });
                                                }
                                            }}
                                            style={{ color: "#2D6E3E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
                                        >
                                            {didYouMean}
                                        </button>
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => { setSearchResults(null); setHomeSearchQuery(""); }}
                                style={{ padding: "10px 18px", borderRadius: 20, background: "#fff", border: "1px solid rgba(15,20,16,0.08)", fontSize: 13, fontWeight: 600, color: "#5A625C", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}
                            >
                                {language === "uz" ? "Tozalash" : "Очистить"}
                            </button>
                        </div>
                        {searchFacets?.categories && Object.keys(searchFacets.categories).length > 0 && (
                            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="scrollbar-hide">
                                {Object.entries(searchFacets.categories).map(([cat, count]) => (
                                    <button key={cat} style={{ padding: "8px 14px", borderRadius: 18, whiteSpace: "nowrap", background: "#EAF3EC", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#2D6E3E" }}>
                                        {cat} <span style={{ opacity: 0.6 }}>({count as number})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Fokuslangan kategoriya rejimi — sarlavha + orqaga tugma (sahifa o'zgargandek his qildiradi) */}
                {urlCategory && !searchResults && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "0 8px", animation: "velari-slide-in 300ms cubic-bezier(0.22,1,0.36,1)" }}>
                        <button
                            onClick={() => { setActiveFilter("all"); setHomeActiveFilter("all"); router.push(`/${language}`); }}
                            aria-label={language === "uz" ? "Orqaga" : "Назад"}
                            style={{ width: 40, height: 40, borderRadius: 14, background: "#fff", border: "1px solid rgba(15,20,16,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}
                        >
                            <ChevronLeft size={20} color="#0F1410" />
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: "#0F1410", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {activeCategoryName || (language === "uz" ? "Kategoriya" : "Категория")}
                            </h2>
                            <p style={{ fontSize: 13, color: "#9AA29C", marginTop: 2, fontWeight: 500 }}>
                                {language === "uz" ? "Kategoriya mahsulotlari" : "Товары категории"}
                            </p>
                        </div>
                    </div>
                )}

                {!searchResults && !urlCategory && (
                    <div style={{ display: "flex", borderBottom: "1px solid rgba(15,20,16,0.06)", marginBottom: 20, marginLeft: 8, marginRight: 8 }}>
                        {["for_you", "popular"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setHomeActiveTab(tab); }}
                                style={{
                                    flex: 1, paddingBottom: 12, paddingTop: 4, textAlign: "center",
                                    position: "relative", background: "none", border: "none", cursor: "pointer",
                                    fontSize: 14, fontWeight: activeTab === tab ? 700 : 500,
                                    color: activeTab === tab ? "#0F1410" : "#9AA29C",
                                    letterSpacing: -0.2, transition: "color 200ms ease",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                            >
                                <span>
                                    {tab === "for_you" ? (language === "uz" ? "Siz uchun" : "Для вас") : (language === "uz" ? "Ommabop" : "Популярное")}
                                </span>
                                {tab === "for_you" && aiProductIds.length > 0 && (
                                    <span style={{ background: "#7C3AED", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 6 }}>AI</span>
                                )}
                                {activeTab === tab && (
                                    <span style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2.5, borderRadius: "2px 2px 0 0", background: "#2D6E3E" }} />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {!searchResults && !urlCategory && <RecentlyViewed language={language} />}

                <ProductGrid
                    products={displayProducts}
                    loading={isSearchLoading || (loading && allProducts.length === 0)}
                    language={language}
                    t={t}
                    cart={cart}
                    wishlist={wishlist}
                    user={user}
                    toggleWishlist={toggleWishlist}
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    reasonMap={personalReasons}
                    showReasons={activeTab === "for_you" && !searchResults && !urlCategory}
                />
            </div>

            <div ref={observerTarget} style={{ height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {(isFetchingMore || isSearchLoading) && (
                    <>
                        <div style={{ width: 28, height: 28, borderRadius: 14, border: "2.5px solid #2D6E3E", borderTopColor: "transparent", animation: "velari-spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#9AA29C" }}>{language === "uz" ? "Yuklanmoqda..." : "Загружается..."}</span>
                    </>
                )}
                {!hasMore && !searchResults && allProducts.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#9AA29C" }}>{language === "uz" ? "Barcha mahsulotlar ko'rsatildi" : "Все товары показаны"}</span>
                )}
            </div>
        </main>
    );
}
