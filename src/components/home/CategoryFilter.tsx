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

    if (allCategories.length === 0) {
        return (
            <div className="mt-8 px-4 flex gap-3 overflow-x-auto no-scrollbar py-2">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="shrink-0 w-24 h-10 bg-gray-50 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }
    
    return (
        <div className="mt-12 px-0 flex flex-col gap-6">
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-2 md:px-0">
                <button
                    onClick={() => handleMainClick("all")}
                    className={`shrink-0 px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 ${activeFilter === 'all' ? 'bg-black text-white border-black shadow-2xl shadow-black/20' : 'bg-[#F2F3F5] text-gray-400 border-transparent hover:bg-[#EBEDF0] hover:text-black'}`}
                >
                    {t.common.all}
                </button>
                {mainCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => handleMainClick(cat.id)}
                        className={`shrink-0 px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 ${activeFilter === cat.id || activeParent === cat.id ? 'bg-black text-white border-black shadow-2xl shadow-black/20' : 'bg-[#F2F3F5] text-gray-400 border-transparent hover:bg-[#EBEDF0] hover:text-black'}`}
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
