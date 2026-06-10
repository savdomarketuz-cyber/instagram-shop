"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/store";
import { useShallow } from "zustand/react/shallow";
import { Search, SlidersHorizontal, ArrowUpDown, X, Check, Loader2, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { translations } from "@/lib/translations";
import { supabase } from "@/lib/supabase";
import { mapProduct } from "@/lib/mappers";
import { ProductCard } from "@/components/home/ProductCard";
import type { Product } from "@/types";

const GREEN = "#2D6E3E";

interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
    image?: string;
}

interface Brand {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
}

interface CatalogClientProps {
    initialCategories?: Category[];
    initialCategory?: string; // toza URL (/catalog/[slug]) orqali oldindan tanlangan kategoriya id
}

type SortKey = "popular" | "new" | "price_asc" | "price_desc" | "rating";

export default function CatalogClient({ initialCategories, initialCategory }: CatalogClientProps) {
    const router = useRouter();
    const {
        language, cachedCategories, setCachedCategories,
        cart, wishlist, addToCart, updateQuantity, removeFromCart, toggleWishlist,
    } = useStore(useShallow(state => ({
        language: state.language,
        cachedCategories: state.cachedCategories,
        setCachedCategories: state.setCachedCategories,
        cart: state.cart,
        wishlist: state.wishlist,
        addToCart: state.addToCart,
        updateQuantity: state.updateQuantity,
        removeFromCart: state.removeFromCart,
        toggleWishlist: state.toggleWishlist,
    })));
    const t = translations[language];
    const catName = (c: { name: string; name_uz?: string; name_ru?: string }) =>
        (language === "uz" ? c.name_uz : c.name_ru) || c.name;

    const [allCategories, setAllCategories] = useState<Category[]>(initialCategories || cachedCategories || []);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productCatIds, setProductCatIds] = useState<Set<string>>(new Set());

    const [searchQuery, setSearchQuery] = useState("");
    // Toza URL (/catalog/[slug]) orqali kelgan kategoriyani oldindan tanlaymiz.
    // Subkategoriya bo'lsa: asosiy = ota, sub = o'zi; aks holda asosiy = o'zi.
    const [mainCat, setMainCat] = useState<string>(() => {
        if (!initialCategory) return "all";
        const cat = (initialCategories || []).find(c => c.id === initialCategory);
        if (!cat) return initialCategory;
        return cat.parentId || cat.id;
    });
    const [subCat, setSubCat] = useState<string>(() => {
        if (!initialCategory) return "all";
        const cat = (initialCategories || []).find(c => c.id === initialCategory);
        return cat?.parentId ? cat.id : "all";
    });

    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);

    // Filter state
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [minRating, setMinRating] = useState<number>(0);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
    const [sortBy, setSortBy] = useState<SortKey>("popular");

    // Draft state for the filter sheet (apply on confirm)
    const [draftBrands, setDraftBrands] = useState<string[]>([]);
    const [draftRating, setDraftRating] = useState<number>(0);
    const [draftMinPrice, setDraftMinPrice] = useState<number>(0);
    const [draftMaxPrice, setDraftMaxPrice] = useState<number>(0);

    // Categories that actually contain products (incl. ancestors of any category with products)
    const categoriesWithProducts = useMemo(() => {
        const set = new Set<string>();
        if (productCatIds.size === 0) return set;
        const byId = new Map(allCategories.map(c => [c.id, c]));
        productCatIds.forEach(cid => {
            let cur: string | undefined = cid;
            let guard = 0;
            while (cur && guard < 20) {
                set.add(cur);
                cur = byId.get(cur)?.parentId;
                guard++;
            }
        });
        return set;
    }, [productCatIds, allCategories]);

    const hasCat = (id: string) => productCatIds.size === 0 || categoriesWithProducts.has(id);
    const mainCategories = allCategories.filter(c => !c.parentId && hasCat(c.id));
    const subCategories = mainCat !== "all" ? allCategories.filter(c => c.parentId === mainCat && hasCat(c.id)) : [];

    // Fetch categories (if not provided) + brands
    useEffect(() => {
        const load = async () => {
            if (!initialCategories || initialCategories.length === 0) {
                if (cachedCategories.length === 0) {
                    const { data } = await supabase.from("categories").select("*").eq("is_deleted", false).order("name");
                    if (data) {
                        const cData = data.map(c => ({
                            id: c.id, name: c.name, name_uz: c.name_uz, name_ru: c.name_ru,
                            parentId: c.parent_id, image: c.image,
                        })) as Category[];
                        setAllCategories(cData);
                        setCachedCategories(cData);
                    }
                }
            } else {
                setCachedCategories(initialCategories);
            }

            const { data: bData } = await supabase.from("brands").select("id, name, name_uz, name_ru").eq("is_deleted", false).order("name");
            if (bData) setBrands(bData as Brand[]);

            // Which categories actually have products — to hide empty ones
            const { data: pcData } = await supabase
                .from("products").select("category_id").eq("is_deleted", false).gt("stock", 0);
            if (pcData) {
                setProductCatIds(new Set(pcData.map((r: any) => r.category_id).filter(Boolean)));
            }
        };
        load();
    }, []);

    // Fetch products when category/subcategory changes
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                // Karta uchun kerakli ustunlargina — select("*") uzun tavsiflar/paramlar bilan
                // payload'ni bir necha baravar katta qilardi (bosh sahifa bilan bir xil ro'yxat).
                let query = supabase.from("products")
                    .select("id,name,name_uz,name_ru,price,old_price,image,images,image_metadata,sales,avg_rating,review_count,stock,stock_details,category_id,brand_id,video_url,model,color_name,group_id,is_original,article,express_delivery,created_at")
                    .eq("is_deleted", false).gt("stock", 0);

                const activeCat = subCat !== "all" ? subCat : mainCat;
                if (activeCat !== "all") {
                    const getAllIds = (catId: string): string[] => {
                        const children = allCategories.filter(c => c.parentId === catId);
                        let ids = [catId];
                        for (const child of children) ids = [...ids, ...getAllIds(child.id)];
                        return ids;
                    };
                    query = query.in("category_id", getAllIds(activeCat));
                }

                const { data } = await query.order("sales", { ascending: false }).limit(120);
                setProducts((data || []).map(mapProduct));
            } catch (e) {
                console.error("Catalog products fetch failed", e);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [mainCat, subCat, allCategories.length]);

    const brandName = (id?: string) => {
        const b = brands.find(x => x.id === id);
        return b ? ((language === "uz" ? b.name_uz : b.name_ru) || b.name) : "";
    };

    // Max price across current product set (for the slider bound)
    const maxProductPrice = useMemo(() => {
        const max = products.reduce((m, p) => Math.max(m, p.oldPrice || p.price || 0), 0);
        return max > 0 ? Math.ceil(max / 100000) * 100000 : 5000000;
    }, [products]);

    const filteredProducts = useMemo(() => {
        let list = products;

        // Faqat HAQIQIY qoldig'i bor mahsulotlar — ombor (stock_details) yig'indisi manba.
        // SQL .gt("stock",0) allaqachon filtrlaydi; bu drift'ga (stock != ombor) qarshi himoya.
        list = list.filter((p: any) => {
            const sd = p.stockDetails
                ? Object.values(p.stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
                : (p.stock || 0);
            return sd > 0;
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.name_uz || "").toLowerCase().includes(q) ||
                (p.name_ru || "").toLowerCase().includes(q) ||
                brandName((p as any).brand || p.brand_id).toLowerCase().includes(q)
            );
        }
        if (selectedBrands.length > 0) {
            list = list.filter(p => selectedBrands.includes((p as any).brand || p.brand_id || ""));
        }
        if (minRating > 0) {
            list = list.filter(p => (p.rating || 0) >= minRating);
        }
        if (priceRange[0] > 0 || priceRange[1] > 0) {
            list = list.filter(p => {
                const okMin = priceRange[0] <= 0 || p.price >= priceRange[0];
                const okMax = priceRange[1] <= 0 || p.price <= priceRange[1];
                return okMin && okMax;
            });
        }

        const sorted = [...list];
        switch (sortBy) {
            case "new": sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")); break;
            case "price_asc": sorted.sort((a, b) => a.price - b.price); break;
            case "price_desc": sorted.sort((a, b) => b.price - a.price); break;
            case "rating": sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            default: sorted.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        }
        return sorted;
    }, [products, searchQuery, selectedBrands, minRating, priceRange, sortBy, brands, language]);

    const activeFilterCount = (selectedBrands.length > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] > 0 ? 1 : 0);

    const openFilters = () => {
        setDraftBrands(selectedBrands);
        setDraftRating(minRating);
        setDraftMinPrice(priceRange[0] > 0 ? priceRange[0] : 0);
        setDraftMaxPrice(priceRange[1] > 0 ? priceRange[1] : maxProductPrice);
        setShowFilters(true);
    };
    const applyFilters = () => {
        setSelectedBrands(draftBrands);
        setMinRating(draftRating);
        const max = draftMaxPrice >= maxProductPrice ? 0 : draftMaxPrice;
        setPriceRange([draftMinPrice, max]);
        setShowFilters(false);
    };
    const clearFilters = () => {
        setDraftBrands([]);
        setDraftRating(0);
        setDraftMinPrice(0);
        setDraftMaxPrice(maxProductPrice);
    };

    const sortOptions: { key: SortKey; label_uz: string; label_ru: string }[] = [
        { key: "popular", label_uz: "Mashhurligi", label_ru: "По популярности" },
        { key: "new", label_uz: "Yangilari", label_ru: "Новинки" },
        { key: "price_asc", label_uz: "Arzondan qimmatga", label_ru: "Сначала дешёвые" },
        { key: "price_desc", label_uz: "Qimmatdan arzonga", label_ru: "Сначала дорогие" },
        { key: "rating", label_uz: "Reyting bo'yicha", label_ru: "По рейтингу" },
    ];

    const fmt = (n: number) => n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");

    return (
        <div className="min-h-screen text-black font-sans pb-24" style={{ background: "#FAFAF6" }}>
            <div className="max-w-[1600px] mx-auto px-4 md:px-10 py-5 md:py-10">

                {/* Title */}
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-5">
                    {language === "uz" ? "Katalog" : "Каталог"}
                </h1>

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                        type="text"
                        placeholder={language === "uz" ? "Mahsulot, brend, kategoriya..." : "Товар, бренд, категория..."}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white rounded-[20px] py-4 pl-12 pr-4 text-sm font-medium border border-gray-100 shadow-sm outline-none focus:border-gray-200"
                    />
                </div>

                {/* Main category pills */}
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-3 -mx-1 px-1">
                    <Pill active={mainCat === "all"} onClick={() => { setMainCat("all"); setSubCat("all"); }}>
                        {language === "uz" ? "Hammasi" : "Все"}
                    </Pill>
                    {mainCategories.map(c => (
                        <Pill key={c.id} active={mainCat === c.id} onClick={() => { setMainCat(c.id); setSubCat("all"); }}>
                            {catName(c)}
                        </Pill>
                    ))}
                </div>

                {/* Sub category pills */}
                {subCategories.length > 0 && (
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-3 -mx-1 px-1">
                        <Pill small active={subCat === "all"} onClick={() => setSubCat("all")}>
                            {language === "uz" ? "Barchasi" : "Все"}
                        </Pill>
                        {subCategories.map(c => (
                            <Pill key={c.id} small active={subCat === c.id} onClick={() => setSubCat(c.id)}>
                                {catName(c)}
                            </Pill>
                        ))}
                    </div>
                )}

                {/* Filter / Sort buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={openFilters}
                        className="flex items-center justify-center gap-2 bg-white border border-gray-100 rounded-2xl py-3.5 text-sm font-bold shadow-sm active:scale-[0.98] transition-transform"
                    >
                        <SlidersHorizontal size={16} />
                        {language === "uz" ? "Filtrlar" : "Фильтры"}
                        {activeFilterCount > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ background: GREEN }}>
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowSort(true)}
                        className="flex items-center justify-center gap-2 bg-white border border-gray-100 rounded-2xl py-3.5 text-sm font-bold shadow-sm active:scale-[0.98] transition-transform"
                    >
                        <ArrowUpDown size={16} />
                        {language === "uz" ? "Saralash" : "Сортировка"}
                    </button>
                </div>

                {/* Product grid */}
                {loadingProducts ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="animate-spin" size={32} color={GREEN} />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-24 text-center">
                        <PackageSearch size={56} className="mx-auto mb-4 text-gray-200" />
                        <p className="text-sm font-bold text-gray-400">
                            {language === "uz" ? "Mahsulot topilmadi" : "Товары не найдены"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                        {filteredProducts.map((p, i) => (
                            <ProductCard
                                key={p.id}
                                item={p}
                                language={language}
                                t={t}
                                cart={cart}
                                wishlist={wishlist}
                                toggleWishlist={toggleWishlist}
                                addToCart={addToCart}
                                updateQuantity={updateQuantity}
                                removeFromCart={removeFromCart}
                                priority={i < 4}
                                brandLabel={brandName((p as any).brand || p.brand_id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* FILTER SHEET */}
            <BottomSheet open={showFilters} onClose={() => setShowFilters(false)}
                title={language === "uz" ? "Filtrlar" : "Фильтры"}
                leftAction={<button onClick={clearFilters} className="text-sm font-bold text-gray-400">{language === "uz" ? "Tozalash" : "Сбросить"}</button>}
            >
                {/* Price */}
                <Section title={language === "uz" ? "Narx" : "Цена"}>
                    <div className="flex items-center justify-between mb-3 text-sm font-black">
                        <span>{fmt(draftMinPrice)}</span>
                        <span className="text-gray-300">—</span>
                        <span>{fmt(draftMaxPrice || maxProductPrice)}</span>
                    </div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        {language === "uz" ? "Eng kam" : "Минимум"}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={maxProductPrice}
                        step={50000}
                        value={draftMinPrice}
                        onChange={e => {
                            const v = Math.min(Number(e.target.value), (draftMaxPrice || maxProductPrice));
                            setDraftMinPrice(v);
                        }}
                        className="w-full accent-[#2D6E3E] mb-4"
                    />
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        {language === "uz" ? "Eng ko'p" : "Максимум"}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={maxProductPrice}
                        step={50000}
                        value={draftMaxPrice || maxProductPrice}
                        onChange={e => {
                            const v = Math.max(Number(e.target.value), draftMinPrice);
                            setDraftMaxPrice(v);
                        }}
                        className="w-full accent-[#2D6E3E]"
                    />
                </Section>

                {/* Brands */}
                {brands.length > 0 && (
                    <Section title={language === "uz" ? "Brendlar" : "Бренды"}>
                        <div className="flex flex-wrap gap-2.5">
                            {brands.map(b => {
                                const on = draftBrands.includes(b.id);
                                return (
                                    <button key={b.id}
                                        onClick={() => setDraftBrands(on ? draftBrands.filter(x => x !== b.id) : [...draftBrands, b.id])}
                                        className={`px-4 py-2.5 rounded-full text-xs font-bold border transition-colors ${on ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200"}`}
                                        style={on ? { background: GREEN } : undefined}
                                    >
                                        {(language === "uz" ? b.name_uz : b.name_ru) || b.name}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {/* Rating */}
                <Section title={language === "uz" ? "Reyting" : "Рейтинг"}>
                    {[4.5, 4, 3.5, 0].map(r => (
                        <button key={r} onClick={() => setDraftRating(r)}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${draftRating === r ? "border-transparent" : "border-gray-200"}`}
                                style={draftRating === r ? { background: GREEN } : undefined}>
                                {draftRating === r && <Check size={12} color="#fff" strokeWidth={3} />}
                            </span>
                            <span className="text-sm font-bold">
                                {r === 0 ? (language === "uz" ? "Har qanday" : "Любой") : `${r}+ ⭐`}
                            </span>
                        </button>
                    ))}
                </Section>

                <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-2 bg-white border-t border-gray-50">
                    <button onClick={applyFilters}
                        className="w-full py-4 rounded-2xl text-white font-bold text-sm"
                        style={{ background: GREEN, boxShadow: "0 8px 20px rgba(45,110,62,0.28)" }}>
                        {language === "uz" ? "Natijalarni ko'rsatish" : "Показать результаты"}
                    </button>
                </div>
            </BottomSheet>

            {/* SORT SHEET */}
            <BottomSheet open={showSort} onClose={() => setShowSort(false)}
                title={language === "uz" ? "Saralash" : "Сортировка"}
            >
                {sortOptions.map(o => (
                    <button key={o.key}
                        onClick={() => { setSortBy(o.key); setShowSort(false); }}
                        className="w-full flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                        <span className={`text-sm ${sortBy === o.key ? "font-black" : "font-medium text-gray-600"}`}>
                            {language === "uz" ? o.label_uz : o.label_ru}
                        </span>
                        {sortBy === o.key && <Check size={18} color={GREEN} strokeWidth={3} />}
                    </button>
                ))}
            </BottomSheet>
        </div>
    );
}

function Pill({ children, active, onClick, small }: { children: React.ReactNode; active: boolean; onClick: () => void; small?: boolean }) {
    return (
        <button onClick={onClick}
            className={`shrink-0 rounded-full font-bold transition-colors whitespace-nowrap ${small ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"} ${active ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-100"}`}>
            {children}
        </button>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">{title}</p>
            {children}
        </div>
    );
}

function BottomSheet({ open, onClose, title, leftAction, children }: {
    open: boolean; onClose: () => void; title: string; leftAction?: React.ReactNode; children: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" />
            <div
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-[480px] bg-white rounded-t-[32px] px-6 pt-6 pb-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            >
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                <div className="flex items-center justify-between mb-6">
                    <div className="w-16">{leftAction}</div>
                    <h3 className="text-base font-black">{title}</h3>
                    <button onClick={onClose} className="w-16 flex justify-end">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
