"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";

interface SpecItem {
    name: string;
    name_uz: string | null;
    name_ru: string | null;
    value: string;
}

export function ProductSpecifications({ productId, language }: { productId: string; language: "uz" | "ru" }) {
    const [specs, setSpecs] = useState<SpecItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        fetch(`/api/admin/product-params?product_id=${productId}`)
            .then(res => res.json())
            .then(data => {
                if (data.data && data.data.length > 0) {
                    const items: SpecItem[] = data.data
                        .filter((d: any) => d.value && d.value.trim())
                        .map((d: any) => ({
                            name: d.category_params?.name || "",
                            name_uz: d.category_params?.name_uz || d.category_params?.name || "",
                            name_ru: d.category_params?.name_ru || d.category_params?.name || "",
                            value: d.value
                        }));
                    setSpecs(items);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading || specs.length === 0) return null;

    return (
        <div className="mx-4 md:mx-10 my-8">
            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-50 bg-gray-50/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/15">
                        <Settings size={15} />
                    </div>
                    <h3 className="text-sm md:text-base font-black text-gray-900 tracking-tight">
                        {language === "uz" ? "Xususiyatlari" : "Характеристики"}
                    </h3>
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {specs.length}
                    </span>
                </div>

                {/* Specs table */}
                <div className="divide-y divide-gray-50">
                    {specs.map((spec, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between px-6 md:px-8 py-3.5 transition-colors hover:bg-gray-50/50 ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"
                            }`}
                        >
                            <span className="text-xs md:text-sm font-semibold text-gray-400 flex-shrink-0 max-w-[45%]">
                                {language === "uz" ? (spec.name_uz || spec.name) : (spec.name_ru || spec.name)}
                            </span>
                            <span className="text-xs md:text-sm font-bold text-gray-900 text-right">
                                {spec.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
