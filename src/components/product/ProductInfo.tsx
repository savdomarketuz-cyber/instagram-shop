"use client";

import Link from "next/link";
import { Star, Check, Truck, Clock } from "lucide-react";

interface ProductInfoProps {
    product: any;
    language: "uz" | "ru";
    t: any;
    groupProducts: any[];
    totalStock: number;
    getDeliveryDateText: () => string;
    onDescriptionOpen: () => void;
}

export const ProductInfo = ({
    product, language, t, groupProducts, totalStock, getDeliveryDateText, onDescriptionOpen
}: ProductInfoProps) => {
    return (
        <div className="px-8 pt-10 relative -mt-12 bg-white rounded-t-[50px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
            <div className="mb-10">
                {product.isOriginal && (
                    <div className="inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                            <Check size={10} className="text-white" strokeWidth={5} />
                        </div>
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest italic">
                            {language === 'uz' ? 'Original Sifat' : 'Оригинальное качество'}
                        </span>
                    </div>
                )}
                
                <h1 className="text-xl font-bold mb-3 leading-tight text-gray-900">
                    {product[`name_${language}`] || product.name}
                </h1>

                <div className="flex items-center gap-2 mb-6">
                    <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                fill={(product.rating || 0) > i ? "currentColor" : "none"} 
                                className={(product.rating || 0) > i ? "text-yellow-400" : "text-gray-200"} 
                                size={14}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-black text-gray-400">
                        {(product.reviewCount || 0) > 0 
                            ? `${(product.rating || 0).toFixed(1)} (${product.reviewCount} ${language === 'uz' ? 'sharhlar' : 'отзывов'})` 
                            : (language === 'uz' ? 'Yangi mahsulot' : 'Новый товар')}
                    </span>
                </div>

                {groupProducts.length > 1 && (
                    <div className="mb-8 text-black animate-in fade-in duration-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                            {language === 'uz' ? 'Rang' : 'Цвет'}: <span className="text-black font-black italic">{product.colorName || (language === 'uz' ? "Tanlanmagan" : "Не выбран")}</span>
                        </p>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {groupProducts.map((v) => (
                                <Link 
                                    replace 
                                    key={v.id} 
                                    href={`/products/${v.id}`} 
                                    className={`w-16 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 shadow-sm ${v.id === product.id ? "border-black scale-110 shadow-xl" : "border-gray-100 opacity-60 hover:opacity-100"}`}
                                >
                                    <img src={v.image} className="w-full h-full object-cover" alt={v.colorName} />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {totalStock > 0 && (
                        <div className="flex items-center gap-3 bg-green-50 p-4 rounded-3xl border border-green-100 animate-in fade-in slide-in-from-left duration-500">
                            <div className="p-2 bg-green-100 text-green-600 rounded-2xl"><Check size={18} strokeWidth={3} /></div>
                            <p className="text-xs font-black text-gray-700 uppercase tracking-tighter transition-all">
                                {language === 'uz' ? 'Qoldiq' : 'В наличии'}: <span className="text-black">{totalStock} {language === 'uz' ? 'ta mavjud' : 'шт'}</span>
                            </p>
                        </div>
                    )}
                    <div className="mt-8 p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center gap-5 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5 group">
                        <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform">
                            <Truck size={24} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.common.delivery} (DBS)</p>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black italic uppercase tracking-tighter">{getDeliveryDateText()}</span>
                                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                                <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider">
                                    <Clock size={12} strokeWidth={3} />
                                    <span>{language === 'uz' ? 'Tezkor' : 'Быстро'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-10 bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.common.price}</p>
                <div className="flex items-end gap-3 flex-wrap">
                    <div className={`text-4xl font-black italic tracking-tighter ${product.oldPrice && product.oldPrice > product.price ? 'text-red-500' : 'text-black'}`}>
                        {product.price.toLocaleString()} <span className="text-xl not-italic">$</span>
                    </div>
                    {product.oldPrice && product.oldPrice > product.price && (
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-400 line-through font-bold text-lg">{product.oldPrice.toLocaleString()} $</span>
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tighter shadow-lg shadow-red-200">
                                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-900 mb-6">{language === 'uz' ? 'Mahsulot tavsifi' : 'Описание товара'}</h2>
                <button
                    onClick={onDescriptionOpen}
                    className="w-full bg-blue-50/50 border border-blue-100 py-4 rounded-2xl text-sm font-bold text-gray-700 hover:bg-blue-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {language === 'uz' ? "To'liq tavsif" : "Полное описание"}
                </button>
            </div>
        </div>
    );
};
