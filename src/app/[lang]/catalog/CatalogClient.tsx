"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import {
    Search, Heart, ChevronRight, ChevronLeft,
    LayoutGrid, ShoppingBag, Loader2, Grid3X3, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { translations } from "@/lib/translations";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
    image?: string;
}

export default function CatalogClient() {
    const router = useRouter();
    const { language, cachedCategories, setCachedCategories } = useStore();
    const t = translations[language];

    const [allCategories, setAllCategories] = useState<Category[]>(cachedCategories || []);
    const [loading, setLoading] = useState(cachedCategories.length === 0);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from("categories")
                    .select("*")
                    .eq("is_deleted", false)
                    .order("name");
                
                if (error) throw error;

                const cData = data.map(c => ({
                    id: c.id,
                    name: c.name,
                    name_uz: c.name_uz,
                    name_ru: c.name_ru,
                    parentId: c.parent_id,
                    image: c.image
                })) as Category[];

                setAllCategories(cData);
                setCachedCategories(cData);
            } catch (error) {
                console.error("Error fetching categories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const mainCategories = allCategories.filter(c => !c.parentId);
    const subCategories = selectedCategory
        ? allCategories.filter(c => c.parentId === selectedCategory.id)
        : [];

    const handleCategoryClick = (category: Category) => {
        const hasSubs = allCategories.some(c => c.parentId === category.id);
        if (hasSubs) {
            setSelectedCategory(category);
        } else {
            router.push(`/${language}/?category=${category.id}`);
        }
    };

    if (loading && allCategories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black/20" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-6 md:py-12">
                
                <div className="flex flex-col gap-8 mb-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => selectedCategory ? setSelectedCategory(null) : router.back()} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase">
                                {selectedCategory ? (selectedCategory[`name_${language}`] || selectedCategory.name) : (language === 'uz' ? 'Katalog' : 'Каталог')}
                            </h1>
                        </div>
                        <div className="hidden md:flex relative w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder={language === 'uz' ? "Turkumlarni izlash" : "Поиск категорий"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        const globalForm = document.querySelector('form') as HTMLFormElement;
                                        if (globalForm) {
                                            const globalInput = globalForm.querySelector('input');
                                            if (globalInput) {
                                                globalInput.value = searchQuery;
                                                globalInput.dispatchEvent(new Event('input', { bubbles: true }));
                                                globalForm.requestSubmit();
                                            }
                                        }
                                    }
                                }}
                                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="md:hidden relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder={language === 'uz' ? "Katalogdan izlash" : "Поиск по каталогу"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                    // Trigger global search for products
                                    const searchTrigger = document.querySelector('form') as HTMLFormElement;
                                    if (searchTrigger) {
                                        const globalInput = searchTrigger.querySelector('input');
                                        if (globalInput) {
                                            globalInput.value = searchQuery;
                                            globalInput.dispatchEvent(new Event('input', { bubbles: true }));
                                            searchTrigger.requestSubmit();
                                        }
                                    } else {
                                        // Fallback: router push with sync
                                        router.push(`/${language}/?search=${encodeURIComponent(searchQuery)}`);
                                    }
                                }
                            }}
                            className="w-full bg-gray-100 rounded-[20px] py-4 pl-12 pr-4 text-sm font-bold border-none outline-none"
                        />
                    </div>
                </div>

                <div className="mt-8">
                    {searchQuery.trim() && mainCategories.filter(c => (c[`name_${language}`] || c.name).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="mb-12 p-8 bg-black text-white rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex flex-col gap-2 text-center md:text-left">
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Kategoriyalar topilmadi</h3>
                                <p className="text-gray-400 text-sm font-bold">"{searchQuery}" bo'yicha mahsulotlarni izlab ko'rasizmi?</p>
                            </div>
                            <button 
                                onClick={async () => {
                                    useStore.setState({ isSearchLoading: true });
                                    router.push(`/${language}`);
                                    try {
                                        const res = await fetch('/api/search', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ query: searchQuery })
                                        });
                                        const data = await res.json();
                                        useStore.getState().setSearchResults(data.results || []);
                                        useStore.getState().setHomeSearchQuery(searchQuery);
                                    } catch (e) {
                                        console.error("Catalog global search failed", e);
                                    } finally {
                                        useStore.setState({ isSearchLoading: false });
                                    }
                                }}
                                className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                            >
                                Mahsulotlarni izlash
                            </button>
                        </div>
                    )}
                    {!selectedCategory ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
                            {mainCategories.filter(c => (c[`name_${language}`] || c.name).toLowerCase().includes(searchQuery.toLowerCase())).map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat)}
                                    className="group flex flex-col items-center gap-4 p-4 md:p-8 bg-gray-50/50 rounded-[40px] border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all duration-500"
                                >
                                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-[32px] overflow-hidden bg-white shadow-xl shadow-black/5 group-hover:scale-105 transition-transform duration-500 relative">
                                        {cat.image ? (
                                            <Image 
                                                src={cat.image} 
                                                alt={cat.name} 
                                                fill
                                                className="object-cover" 
                                                sizes="(max-width: 768px) 80px, 128px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-100"><LayoutGrid size={40} /></div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs md:text-[13px] font-black uppercase tracking-widest text-gray-800 group-hover:text-black transition-colors">
                                            {cat[`name_${language}`] || cat.name}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <button 
                                onClick={() => router.push(`/${language}/?category=${selectedCategory.id}`)}
                                className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <Grid3X3 size={18} />
                                {language === 'uz' ? 'Turkumdagi barcha mahsulotlar' : 'Все товары категории'}
                            </button>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
                                {subCategories.filter(c => (c[`name_${language}`] || c.name).toLowerCase().includes(searchQuery.toLowerCase())).map((sub) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleCategoryClick(sub)}
                                        className="group flex flex-col items-center gap-4 p-4 md:p-8 bg-gray-50/50 rounded-[40px] border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all duration-500"
                                    >
                                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-[28px] overflow-hidden bg-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform relative">
                                            {sub.image ? (
                                                <Image 
                                                    src={sub.image} 
                                                    alt={sub.name} 
                                                    fill
                                                    className="object-cover" 
                                                    sizes="(max-width: 768px) 64px, 96px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-100"><ShoppingBag size={32} /></div>
                                            )}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-600 text-center leading-tight group-hover:text-black transition-colors">
                                            {sub[`name_${language}`] || sub.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {subCategories.length === 0 && searchQuery === "" && (
                                <div className="py-20 text-center opacity-20">
                                    <ShoppingBag size={64} className="mx-auto mb-6" />
                                    <p className="text-sm font-black uppercase tracking-widest">
                                        {language === 'uz' ? 'Sub-turkumlar yo\'q' : 'Подкатегорий нет'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
