"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { Search, Loader2, Heart } from "lucide-react";
import Image from "next/image";
import { useStore } from "@/store/store";
import { db, collection, query, getDocs, orderBy, onSnapshot, doc, getDoc, limit } from "@/lib/firebase";
import { getAiRecommendations } from "@/lib/ai";
import { translations } from "@/lib/translations";
import { useSearchParams } from "next/navigation";

// Components
import { BannerSection } from "@/components/home/BannerSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ProductGrid } from "@/components/home/ProductGrid";

interface Product {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    image: string;
    images?: string[];
    category: string;
    category_uz?: string;
    category_ru?: string;
    rating?: number;
    reviewCount?: number;
    sales: number;
    tag?: string;
    isDeleted?: boolean;
    stockDetails?: { [key: string]: number };
    groupId?: string;
    tags?: string[];
    features?: string[];
    isOriginal?: boolean;
    videoUrl?: string;
    createdAt?: any;
}

interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
}

interface Banner {
    id: string;
    imageUrl_uz: string;
    imageUrl_ru: string;
    title_uz?: string;
    title_ru?: string;
    tabName_uz?: string;
    tabName_ru?: string;
    order?: number;
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white animate-pulse">
                {/* Header Skeleton */}
                <div className="h-20 border-b border-gray-100 flex items-center px-10 gap-8">
                    <div className="w-32 h-8 bg-gray-50 rounded-full" />
                    <div className="flex-1 max-w-2xl h-12 bg-gray-50 rounded-2xl mx-auto" />
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl" />
                </div>
                {/* Banner Skeleton */}
                <div className="mt-4 px-4 h-[210px]">
                    <div className="w-full h-full bg-gray-50 rounded-[32px]" />
                </div>
                {/* Filter Skeleton */}
                <div className="mt-8 px-10 flex gap-3 overflow-hidden">
                    {[...Array(6)].map((_, i) => <div key={i} className="w-24 h-10 bg-gray-50 rounded-2xl shrink-0" />)}
                </div>
            </div>
        }>
            <HomeContent />
        </Suspense>
    );
}

function HomeContent() {
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get("category");

    const {
        addToCart, cart, toggleWishlist, wishlist, updateQuantity,
        removeFromCart, user, cachedProducts, setCachedProducts,
        cachedCategories, setCachedCategories, language,
        homeScrollPosition, setHomeScrollPosition, homeSearchQuery, setHomeSearchQuery,
        homeActiveFilter, setHomeActiveFilter, homeActiveTab, setHomeActiveTab
    } = useStore();

    const t = translations[language];
    
    // UI State
    const [allProducts, setAllProducts] = useState<Product[]>(cachedProducts || []);
    const [aiProductIds, setAiProductIds] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>(cachedCategories || []);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [search, setSearch] = useState(homeSearchQuery);
    const [activeFilter, setActiveFilter] = useState(urlCategory || homeActiveFilter);
    const [activeParent, setActiveParent] = useState("all");
    const [activeTab, setActiveTab] = useState(homeActiveTab);
    const [loading, setLoading] = useState(cachedProducts.length === 0);
    const [page, setPage] = useState(1);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [bannerSettings, setBannerSettings] = useState({ desktopHeight: 210, borderRadius: 32 });

    const observerTarget = useRef(null);

    // Sync activeFilter with URL category if it changes
    useEffect(() => {
        if (urlCategory) {
            setActiveFilter(urlCategory);
            setHomeActiveFilter(urlCategory);
        }
    }, [urlCategory, setHomeActiveFilter]);

    // AI Recommendations logic (one time on mount/auth)
    useEffect(() => {
        if (user?.phone && allProducts.length > 0) {
            const fetchAiRecs = async () => {
                const interestsRef = doc(db, "user_interests", user.phone || "");
                const interestsSnap = await getDoc(interestsRef);
                if (interestsSnap.exists()) {
                    const ids = await getAiRecommendations(interestsSnap.data(), allProducts, user.phone);
                    if (ids && ids.length > 0) setAiProductIds(ids);
                }
            };
            fetchAiRecs();
        }
    }, [user?.phone, allProducts.length]);

    // Firestore Integration
    useEffect(() => {
        fetchInitialData();

        const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
            setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[]);
        });

        const unsubSettings = onSnapshot(doc(db, "settings", "banners"), (snap) => {
            if (snap.exists()) {
                setBannerSettings({
                    desktopHeight: snap.data().desktopHeight || 210,
                    borderRadius: snap.data().borderRadius || 32
                });
            }
        });

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
            unsubBanners();
            unsubSettings();
            window.removeEventListener('scroll', handleScrollEvent);
        };
    }, []);

    const fetchInitialData = async () => {
        try {
            const pq = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(100));
            const cq = query(collection(db, "categories"), orderBy("name", "asc"));
            
            const [pSnapshot, cSnapshot] = await Promise.all([
                getDocs(pq),
                getDocs(cq)
            ]);

            const pData = pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            const cData = cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];

            setAllProducts(pData);
            setCachedProducts(pData);
            setAllCategories(cData);
            setCachedCategories(cData);
        } catch (error) {
            console.error("Home Data Fetch failed:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Logic (Filtering & Sorting)
    const filteredProducts = useMemo(() => {
        const query_search = search.toLowerCase();
        
        let items = allProducts.filter(p => {
            if (p.isDeleted) return false;
            const totalStock = p.stockDetails ? Object.values(p.stockDetails).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;
            if (totalStock <= 0) return false;

            const matchesSearch = (p[`name_${language}`] || p.name).toLowerCase().includes(query_search);
            if (activeFilter === 'all') return matchesSearch;

            const getDescendantIds = (parentId: string): string[] => {
                const children = allCategories.filter(c => c.parentId === parentId);
                let ids = children.map(c => c.id);
                children.forEach(c => { ids = [...ids, ...getDescendantIds(c.id)]; });
                return ids;
            };

            const targetCategory = allCategories.find(c => c.id === activeFilter || c.name === activeFilter);
            const targetId = targetCategory?.id || activeFilter;
            const descendantIds = [targetId, ...getDescendantIds(targetId)];

            return matchesSearch && descendantIds.includes(p.category);
        });

        if (activeTab === "popular") {
            return [...items].sort((a, b) => (b.sales || 0) - (a.sales || 0));
        }

        if (activeTab === "for_you" && aiProductIds.length > 0) {
            return [...items].sort((a, b) => {
                const idxA = aiProductIds.indexOf(a.id);
                const idxB = aiProductIds.indexOf(b.id);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                return idxA !== -1 ? -1 : 1;
            });
        }
        
        return items;
    }, [search, activeFilter, activeTab, allProducts, allCategories, aiProductIds, language]);

    // Infinite Scroll management
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loading) {
                setPage(prev => prev + 1);
            }
        }, { threshold: 0.1 });

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [loading]);

    const displayProducts = useMemo(() => filteredProducts.slice(0, page * 20), [filteredProducts, page]);

    return (
        <main className="min-h-screen bg-white pb-24 max-w-[1440px] mx-auto">
            {/* Visually hidden H1 for SEO */}
            <h1 className="sr-only">Velari - Premium Electronics Store in Uzbekistan. Gadgets, Smartphones and Accessories with muddatli to'lov.</h1>
            
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-4 md:px-10 py-3 md:py-6 border-b border-gray-100 flex items-center gap-3 md:gap-8">
                <Link href="/" className="hidden md:block relative w-32 h-10">
                    <Image
                        src="/logo.png"
                        alt="Velari"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </Link>
                <div className="flex-1 relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t.common.search}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setHomeSearchQuery(e.target.value);
                        }}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 md:py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/wishlist" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all active:scale-90 flex items-center gap-2">
                        <Heart size={22} fill={wishlist.length > 0 ? "#ef4444" : "none"} className={wishlist.length > 0 ? "text-red-500" : ""} />
                        <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-black/40">Saralanganlar</span>
                    </Link>
                </div>
            </div>

            <BannerSection 
                banners={banners} 
                bannerSettings={bannerSettings} 
                currentBanner={currentBanner} 
                setCurrentBanner={setCurrentBanner} 
                language={language} 
            />

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

            <div className="px-2 md:px-10 mt-4">
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
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7000FF] rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                <ProductGrid 
                    products={displayProducts}
                    loading={loading}
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

            <div ref={observerTarget} className="h-20 flex items-center justify-center">
                {displayProducts.length < filteredProducts.length && <Loader2 className="animate-spin text-gray-200" />}
            </div>
        </main>
    );
}
