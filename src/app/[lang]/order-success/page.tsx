"use client";

import { CheckCircle, Sparkles, Gift, ArrowRight, Wallet, History } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

function SuccessContent() {
    const { language } = useStore();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const [potentialCashback, setPotentialCashback] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            fetchOrderReward();
        } else {
            setLoading(false);
        }
    }, [orderId]);

    const fetchOrderReward = async () => {
        const { user } = useStore.getState();
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("potential_cashback")
                .eq("id", orderId!)
                .eq("user_phone", user?.phone || "NONE")
                .single();
            
            if (data?.potential_cashback) {
                setPotentialCashback(Number(data.potential_cashback));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            {/* Header Icon */}
            <div className="relative mb-10">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center animate-bounce-slow">
                    <CheckCircle size={48} strokeWidth={3} />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 text-white rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                    <Sparkles size={20} />
                </div>
            </div>

            <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2 leading-tight">
                {language === 'uz' ? 'BUYURTMA QABUL QILINDI!' : 'ЗАКАЗ ПРИНЯТ!'}
            </h1>
            <p className="text-gray-400 mb-10 max-w-xs mx-auto font-black text-[10px] uppercase tracking-widest italic">
                {language === 'uz'
                    ? 'Buyurtmangiz muvaffaqiyatli qabul qilindi. Tez orada siz bilan bog\'lanamiz.'
                    : 'Ваш заказ успешно принят. Мы свяжемся с вами в ближайшее время.'}
            </p>

            {/* Reward Card - The "Qiziqroq" part */}
            {potentialCashback > 0 && (
                <div className="w-full max-w-sm bg-gradient-to-br from-black via-gray-900 to-gray-800 p-8 rounded-[40px] mb-12 shadow-2xl relative overflow-hidden group">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-8 h-8 bg-white/10 text-emerald-400 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <Gift size={18} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Xushxabar!</span>
                        </div>
                        
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black italic tracking-tighter text-white">
                                + {potentialCashback.toLocaleString()} <span className="text-xl not-italic text-gray-500">so'm</span>
                            </h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Kashbek kutilmoqda</p>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <p className="text-[10px] font-medium text-gray-400 leading-relaxed max-w-[240px] mx-auto italic">
                                {language === 'uz' 
                                    ? "Ushbu summa buyurtma yetkazilgandan so'ng avtomatik hamyoningizga tushadi!"
                                    : "Эта сумма поступит на ваш кошелек после доставки заказа!"}
                            </p>
                        </div>
                    </div>
                    
                    {/* Floating Sparkles Animation */}
                    <div className="absolute top-6 right-8 text-yellow-400/30 animate-pulse">
                        <Sparkles size={14} />
                    </div>
                </div>
            )}

            <div className="space-y-4 w-full max-w-sm">
                <Link
                    href="/"
                    className="group w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-black/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                    {language === 'uz' ? 'Xaridni davom ettirish' : 'Продолжить покупки'}
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </Link>
                <div className="flex gap-4">
                    <Link
                        href="/orders"
                        className="flex-1 bg-gray-50 text-gray-500 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 border border-gray-100"
                    >
                        <History size={16} />
                        {language === 'uz' ? 'Tarix' : 'История'}
                    </Link>
                    <Link
                        href="/account"
                        className="flex-1 bg-gray-50 text-emerald-600 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 border border-gray-100"
                    >
                        <Wallet size={16} />
                        {language === 'uz' ? 'Hamyon' : 'Кошелек'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function OrderSuccess() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
