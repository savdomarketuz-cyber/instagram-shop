"use client";

import { ChevronLeft } from "lucide-react";

interface Category {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parentId?: string;
}

interface CategoryFilterProps {
    allCategories: Category[];
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    activeParent: string;
    setActiveParent: (parent: string) => void;
    language: "uz" | "ru";
    translations: any;
    setHomeActiveFilter: (filter: string) => void;
}

export const CategoryFilter = ({ 
    allCategories, 
    activeFilter, 
    setActiveFilter, 
    activeParent, 
    setActiveParent, 
    language, 
    translations,
    setHomeActiveFilter
}: CategoryFilterProps) => {
    const t = translations;

    const mainCategories = allCategories.filter(c => !c.parentId);

    const handleMainClick = (id: string) => {
        setActiveFilter(id);
        setActiveParent(id);
        setHomeActiveFilter(id);
    };

    const handleSubClick = (id: string) => {
        setActiveFilter(id);
        setHomeActiveFilter(id);
    };

    const handleBack = () => {
        const parent = allCategories.find(c => c.id === activeFilter);
        if (parent?.parentId) {
            setActiveFilter(parent.parentId);
            setHomeActiveFilter(parent.parentId);
        }
    };

    return (
        <div className="mt-8 px-4 flex flex-col gap-3">
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                <button
                    onClick={() => handleMainClick("all")}
                    className={`shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === 'all' ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-gray-50 text-gray-400'}`}
                >
                    {t.common.all}
                </button>
                {mainCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => handleMainClick(cat.id)}
                        className={`shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === cat.id || activeParent === cat.id ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-gray-50 text-gray-400'}`}
                    >
                        {cat[`name_${language}`] || cat.name}
                    </button>
                ))}
            </div>

            {activeFilter !== "all" && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {allCategories.find(c => c.id === activeFilter)?.parentId && (
                        <button
                            onClick={handleBack}
                            className="shrink-0 p-3 bg-gray-100 rounded-xl text-gray-500 hover:text-black transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}

                    {allCategories.filter(c => c.parentId === activeFilter).map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => handleSubClick(sub.id)}
                            className="shrink-0 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-[11px] font-bold text-gray-600 transition-all border border-gray-100"
                        >
                            {sub[`name_${language}`] || sub.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
