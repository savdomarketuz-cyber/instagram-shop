"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { Search, Heart, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapBanner } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import { useSearchParams } from "next/navigation";

// Components
import { BannerSection } from "@/components/home/BannerSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ProductGrid } from "@/components/home/ProductGrid";
import TrustStrip from "@/components/velari/TrustStrip";
import RecentlyViewed from "@/components/velari/RecentlyViewed";
import PromoCountdown from "@/components/velari/PromoCountdown";
import StoriesRow from "@/components/velari/StoriesRow";

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

    const { 
        cart, wishlist, language, user, addToCart, updateQuantity, removeFromCart, 
        toggleWishlist, setCachedProducts, homeScrollPosition, setHomeScrollPosition, 
        homeSearchQuery, setHomeSearchQuery, homeActiveFilter, setHomeActiveFilter, 
        homeActiveTab, setHomeActiveTab, searchResults, searchFacets, didYouMean, 
        isSearchLoading, setSearchResults 
    } = useStore(state => ({
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
    }));

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
                    const response = await fetch("/api/ai/recommendations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "get_recommendations",
                            userInterests: interests,
                            allProducts,
                            userPhone: user.phone
                        })
                    });
                    
                    if (response.ok) {
                        const { recommendations } = await response.json();
                        if (recommendations && recommendations.length > 0) setAiProductIds(recommendations);
                    }
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
        <main style={{ minHeight: "100svh", background: "#FAFAF6", paddingBottom: 100 }} className="max-w-[1440px] mx-auto">
            <h1 className="sr-only">{t.common.homeTitle}</h1>

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

            {!searchResults && <StoriesRow language={language} />}
            {!searchResults && <PromoCountdown language={language} />}
            {!searchResults && <TrustStrip language={language} />}

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

                {!searchResults && (
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

                {!searchResults && <RecentlyViewed language={language} />}

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
