"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import {
    Search, Heart, ChevronRight, ChevronLeft,
    LayoutGrid, ShoppingBag, Loader2, Grid3X3
} from "lucide-react";
import { useRouter } from "next/navigation";
import { translations } from "@/lib/translations";
import { db, collection, query, getDocs, orderBy } from "@/lib/firebase";

interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
    image?: string;
}

export default function CatalogPage() {
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
                const cq = query(collection(db, "categories"), orderBy("name", "asc"));
                const cSnapshot = await getDocs(cq);
                const cData = cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
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

    // Filter main categories (those with no parent or specifically selected)
    const mainCategories = allCategories.filter(c => !c.parentId);
    const subCategories = selectedCategory
        ? allCategories.filter(c => c.parentId === selectedCategory.id)
        : [];

    const handleCategoryClick = (category: Category) => {
        const hasSubs = allCategories.some(c => c.parentId === category.id);
        if (hasSubs) {
            setSelectedCategory(category);
        } else {
            router.push(`/?category=${category.id}`);
        }
    };

    if (loading && allCategories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white h-screen">
                <Loader2 className="animate-spin text-black/20" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col pt-12 pb-24 h-screen overflow-hidden">
            {/* Top Search Bar */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50 bg-white">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === 'uz' ? "Mahsulotlar va turkumlar izlash" : "Поиск товаров и категорий"}
                        className="w-full bg-gray-100 rounded-[14px] py-3.5 pl-12 pr-4 text-sm font-bold border-none focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                    />
                </div>
                <button
                    onClick={() => router.push('/wishlist')}
                    className="p-1 hover:scale-110 active:scale-90 transition-all"
                >
                    <Heart size={24} className="text-gray-300" />
                </button>
            </div>

            {/* Catalog Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                {!selectedCategory ? (
                    /* Main Categories List */
                    <div className="divide-y divide-gray-50">
                        {mainCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat)}
                                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform border border-gray-50 shadow-sm">
                                        {cat.image ? (
                                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <LayoutGrid className="text-gray-300" size={20} />
                                        )}
                                    </div>
                                    <span className="text-[15px] font-bold text-gray-800 tracking-tight">
                                        {cat[`name_${language}`] || cat.name}
                                    </span>
                                </div>
                                <ChevronRight size={18} className="text-gray-300" />
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Subcategories View (Drill Down) */
                    <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="flex items-center gap-3 p-5 text-gray-400 font-bold text-xs uppercase tracking-widest bg-gray-50/50"
                        >
                            <ChevronLeft size={16} />
                            {language === 'uz' ? 'Barcha turkumlar' : 'Все категории'}
                        </button>

                        <div className="p-5 flex items-center gap-4 border-b border-gray-100">
                            <div className="w-12 h-12 rounded-[18px] bg-black text-white flex items-center justify-center shadow-lg shadow-black/10">
                                <Grid3X3 size={24} />
                            </div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase">
                                {selectedCategory[`name_${language}`] || selectedCategory.name}
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-50">
                            <button
                                onClick={() => router.push(`/?category=${selectedCategory.id}`)}
                                className="w-full p-6 text-left group"
                            >
                                <span className="text-[14px] font-black italic uppercase tracking-tighter group-hover:text-purple-600 transition-colors border-b-2 border-black/5">
                                    {language === 'uz' ? 'Turkumning barcha mahsulotlari' : 'Все товары категории'}
                                </span>
                            </button>

                            {subCategories.map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => handleCategoryClick(sub)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 group"
                                >
                                    <span className="text-[14px] font-bold text-gray-700 tracking-tight leading-tight">
                                        {sub[`name_${language}`] || sub.name}
                                    </span>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </button>
                            ))}

                            {subCategories.length === 0 && (
                                <div className="p-20 text-center opacity-20">
                                    <ShoppingBag size={48} className="mx-auto mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">
                                        {language === 'uz' ? 'Sub-turkumlar yo\'q' : 'Подкатегорий нет'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
