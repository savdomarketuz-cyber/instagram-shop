"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, ShoppingCart, Package, ChevronLeft } from "lucide-react";
import { translations } from "@/lib/translations";
import Image from "next/image";

export default function CartPage() {
    const { cart, updateQuantity, removeFromCart, language } = useStore();
    const t = translations[language];

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="bg-white min-h-screen text-black w-full overflow-x-hidden">
            <div className="w-full px-4 md:px-10 pb-32">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-16 pt-8 md:pt-0 w-full">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <Link href="/" className="md:hidden p-3 bg-gray-50 rounded-2xl shrink-0">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase">
                            {t.cart.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Link href="/orders" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all flex items-center gap-2">
                            <Package size={20} strokeWidth={2.5} />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Buyurtmalar</span>
                        </Link>
                        <div className="p-3 bg-black text-white rounded-2xl">
                            <ShoppingCart size={22} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 md:py-40 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6 text-gray-200">
                            <ShoppingBag size={48} />
                        </div>
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-8">{t.cart.empty}</p>
                        <Link href="/" className="bg-black text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">
                            {language === 'uz' ? 'Xaridni boshlash' : 'Начать покупки'}
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">

                        {/* Mahsulotlar ro'yxati */}
                        <div className="w-full lg:col-span-8 space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white border border-gray-100 rounded-3xl p-4 w-full overflow-hidden">
                                    
                                    {/* Rasm + Nomi */}
                                    <div className="flex gap-3 w-full overflow-hidden">
                                        <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 relative">
                                            <Image
                                                src={item.imageUrl || item.image || ''}
                                                alt={item[`name_${language}`] || item.name}
                                                fill
                                                className="object-cover"
                                                sizes="80px"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <h3 className="font-black text-xs text-gray-900 leading-tight uppercase tracking-tight mb-2 line-clamp-2 break-words">
                                                {item[`name_${language}`] || item.name}
                                            </h3>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="inline-flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                                            >
                                                <Trash2 size={12} />
                                                {language === 'uz' ? "O'chirish" : "Удалить"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Miqdor + Narx */}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 w-full">
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl">
                                            <button
                                                onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                                                className="text-gray-400 hover:text-black transition-colors"
                                            >
                                                <Minus size={15} strokeWidth={3} />
                                            </button>
                                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="text-gray-400 hover:text-black transition-colors"
                                            >
                                                <Plus size={15} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <p className="text-base font-black italic tracking-tighter">
                                            {(item.price * item.quantity).toLocaleString('uz-UZ')} so'm
                                        </p>
                                    </div>

                                </div>
                            ))}
                        </div>

                        {/* Buyurtma xulosasi */}
                        <div className="w-full lg:col-span-4 lg:sticky lg:top-32">
                            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 w-full overflow-hidden">
                                <h2 className="text-lg font-black italic tracking-tighter uppercase mb-6">
                                    Buyurtma xulosasi
                                </h2>

                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                        <span>Mahsulotlar soni</span>
                                        <span className="text-black">{cart.length} ta</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                        <span>Yetkazib berish</span>
                                        <span className="text-green-600">Bepul</span>
                                    </div>
                                </div>

                                <div className="mb-6 w-full">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                                        {t.common.total}
                                    </p>
                                    <p className="text-3xl font-black italic tracking-tighter text-black break-words">
                                        {total.toLocaleString('uz-UZ')}
                                        <span className="text-xl not-italic opacity-80"> so'm</span>
                                    </p>
                                </div>

                                <Link
                                    href="/checkout"
                                    className="flex w-full bg-black text-white py-5 rounded-full font-black text-sm hover:bg-gray-900 transition-all shadow-xl justify-center items-center gap-3 active:scale-95 uppercase tracking-widest"
                                >
                                    <span>{t.common.checkout}</span>
                                    <ArrowRight size={20} strokeWidth={3} />
                                </Link>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
