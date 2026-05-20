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

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export const CategoryFilter = ({
    allCategories,
    activeFilter,
    setActiveFilter,
    activeParent,
    setActiveParent,
    language,
    translations,
    setHomeActiveFilter,
}: CategoryFilterProps) => {
    const t = translations;
    const mainCategories = allCategories.filter(c => !c.parentId);
    const subCategories = allCategories.filter(c => c.parentId === (activeParent !== "all" ? activeParent : null));
    const hasSubCats = subCategories.length > 0 && activeParent !== "all";

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
        const current = allCategories.find(c => c.id === activeFilter);
        if (current?.parentId) {
            setActiveFilter(current.parentId);
            setHomeActiveFilter(current.parentId);
        }
    };

    const catName = (cat: Category) =>
        (language === "uz" ? cat.name_uz : cat.name_ru) || cat.name;

    if (allCategories.length === 0) {
        return (
            <div className="mt-6 px-4 flex gap-2 overflow-x-auto no-scrollbar py-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 80, height: 36, borderRadius: 18, background: "#F0F0EC", animation: "velari-shimmer 1.6s infinite", backgroundSize: "200% 100%" }} />
                ))}
            </div>
        );
    }

    return (
        <div className="mt-4 flex flex-col" style={{ gap: 0 }}>
            {/* ── Mobile: Velari chip style ── */}
            <div
                className="md:hidden flex gap-2 overflow-x-auto no-scrollbar px-4 py-2"
                style={{ scrollbarWidth: "none" }}
            >
                {/* "Hammasi" chip */}
                <button
                    onClick={() => handleMainClick("all")}
                    style={{
                        flexShrink: 0,
                        height: 36,
                        padding: "0 16px",
                        borderRadius: 18,
                        border: activeFilter === "all" ? "none" : "1px solid rgba(15,20,16,0.08)",
                        background: activeFilter === "all" ? "#0F1410" : "#fff",
                        color: activeFilter === "all" ? "#fff" : "#0F1410",
                        fontSize: 14,
                        fontWeight: 500,
                        letterSpacing: -0.1,
                        cursor: "pointer",
                        transition: `all 200ms ${EASE}`,
                        WebkitTapHighlightColor: "transparent",
                        whiteSpace: "nowrap",
                    }}
                >
                    {t.common.all}
                </button>

                {mainCategories.map(cat => {
                    const isActive = activeFilter === cat.id || activeParent === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleMainClick(cat.id)}
                            style={{
                                flexShrink: 0,
                                height: 36,
                                padding: "0 16px",
                                borderRadius: 18,
                                border: isActive ? "none" : "1px solid rgba(15,20,16,0.08)",
                                background: isActive ? "#0F1410" : "#fff",
                                color: isActive ? "#fff" : "#0F1410",
                                fontSize: 14,
                                fontWeight: 500,
                                letterSpacing: -0.1,
                                cursor: "pointer",
                                transition: `all 200ms ${EASE}`,
                                WebkitTapHighlightColor: "transparent",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {catName(cat)}
                        </button>
                    );
                })}
            </div>

            {/* Mobile subcategories row */}
            {hasSubCats && (
                <div
                    className="md:hidden flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2"
                    style={{ animation: "velari-slide-in 260ms cubic-bezier(0.22,1,0.36,1)" }}
                >
                    {/* Back button */}
                    {allCategories.find(c => c.id === activeFilter)?.parentId && (
                        <button
                            onClick={handleBack}
                            style={{
                                flexShrink: 0,
                                width: 36,
                                height: 32,
                                borderRadius: 16,
                                background: "#fff",
                                border: "1px solid rgba(15,20,16,0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            <ChevronLeft size={16} color="#5A625C" />
                        </button>
                    )}

                    {subCategories.map(sub => {
                        const isActive = activeFilter === sub.id;
                        return (
                            <button
                                key={sub.id}
                                onClick={() => handleSubClick(sub.id)}
                                style={{
                                    flexShrink: 0,
                                    height: 32,
                                    padding: "0 14px",
                                    borderRadius: 16,
                                    background: isActive ? "#EAF3EC" : "#fff",
                                    border: isActive ? "1.5px solid #2D6E3E" : "1px solid rgba(15,20,16,0.08)",
                                    color: isActive ? "#2D6E3E" : "#5A625C",
                                    fontSize: 13,
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: "pointer",
                                    transition: `all 180ms ${EASE}`,
                                    WebkitTapHighlightColor: "transparent",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {catName(sub)}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Desktop: original style (unchanged) ── */}
            <div className="hidden md:flex flex-col gap-4 px-0 mt-8">
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                    <button
                        onClick={() => handleMainClick("all")}
                        className={`shrink-0 px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 ${activeFilter === "all" ? "bg-black text-white border-black shadow-2xl shadow-black/20" : "bg-[#F2F3F5] text-gray-400 border-transparent hover:bg-[#EBEDF0] hover:text-black"}`}
                    >
                        {t.common.all}
                    </button>
                    {mainCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleMainClick(cat.id)}
                            className={`shrink-0 px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 ${activeFilter === cat.id || activeParent === cat.id ? "bg-black text-white border-black shadow-2xl shadow-black/20" : "bg-[#F2F3F5] text-gray-400 border-transparent hover:bg-[#EBEDF0] hover:text-black"}`}
                        >
                            {catName(cat)}
                        </button>
                    ))}
                </div>

                {activeFilter !== "all" && subCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {allCategories.find(c => c.id === activeFilter)?.parentId && (
                            <button
                                onClick={handleBack}
                                className="shrink-0 p-3 bg-gray-100 rounded-xl text-gray-500 hover:text-black transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        {subCategories.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubClick(sub.id)}
                                className="shrink-0 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-[11px] font-bold text-gray-600 transition-all border border-gray-100"
                            >
                                {catName(sub)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
