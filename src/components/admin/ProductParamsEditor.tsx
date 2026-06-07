"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, ChevronDown, Loader2, Settings } from "lucide-react";

interface CategoryParam {
    id: string;
    category_id: string;
    name: string;
    name_uz: string | null;
    name_ru: string | null;
    type: string;
    predefined_values: string[];
    is_required: boolean;
    sort_order: number;
}

interface ParamValue {
    param_id: string;
    value: string;
}

interface ProductParamsEditorProps {
    categoryId: string;
    productId?: string;
    paramValues: ParamValue[];
    onParamValuesChange: (values: ParamValue[]) => void;
}

export default function ProductParamsEditor({ categoryId, productId, paramValues, onParamValuesChange }: ProductParamsEditorProps) {
    const [params, setParams] = useState<CategoryParam[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddParam, setShowAddParam] = useState(false);
    const [newParamName, setNewParamName] = useState("");
    const [newParamNameUz, setNewParamNameUz] = useState("");
    const [newParamNameRu, setNewParamNameRu] = useState("");
    const [newParamType, setNewParamType] = useState<"select" | "text" | "number">("select");
    const [saving, setSaving] = useState(false);

    // Autocomplete states per param
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (categoryId) {
            fetchParams();
        } else {
            setParams([]);
        }
    }, [categoryId]);

    // Load existing param values when editing a product
    useEffect(() => {
        if (productId && categoryId && params.length > 0) {
            loadProductParams();
        }
    }, [productId, params]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchParams = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/category-params?category_id=${categoryId}`);
            const data = await res.json();
            if (data.data) setParams(data.data);
        } catch (e) {
            console.error("Fetch params error:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadProductParams = async () => {
        if (!productId) return;
        try {
            const res = await fetch(`/api/admin/product-params?product_id=${productId}`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                const loaded = data.data.map((d: any) => ({
                    param_id: d.param_id,
                    value: d.value || ""
                }));
                onParamValuesChange(loaded);
            }
        } catch (e) {
            console.error("Load product params error:", e);
        }
    };

    const handleAddParam = async () => {
        if (!newParamName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/category-params", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category_id: categoryId,
                    name: newParamName.trim(),
                    name_uz: newParamNameUz.trim() || newParamName.trim(),
                    name_ru: newParamNameRu.trim() || newParamName.trim(),
                    type: newParamType,
                    predefined_values: [],
                    is_required: false,
                    sort_order: params.length
                })
            });
            if (res.ok) {
                await fetchParams();
                setNewParamName("");
                setNewParamNameUz("");
                setNewParamNameRu("");
                setNewParamType("select");
                setShowAddParam(false);
            }
        } catch (e) {
            console.error("Add param error:", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteParam = async (paramId: string) => {
        if (!window.confirm("Bu parametrni o'chirib yubormoqchimisiz? Barcha mahsulotlardagi qiymatlari ham o'chadi.")) return;
        try {
            await fetch("/api/admin/category-params", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: paramId })
            });
            await fetchParams();
            // Remove from values too
            onParamValuesChange(paramValues.filter(pv => pv.param_id !== paramId));
        } catch (e) {
            console.error("Delete param error:", e);
        }
    };

    const handleValueChange = (paramId: string, value: string) => {
        const existing = paramValues.find(pv => pv.param_id === paramId);
        if (existing) {
            onParamValuesChange(paramValues.map(pv => pv.param_id === paramId ? { ...pv, value } : pv));
        } else {
            onParamValuesChange([...paramValues, { param_id: paramId, value }]);
        }
    };

    const handleAddPredefinedValue = async (param: CategoryParam, newValue: string) => {
        if (!newValue.trim()) return;
        try {
            const res = await fetch("/api/admin/category-params", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: param.id,
                    predefined_values: [newValue.trim()]
                })
            });
            if (res.ok) {
                // Update local state
                setParams(prev => prev.map(p =>
                    p.id === param.id
                        ? { ...p, predefined_values: [...(p.predefined_values || []), newValue.trim()] }
                        : p
                ));
            }
        } catch (e) {
            console.error("Add predefined value error:", e);
        }
    };

    const getParamValue = (paramId: string): string => {
        return paramValues.find(pv => pv.param_id === paramId)?.value || "";
    };

    if (!categoryId) return null;

    return (
        <div className="bg-amber-50/40 p-6 rounded-[32px] border border-amber-200/60 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Settings size={16} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                        Xususiyatlar (Parametrlar)
                    </h4>
                    {params.length > 0 && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">
                            {params.length} ta
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddParam(!showAddParam)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                >
                    <Plus size={12} /> Yangi parametr
                </button>
            </div>

            {/* Add new parameter form */}
            {showAddParam && (
                <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-3 animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-3 gap-3">
                        <input
                            value={newParamName}
                            onChange={e => { setNewParamName(e.target.value); setNewParamNameUz(e.target.value); }}
                            className="bg-gray-50 border-none rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="Parametr nomi"
                        />
                        <input
                            value={newParamNameRu}
                            onChange={e => setNewParamNameRu(e.target.value)}
                            className="bg-gray-50 border-none rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="Русское название"
                        />
                        <div className="flex gap-2">
                            <select
                                value={newParamType}
                                onChange={e => setNewParamType(e.target.value as any)}
                                className="flex-1 bg-gray-50 border-none rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                            >
                                <option value="select">Ro'yxat</option>
                                <option value="text">Matn</option>
                                <option value="number">Son</option>
                            </select>
                            <button
                                type="button"
                                disabled={saving || !newParamName.trim()}
                                onClick={handleAddParam}
                                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-all disabled:opacity-40"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : "Qo'shish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="animate-spin text-amber-500" size={24} />
                </div>
            )}

            {/* Params list */}
            {!loading && params.length > 0 && (
                <div className="grid grid-cols-2 gap-3" ref={dropdownRef}>
                    {params.map(param => {
                        const currentValue = getParamValue(param.id);
                        const searchTerm = searchTerms[param.id] || "";
                        const filteredValues = (param.predefined_values || []).filter(v =>
                            v.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        const isOpen = openDropdown === param.id;
                        const typedValueNotInList = searchTerm.trim() && 
                            !(param.predefined_values || []).some(v => v.toLowerCase() === searchTerm.trim().toLowerCase());

                        return (
                            <div key={param.id} className="space-y-1 relative">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">
                                        {param.name_uz || param.name}
                                        {param.is_required && <span className="text-red-400 ml-0.5">*</span>}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteParam(param.id)}
                                        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                                        title="O'chirish"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>

                                {param.type === "select" ? (
                                    <div className="relative">
                                        <div
                                            className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-3 text-xs font-bold cursor-pointer flex items-center justify-between hover:border-amber-300 transition-colors"
                                            onClick={() => {
                                                setOpenDropdown(isOpen ? null : param.id);
                                                setSearchTerms(prev => ({ ...prev, [param.id]: currentValue }));
                                            }}
                                        >
                                            <span className={currentValue ? "text-black" : "text-gray-300"}>
                                                {currentValue || "Tanlang..."}
                                            </span>
                                            <ChevronDown size={14} className={`text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                        </div>

                                        {isOpen && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-52 overflow-hidden animate-in zoom-in-95 duration-150">
                                                {/* Search input */}
                                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                                                        <input
                                                            autoFocus
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerms(prev => ({ ...prev, [param.id]: e.target.value }))}
                                                            className="w-full bg-gray-50 border-none rounded-lg py-2 pl-7 pr-3 text-xs font-bold focus:ring-2 focus:ring-amber-400 outline-none"
                                                            placeholder="Qidiring yoki yangi yozing..."
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Options list */}
                                                <div className="overflow-y-auto max-h-36">
                                                    {/* Clear option */}
                                                    {currentValue && (
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors italic"
                                                            onClick={() => {
                                                                handleValueChange(param.id, "");
                                                                setOpenDropdown(null);
                                                            }}
                                                        >
                                                            — Tozalash —
                                                        </button>
                                                    )}

                                                    {filteredValues.map((val, vi) => (
                                                        <button
                                                            type="button"
                                                            key={vi}
                                                            className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${
                                                                currentValue === val
                                                                    ? "bg-amber-50 text-amber-700"
                                                                    : "hover:bg-gray-50 text-gray-700"
                                                            }`}
                                                            onClick={() => {
                                                                handleValueChange(param.id, val);
                                                                setOpenDropdown(null);
                                                                setSearchTerms(prev => ({ ...prev, [param.id]: "" }));
                                                            }}
                                                        >
                                                            {val}
                                                        </button>
                                                    ))}

                                                    {filteredValues.length === 0 && !typedValueNotInList && (
                                                        <div className="px-3 py-4 text-xs text-gray-300 text-center italic">
                                                            Topilmadi
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Add new value button — appears when typed value doesn't exist in list */}
                                                {typedValueNotInList && (
                                                    <div className="p-2 border-t border-gray-100 bg-amber-50/50">
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-lg text-xs font-black hover:bg-amber-600 transition-all"
                                                            onClick={() => {
                                                                const val = searchTerm.trim();
                                                                handleAddPredefinedValue(param, val);
                                                                handleValueChange(param.id, val);
                                                                setOpenDropdown(null);
                                                                setSearchTerms(prev => ({ ...prev, [param.id]: "" }));
                                                            }}
                                                        >
                                                            <Plus size={14} />
                                                            "{searchTerm.trim()}" qo'shish
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : param.type === "number" ? (
                                    <input
                                        type="number"
                                        value={currentValue}
                                        onChange={e => handleValueChange(param.id, e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-amber-400 outline-none hover:border-amber-300 transition-colors"
                                        placeholder="Raqam kiriting"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={currentValue}
                                        onChange={e => handleValueChange(param.id, e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-amber-400 outline-none hover:border-amber-300 transition-colors"
                                        placeholder="Matn kiriting"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && params.length === 0 && (
                <div className="text-center py-6">
                    <p className="text-xs text-gray-400 italic">
                        Bu kategoriyada hali parametrlar yo'q. "Yangi parametr" tugmasini bosing.
                    </p>
                </div>
            )}
        </div>
    );
}
