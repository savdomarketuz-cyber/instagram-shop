"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, ShoppingCart, Package } from "lucide-react";
import { translations } from "@/lib/translations";

export default function CartPage() {
    const { cart, updateQuantity, removeFromCart, language } = useStore();
    const t = translations[language];

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="p-8 bg-white min-h-screen pb-32 flex flex-col pt-16">
            <div className="flex items-center justify-between mb-12">
                <h1 className="text-4xl font-black tracking-tighter italic uppercase">{t.cart.title}</h1>
                <div className="flex items-center gap-3">
                    <Link href="/orders" className="p-4 bg-gray-50 rounded-[28px] text-gray-400 hover:text-black hover:bg-gray-100 transition-all flex items-center gap-2 group">
                        <Package size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                    </Link>
                    <div className="p-4 bg-black text-white rounded-[28px] shadow-xl shadow-black/10">
                        <ShoppingCart size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
                    <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6 text-gray-200">
                        <ShoppingBag size={48} />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-8">{t.cart.empty}</p>
                    <Link href="/" className="bg-black text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">
                        {language === 'uz' ? 'Xaridni boshlash' : 'Начать покупки'}
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-8 flex-1">
                        {cart.map((item) => (
                            <div key={item.id} className="flex gap-6 group">
                                <div className="w-28 h-28 bg-gray-50 rounded-[32px] overflow-hidden flex-shrink-0 shadow-sm border border-gray-50 group-hover:shadow-xl transition-all duration-500">
                                    <img src={item.imageUrl} alt={item[`name_${language}`] || item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-black text-sm text-gray-900 leading-tight uppercase tracking-tight">
                                                {item[`name_${language}`] || item.name}
                                            </h3>
                                            <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <p className="text-xl font-black italic tracking-tighter">{item.price} $</p>
                                    </div>
                                    <div className="flex justify-start items-center mt-4">
                                        <div className="flex items-center gap-6 bg-gray-50 border border-gray-100 px-5 py-2.5 rounded-2xl shadow-sm">
                                            <button
                                                onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                                                className="text-gray-400 hover:text-black transition-colors"
                                            >
                                                <Minus size={16} strokeWidth={3} />
                                            </button>
                                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="text-gray-400 hover:text-black transition-colors"
                                            >
                                                <Plus size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">{t.common.total}</p>
                                <div className="text-4xl font-black italic tracking-tighter text-black">
                                    {total.toLocaleString()} $
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cart.length} {t.cart.items}</p>
                        </div>
                        <Link
                            href="/checkout"
                            className="w-full bg-black text-white py-6 rounded-full font-black text-xl hover:bg-gray-900 transition-all shadow-2xl flex justify-center items-center gap-4 active:scale-95 group"
                        >
                            <span>{t.common.checkout.toUpperCase()}</span>
                            <ArrowRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
