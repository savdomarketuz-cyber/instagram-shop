"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, Heart, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapBanner } from "@/lib/mappers";
import { getAiRecommendations } from "@/lib/ai";
import { translations } from "@/lib/translations";
import { useSearchParams } from "next/navigation";

// Components
import { BannerSection } from "@/components/home/BannerSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ProductGrid } from "@/components/home/ProductGrid";

import type { Product, Category, Banner } from "@/types";

interface HomeClientProps {
    initialProducts: Product[];
    initialCategories: Category[];
    initialBanners: Banner[];
    initialBannerSettings: { desktopHeight: number; borderRadius: number };
}

export default function HomeClient({ 
    initialProducts, 
    initialCategories, 
    initialBanners, 
    initialBannerSettings 
}: HomeClientProps) {
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get("category");

    const cart = useStore(state => state.cart);
    const wishlist = useStore(state => state.wishlist);
    const language = useStore(state => state.language);
    const user = useStore(state => state.user);
    const addToCart = useStore(state => state.addToCart);
    const updateQuantity = useStore(state => state.updateQuantity);
    const removeFromCart = useStore(state => state.removeFromCart);
    const toggleWishlist = useStore(state => state.toggleWishlist);
    const setCachedProducts = useStore(state => state.setCachedProducts);
    const homeScrollPosition = useStore(state => state.homeScrollPosition);
    const setHomeScrollPosition = useStore(state => state.setHomeScrollPosition);
    const homeSearchQuery = useStore(state => state.homeSearchQuery);
    const setHomeSearchQuery = useStore(state => state.setHomeSearchQuery);
    const homeActiveFilter = useStore(state => state.homeActiveFilter);
    const setHomeActiveFilter = useStore(state => state.setHomeActiveFilter);
    const homeActiveTab = useStore(state => state.homeActiveTab);
    const setHomeActiveTab = useStore(state => state.setHomeActiveTab);
    const searchResults = useStore(state => state.searchResults);
    const searchFacets = useStore(state => state.searchFacets);
    const didYouMean = useStore(state => state.didYouMean);
    const isSearchLoading = useStore(state => state.isSearchLoading);
    const setSearchResults = useStore(state => state.setSearchResults);

    const t = translations[language];
    
    // UI State
    const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
    const [aiProductIds, setAiProductIds] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>(initialCategories);
    const [banners, setBanners] = useState<Banner[]>(initialBanners);
    const [search, setSearch] = useState(homeSearchQuery);
    const [activeFilter, setActiveFilter] = useState(urlCategory || homeActiveFilter);
    const [activeParent, setActiveParent] = useState("all");
    const [activeTab, setActiveTab] = useState(homeActiveTab);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(initialProducts.length >= 20);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [bannerSettings, setBannerSettings] = useState(initialBannerSettings);

    const observerTarget = useRef(null);

    // Sync activeFilter with URL category if it changes
    useEffect(() => {
        if (urlCategory) {
            setActiveFilter(urlCategory);
            setHomeActiveFilter(urlCategory);
        }
    }, [urlCategory, setHomeActiveFilter]);

    // Sync local search with store
    useEffect(() => {
        setSearch(homeSearchQuery);
    }, [homeSearchQuery]);

    // AI Recommendations logic
    useEffect(() => {
        if (user?.phone && user.phone !== 'ADMIN' && allProducts.length > 0) {
            const fetchAiRecs = async () => {
                const { data: interests } = await supabase
                    .from("user_interests")
                    .select("*")
                    .eq("id", user.phone)
                    .single();
                
                if (interests) {
                    const ids = await getAiRecommendations(interests, allProducts, user.phone);
                    if (ids && ids.length > 0) setAiProductIds(ids);
                }
            };
            fetchAiRecs();
        }
    }, [user?.phone, allProducts.length]);

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
        const isDefault = activeFilter === 'all' && activeTab === 'for_you' && !search;
        if (!isDefault || allProducts.length === 0) {
            fetchProducts(false);
        }
        // fetchProducts is intentionally omitted — it's defined below and stable enough
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter, activeTab, search]);

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

    return (
        <main className="min-h-screen bg-white pb-24 max-w-[1440px] mx-auto">
            <h1 className="sr-only">Velari - Premium Electronics Store in Uzbekistan. Gadgets, Smartphones and Accessories.</h1>
            
            {banners.length > 0 && !searchResults && (
                <BannerSection 
                    banners={banners} 
                    bannerSettings={bannerSettings} 
                    currentBanner={currentBanner} 
                    setCurrentBanner={setCurrentBanner} 
                    language={language} 
                />
            )}

            {!searchResults && (
                <div className="md:px-10">
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

            <div className="px-2 md:px-10 mt-4">
                {searchResults && (
                    <div className="flex flex-col mb-8 animate-in slide-in-from-top-4 duration-500 gap-6 px-2">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-black">Qidiruv Natijalari</h2>
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Sizning qidiruvingiz bo&apos;yicha topilgan mahsulotlar</p>
                                {didYouMean && searchResults.length > 0 && (
                                    <p className="mt-2 text-sm font-bold text-gray-500">
                                        {language === 'uz' ? 'Balki buni qidirgandirsiz: ' : 'Возможно вы искали: '}
                                        <button 
                                            onClick={async () => {
                                                useStore.setState({ isSearchLoading: true, homeSearchQuery: didYouMean });
                                                setSearch(didYouMean);
                                                try {
                                                    const res = await fetch('/api/search', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ query: didYouMean })
                                                    });
                                                    const data = await res.json();
                                                    setSearchResults(data.results || [], data.facets || null, data.didYouMean || null);
                                                } catch (e) {
                                                    console.error("Did you mean search failed", e);
                                                } finally {
                                                    useStore.setState({ isSearchLoading: false });
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline italic font-black transition-colors"
                                        >
                                            {didYouMean}
                                        </button>
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => { setSearchResults(null); setHomeSearchQuery(""); }}
                                className="bg-gray-100 hover:bg-black hover:text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm whitespace-nowrap"
                            >
                                {language === 'uz' ? 'Tozalash' : 'Очистить'}
                            </button>
                        </div>
                        
                        {searchFacets && searchFacets.categories && Object.keys(searchFacets.categories).length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {Object.entries(searchFacets.categories).map(([cat, count]) => (
                                    <button 
                                        key={cat} 
                                        onClick={() => {
                                            // Simply jump to the category if possible or just visual
                                            // For a real facet filter, we'd adjust the searchResults in state
                                            // Leaving it as a visual badge for now that can be expanded later
                                        }}
                                        className="px-4 py-2 bg-[#F5F9F6] border border-[#2d6e3e]/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#2d6e3e] whitespace-nowrap hover:bg-[#2d6e3e] hover:text-white transition-colors"
                                    >
                                        {cat} <span className="opacity-50 ml-1">({count as number})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!searchResults && (
                    <div className="flex items-center justify-around relative mx-2 mb-6 border-b border-gray-50">
                        {["for_you", "popular"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setHomeActiveTab(tab); }}
                                className={`flex-1 py-3 text-center transition-all relative ${activeTab === tab ? "text-black font-black" : "text-gray-400 font-bold"}`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-xs uppercase tracking-tight">
                                        {tab === "for_you" ? (language === 'uz' ? 'Siz uchun' : 'Для вас') : (language === 'uz' ? 'Ommabop' : 'Популярное')}
                                    </span>
                                    {tab === "for_you" && aiProductIds.length > 0 && (
                                        <span className="bg-purple-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">AI</span>
                                    )}
                                </div>
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2d6e3e] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <ProductGrid 
                    products={searchResults || allProducts}
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
                />
            </div>

            <div ref={observerTarget} className="h-40 flex flex-col items-center justify-center gap-4">
                {(isFetchingMore || isSearchLoading) && (
                    <>
                        <Loader2 className="animate-spin text-black/20" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Yuklanmoqda...</span>
                    </>
                )}
                {!hasMore && !searchResults && allProducts.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/10">Barcha mahsulotlar ko&apos;rsatildi</span>
                )}
            </div>
        </main>
    );
}
