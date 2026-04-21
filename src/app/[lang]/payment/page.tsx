"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { CheckCircle, QrCode, Banknote, Clock, Info, AlertCircle, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";

function PaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { user, clearCart, language, showToast } = useStore();
    const t = translations[language];
    const [order, setOrder] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"click" | "cash">("click");

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        } else {
            setLoadingOrder(false);
            setError(language === 'uz' ? "Buyurtma topilmadi." : "Заказ не найден.");
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const response = await fetch(`/api/orders/get?orderId=${orderId}&phone=${user?.phone || ''}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                setError(language === 'uz' ? "Buyurtma topilmadi." : "Заказ не найден.");
            } else {
                setOrder(data.order);
            }
        } catch (e) {
            console.error("Fetch order error:", e);
            setError(language === 'uz' ? "Ma'lumotlarni yuklashda xatolik." : "Ошибка при загрузке данных.");
        } finally {
            setLoadingOrder(false);
        }
    };

    const handlePayment = async () => {
        if (!order || !orderId) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Note: Stock deduction is already handled atomically by the place_order RPC in the checkout page.
            // We do not decrement stock here to avoid double deduction.

            // 3. Update order status
            const finalStatus = paymentMethod === 'cash' 
                ? (language === 'uz' ? "Qabul qilindi" : "Принят")
                : (language === 'uz' ? "To'lov kutilmoqda" : "Ожидание оплаты");

            // 3. Update order status via secure API
            const updateResponse = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    status: finalStatus,
                    paymentMethod: paymentMethod,
                    userPhone: user?.phone || "" // Added for verification
                })
            });

            const updateData = await updateResponse.json();
            if (!updateResponse.ok) {
                throw new Error(updateData.message || "Buyurtmani yangilashda xatolik yuz berdi.");
            }

            clearCart();
            sessionStorage.removeItem('fast_buy_item');

            if (paymentMethod === "click") {
                const serviceId = process.env.NEXT_PUBLIC_CLICK_SERVICE_ID || "";
                const merchantId = process.env.NEXT_PUBLIC_CLICK_MERCHANT_ID || "";
                if (!serviceId || !merchantId) {
                    throw new Error("Click tizimi hozircha sozlanmagan.");
                }
                const returnUrl = encodeURIComponent(`${window.location.origin}/order-success`);
                
                // Standard parameters for Click
                const params = `service_id=${serviceId}&merchant_id=${merchantId}&amount=${order.total}&transaction_param=${orderId}&return_url=${returnUrl}`;
                const clickUrl = `https://my.click.uz/services/pay?${params}`;
                const clickDeepLink = `clickuz://payment?${params}`;

                // Detection
                const ua = navigator.userAgent;
                const isAndroid = /Android/i.test(ua);
                const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

                if (isAndroid) {
                    // Force open Click App for Android
                    window.location.href = clickDeepLink;
                    
                    // Fallback to Web after a short delay
                    setTimeout(() => {
                        if (document.hasFocus()) {
                            window.location.href = clickUrl;
                        }
                    }, 1000);
                } else if (isMobile) {
                    // iOS and others: New window context to break out of PWA
                    const newWindow = window.open(clickUrl, '_blank');
                    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                        window.location.href = clickUrl;
                    }
                } else {
                    // Desktop behavior
                    window.location.href = clickUrl;
                }
                return;
            }

            if (paymentMethod === "cash") {
                await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: orderId, method: 'cash' })
                });
            }

            router.push(`/order-success?orderId=${orderId}`);
        } catch (err: any) {
            console.error("Payment error:", err);
            setError(err.message || (language === 'uz' ? "Xatolik yuz berdi." : "Произошла ошибка."));
        } finally {
            setIsProcessing(false);
        }
    };

    if (loadingOrder) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="p-6 bg-white min-h-screen pt-12 pb-24">
            <div className="flex items-center gap-4 mb-10">
                <button 
                    onClick={() => router.back()} 
                    className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black italic tracking-tighter uppercase">
                    {language === 'uz' ? 'To\'lov usuli' : 'Способ оплаты'}
                </h1>
            </div>

            <div className="space-y-4 mb-8">
                {/* Click Option */}
                <div
                    onClick={() => setPaymentMethod("click")}
                    className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all ${paymentMethod === "click" ? "border-[#00a1ff] bg-[#00a1ff]/5 shadow-xl shadow-[#00a1ff]/10" : "border-gray-100"
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${paymentMethod === "click" ? "bg-[#00a1ff] text-white" : "bg-gray-100"}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.43 4 16.05 4 12C4 7.95 7.05 4.57 11 4.07V19.93ZM13 4.07C16.95 4.57 20 7.95 20 12C20 16.05 16.95 19.43 13 19.93V4.07Z" fill="currentColor" />
                                </svg>
                            </div>
                            <span className={`font-black text-sm italic uppercase tracking-tighter ${paymentMethod === "click" ? "text-[#00a1ff]" : ""}`}>
                                {language === 'uz' ? 'Click orqali to\'lash' : 'Оплата через Click'}
                            </span>
                        </div>
                        <input type="radio" checked={paymentMethod === "click"} readOnly className="accent-[#00a1ff] w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-14">
                        {language === 'uz' ? 'Avtomatlashtirilgan Click portaliga o\'tish' : 'Переход на портал Click'}
                    </p>
                </div>

                {/* Cash on Delivery Option */}
                <div
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all ${paymentMethod === "cash" ? "border-black bg-gray-50 shadow-xl shadow-black/5" : "border-gray-100"
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${paymentMethod === "cash" ? "bg-black text-white" : "bg-gray-100"}`}>
                                <Banknote size={20} />
                            </div>
                            <span className="font-black text-sm italic uppercase tracking-tighter">
                                {language === 'uz' ? 'Naqd pul yoki karta (Olganda)' : 'Наличными или картой (При получении)'}
                            </span>
                        </div>
                        <input type="radio" checked={paymentMethod === "cash"} readOnly className="accent-black w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-14">
                        {language === 'uz' ? 'Mahsulotni qo\'lingizga olganda to\'lang' : 'Оплатите при получении товара'}
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-8 p-5 bg-red-50 border-2 border-red-100 rounded-[28px] flex items-center gap-4 text-red-600 text-[12px] font-black italic uppercase tracking-tight animate-in slide-in-from-top-2">
                    <AlertCircle size={24} strokeWidth={3} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="p-8 bg-gray-50 rounded-[40px] mb-8 border border-gray-100">
                <div className="flex justify-between items-center font-black italic tracking-tighter text-xl">
                    <span className="text-gray-400 uppercase tracking-widest text-[10px] not-italic">{t.common.total}:</span>
                    <span>{order?.total?.toLocaleString() || 0} so'm</span>
                </div>
            </div>

            <button
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-6 rounded-full font-black text-sm uppercase tracking-widest flex justify-center items-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-70 ${
                    paymentMethod === "click" ? "bg-[#00a1ff] text-white shadow-[#00a1ff]/30" : "bg-black text-white shadow-black/20"
                }`}
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <span>
                            {paymentMethod === "click" 
                                ? (language === 'uz' ? 'Click\'ga o\'tish' : 'Перейти в Click') 
                                : (language === 'uz' ? 'Buyurtmani rasmiylashtirish' : 'Оформить заказ')}
                        </span>
                        <CheckCircle size={22} strokeWidth={3} />
                    </>
                )}
            </button>

            <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em]">
                <Info size={14} />
                <span>{language === 'uz' ? 'Xavfsiz to\'lov tizimi' : 'Безопасная платежная система'}</span>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <PaymentContent />
        </Suspense>
    );
}
