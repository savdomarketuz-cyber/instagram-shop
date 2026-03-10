"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { CheckCircle, QrCode, Banknote, Clock, Info, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { db, doc, getDoc, updateDoc, increment, collection } from "@/lib/firebase";
import { translations } from "@/lib/translations";

function PaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { cart, clearCart, language } = useStore();
    const t = translations[language];
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"qr" | "cash">("qr");
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePayment = async () => {
        if (!orderId) {
            setError(language === 'uz' ? "Buyurtma topilmadi. Iltimos qaytadan urinib ko'ring." : "Заказ не найден. Пожалуйста, попробуйте еще раз.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // 1. Double check stock for ALL items before final confirmation
            for (const item of cart) {
                const productRef = doc(db, "products", item.id);
                const pSnap = await getDoc(productRef);
                if (!pSnap.exists()) {
                    const errorMsg = language === 'uz' ? `${item.name} bazadan topilmadi.` : `${item.name} не найден в базе.`;
                    throw new Error(errorMsg);
                }
                const data = pSnap.data();
                const stockDetails = data.stockDetails || {};
                const actualStock = Object.values(stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                if (actualStock < item.quantity) {
                    const errorMsg = language === 'uz'
                        ? `${item.name} qoldig'i yetarli emas (Faqat ${actualStock} ta qolgan).`
                        : `${item.name} недостаточно на складе (Осталось всего ${actualStock} шт.).`;
                    throw new Error(errorMsg);
                }
            }

            // 2. Decrement stock and update status
            const updates = cart.map(async (item) => {
                const productRef = doc(db, "products", item.id);
                const pSnap = await getDoc(productRef);
                const pData = pSnap.data() || {};

                // Update stockDetails (warehouse-specific stock)
                const stockDetails = { ...(pData.stockDetails || {}) };
                let remainingToDeduct = item.quantity;

                // Pick warehouses to deduct from (pick first ones that have stock)
                for (const wId in stockDetails) {
                    if (remainingToDeduct <= 0) break;
                    const available = stockDetails[wId] || 0;
                    if (available > 0) {
                        const amountToTake = Math.min(available, remainingToDeduct);
                        stockDetails[wId] -= amountToTake;
                        remainingToDeduct -= amountToTake;
                    }
                }

                // If still remaining (though shouldn't happen due to total stock check), take from first warehouse
                if (remainingToDeduct > 0) {
                    const firstW = Object.keys(stockDetails)[0];
                    if (firstW) stockDetails[firstW] -= remainingToDeduct;
                }

                return updateDoc(productRef, {
                    stock: increment(-item.quantity),
                    sales: increment(item.quantity),
                    stockDetails: stockDetails
                });
            });

            await Promise.all(updates);

            // 3. Update order status
            let finalStatus = "";
            if (paymentMethod === 'qr') {
                finalStatus = language === 'uz' ? "To'lov tekshirilmoqda" : "Проверка оплаты";
            } else {
                finalStatus = language === 'uz' ? "Qabul qilindi" : "Принят";
            }

            await updateDoc(doc(db, "orders", orderId), {
                status: finalStatus,
                paymentMethod: paymentMethod
            });

            clearCart();
            router.push("/order-success");
        } catch (err: any) {
            console.error("Payment finalization error:", err);
            const defaultError = language === 'uz' ? "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring." : "Произошла ошибка. Пожалуйста, попробуйте еще раз.";
            setError(err.message || defaultError);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen pt-12 pb-24">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-8">
                {language === 'uz' ? 'To\'lov usuli' : 'Способ оплаты'}
            </h1>

            <div className="space-y-4 mb-8">
                {/* Paynet QR Option */}
                <div
                    onClick={() => setPaymentMethod("qr")}
                    className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all ${paymentMethod === "qr" ? "border-black bg-gray-50 shadow-xl shadow-black/5" : "border-gray-100"
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${paymentMethod === "qr" ? "bg-black text-white" : "bg-gray-100"}`}>
                                <QrCode size={20} />
                            </div>
                            <span className="font-black text-sm italic uppercase tracking-tighter">
                                {language === 'uz' ? 'Paynet QR orqali (Oldindan)' : 'Через Paynet QR (Предоплата)'}
                            </span>
                        </div>
                        <input type="radio" checked={paymentMethod === "qr"} readOnly className="accent-black w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-14">
                        {language === 'uz' ? 'Click, Payme, Paynet orqali skaner qiling' : 'Сканируйте через Click, Payme, Paynet'}
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

            {/* QR Content */}
            {paymentMethod === "qr" && (
                <div className="mb-8 p-8 bg-black text-white rounded-[40px] shadow-2xl relative overflow-hidden text-center">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center justify-center gap-3">
                        <QrCode size={16} /> {language === 'uz' ? 'QR-kodni skanerlang' : 'Сканируйте QR-код'}
                    </h3>
                    <div className="bg-white p-6 rounded-[32px] inline-block shadow-2xl mb-6 scale-90 md:scale-100">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent("00020101021140440012qr-online.uz01186qzrsRa1VsqN5t22Bd0202115204531153038605802UZ5910AO\"PAYNET\"6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz63049C69")}`}
                            alt="Paynet QR"
                            className="w-56 h-56"
                        />
                    </div>
                    <div className="flex items-start gap-3 text-left text-[10px] font-bold text-white/50 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <Clock size={16} className="flex-shrink-0 mt-0.5" />
                        <p>
                            {language === 'uz'
                                ? 'To\'lovlar 1 ish soati ichida administrator tomonidan tasdiqlanadi.'
                                : 'Платежи подтверждаются администратором в течение 1 рабочего часа.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-8 p-5 bg-red-50 border-2 border-red-100 rounded-[28px] flex items-center gap-4 text-red-600 text-[12px] font-black italic uppercase tracking-tight animate-in slide-in-from-top-2">
                    <AlertCircle size={24} strokeWidth={3} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {/* Order Summary */}
            <div className="p-8 bg-gray-50 rounded-[40px] mb-8 border border-gray-100">
                <div className="flex justify-between items-center font-black italic tracking-tighter text-xl">
                    <span className="text-gray-400 uppercase tracking-widest text-[10px] not-italic">{t.common.total}:</span>
                    <span>{total.toLocaleString()} $</span>
                </div>
            </div>

            <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-black text-white py-6 rounded-full font-black text-sm uppercase tracking-widest flex justify-center items-center gap-3 shadow-2xl shadow-black/20 active:scale-95 transition-all disabled:opacity-70"
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <span>{language === 'uz' ? 'Buyurtmani rasmiylashtirish' : 'Оформить заказ'}</span>
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
