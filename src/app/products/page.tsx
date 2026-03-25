"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter, Plus, Loader2, Search, ShoppingBag } from "lucide-react";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { supabase } from "@/lib/supabase";
import { mapProduct } from "@/lib/mappers";

import type { Product } from "@/types";

export default function ProductsPage() {
    const { addToCart, language } = useStore();
    const t = translations[language];
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            setProducts(data.map(mapProduct));
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = products.filter(p => {
        const name = (p[`name_${language}`] || p.name).toLowerCase();
        const category = (p[`category_${language}`] || p.category || "").toLowerCase();
        return name.includes(search.toLowerCase()) || category.includes(search.toLowerCase());
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 bg-white min-h-screen pb-24">
            <div className="flex items-center justify-between mb-8 mt-4">
                <h1 className="text-3xl font-black tracking-tighter italic uppercase">
                    {language === 'uz' ? 'Katalog' : 'Каталог'}
                </h1>
                <Link href="/cart" className="p-3 bg-gray-50 rounded-2xl relative">
                    <ShoppingBag size={20} />
                </Link>
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.common.search}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-10">
                {filtered.map((item) => (
                    <div key={item.id} className="block group relative">
                        <Link href={`/products/${item.id}`}>
                            <div className="relative aspect-[3/4] overflow-hidden rounded-[32px] bg-gray-50 mb-3 shadow-sm group-hover:shadow-xl transition-all duration-700">
                                <img src={item.image} alt={item[`name_${language}`] || item.name} className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-110" />
                                {item.stock === 0 && (
                                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {t.common.outOfStock}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Link>

                        {item.stock > 0 && (
                            <button
                                onClick={() => addToCart({
                                    ...item,
                                    image: item.image,
                                    sales: item.sales || 0
                                } as Product)}
                                className="absolute top-2 right-2 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:bg-black hover:text-white transition-all z-10"
                            >
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        )}

                        <Link href={`/products/${item.id}`}>
                            <h3 className="text-[13px] font-black text-gray-900 leading-tight truncate px-1">
                                {item[`name_${language}`] || item.name}
                            </h3>
                            <p className="text-lg font-black italic tracking-tighter px-1">{item.price.toLocaleString()} so'm</p>
                        </Link>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">{t.common.noProducts}</p>
                </div>
            )}
        </div>
    );
}
