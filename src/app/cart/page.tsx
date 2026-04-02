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
        <div className="bg-white min-h-screen text-black">
            <div className="max-w-[1440px] mx-auto p-4 md:p-10 pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-16 pt-8 md:pt-0">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="md:hidden p-3 bg-gray-50 rounded-2xl">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase">{t.cart.title}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/orders" className="p-4 bg-gray-50 rounded-[28px] text-gray-400 hover:text-black hover:bg-gray-100 transition-all flex items-center gap-2 group">
                            <Package size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Buyurtmalar</span>
                        </Link>
                        <div className="p-4 bg-black text-white rounded-[28px] shadow-xl shadow-black/10">
                            <ShoppingCart size={24} strokeWidth={2.5} />
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
                    <div className="grid grid-cols-12 gap-10 items-start">
                        {/* Left: Product List */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            <div className="hidden lg:grid grid-cols-12 px-6 mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <div className="col-span-6">Mahsulot</div>
                                <div className="col-span-3 text-center">Soni</div>
                                <div className="col-span-3 text-right">Narxi</div>
                            </div>
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white border md:border-gray-100 rounded-[40px] p-6 group hover:shadow-2xl hover:shadow-black/5 transition-all">
                                    <div className="grid grid-cols-12 gap-6 items-center">
                                        <div className="col-span-12 lg:col-span-6 flex gap-6 items-center">
                                            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-50 rounded-[32px] overflow-hidden flex-shrink-0 border border-gray-50 relative">
                                                <Image 
                                                    src={item.imageUrl || item.image || ''} 
                                                    alt={item[`name_${language}`] || item.name} 
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110" 
                                                    sizes="(max-width: 768px) 96px, 128px"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-xs md:text-sm text-gray-900 leading-tight uppercase tracking-tight mb-2 line-clamp-2">
                                                    {item[`name_${language}`] || item.name}
                                                </h3>
                                                <button 
                                                    onClick={() => removeFromCart(item.id)} 
                                                    className="inline-flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={14} /> {language === 'uz' ? "O'chirish" : "Удалить"}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile Optimized Grid */}
                                        <div className="col-span-12 lg:col-span-3 flex items-center justify-between lg:justify-center mt-4 lg:mt-0 pt-4 lg:pt-0 border-t border-gray-50 lg:border-none">
                                            <div className="flex items-center gap-6 bg-gray-50 border border-gray-100 px-5 py-3 rounded-2xl shadow-sm scale-90 md:scale-100 origin-left lg:origin-center">
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
                                            
                                            {/* Price only visible on right for mobile if we want, or side-by-side */}
                                            <div className="text-right lg:hidden">
                                                <p className="text-xl font-black italic tracking-tighter">{(item.price * item.quantity).toLocaleString()} so'm</p>
                                            </div>
                                        </div>

                                        {/* Desktop Price */}
                                        <div className="hidden lg:block lg:col-span-3 text-right">
                                            <p className="text-2xl font-black italic tracking-tighter">{(item.price * item.quantity).toLocaleString()} so'm</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right: Summary Panel */}
                        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-32">
                            <div className="bg-gray-50 p-5 md:p-10 rounded-[32px] md:rounded-[50px] border border-gray-100">
                                <h2 className="text-lg md:text-xl font-black italic tracking-tighter uppercase mb-6 md:mb-8">Buyurtma xulosasi</h2>
                                
                                <div className="space-y-4 mb-8 md:mb-10 pb-8 md:pb-10 border-b border-gray-200">
                                    <div className="flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400">
                                        <span>Mahsulotlar soni</span>
                                        <span className="text-black">{cart.length} ta</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400">
                                        <span>Yetkazib berish</span>
                                        <span className="text-green-600">Bepul</span>
                                    </div>
                                </div>

                                <div className="mb-8 md:mb-10 w-full">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">{t.common.total}</p>
                                    <div className="text-3xl md:text-4xl lg:text-5xl font-black italic tracking-tighter text-black flex flex-wrap items-baseline gap-1 leading-[1.1]">
                                        <span>{total.toLocaleString().replace(/\u00A0/g, ' ')}</span>
                                        <span className="text-xl lg:text-2xl not-italic opacity-80">so'm</span>
                                    </div>
                                </div>

                                <Link
                                    href="/checkout"
                                    className="w-full bg-black text-white py-5 md:py-6 rounded-full font-black text-base md:text-lg hover:bg-gray-900 transition-all shadow-2xl flex justify-center items-center gap-3 md:gap-4 active:scale-95 group uppercase tracking-widest"
                                >
                                    <span>{t.common.checkout}</span>
                                    <ArrowRight size={24} strokeWidth={3} className="group-hover:translate-x-2 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
