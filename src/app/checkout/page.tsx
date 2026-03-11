"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { db, collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment, setDoc } from "@/lib/firebase";
import { AlertCircle, ArrowLeft, Loader2, PackageX, MapPin, Globe } from "lucide-react";
import YandexMapPicker from "@/components/YandexMapPicker";
import { translations } from "@/lib/translations";

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, user, clearCart, language } = useStore();
    const t = translations[language];
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [stockErrors, setStockErrors] = useState<{ id: string, name: string, available: number }[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [address, setAddress] = useState("");
    const [coords, setCoords] = useState<[number, number] | null>(null);

    useEffect(() => {
        setMounted(true);
        validateStock();
    }, []);

    const validateStock = async () => {
        setIsValidating(true);
        const errors: { id: string, name: string, available: number }[] = [];

        try {
            for (const item of cart) {
                const productRef = doc(db, "products", item.id);
                const snap = await getDoc(productRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const stockDetails = data.stockDetails || {};
                    const actualStock = Object.values(stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                    if (item.quantity > actualStock) {
                        errors.push({ id: item.id, name: item[`name_${language}`] || item.name, available: actualStock as number });
                    }
                }
            }
            setStockErrors(errors);
        } catch (e) {
            console.error("Stock validation error:", e);
        } finally {
            setIsValidating(false);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push("/login");
            return;
        }

        setIsSubmitting(true);
        try {
            // Final stock check before processing
            await validateStock();
            if (stockErrors.length > 0) {
                setIsSubmitting(false);
                return;
            }

            // 2. Save order to Firebase
            const orderId = Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000).toString();

            await setDoc(doc(db, "orders", orderId), {
                userPhone: user.phone,
                items: cart.map(item => ({
                    id: item.id,
                    name: item[`name_${language}`] || item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.imageUrl
                })),
                total: total,
                address: address,
                coords: coords,
                status: language === 'uz' ? "To'lov kutilmoqda" : "Ожидание оплаты",
                createdAt: serverTimestamp(),
            });

            router.push(`/payment?orderId=${orderId}`);
        } catch (error) {
            console.error("Order error:", error);
            alert(language === 'uz' ? "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring." : "Произошла ошибка. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="p-6 bg-white min-h-screen pt-12 pb-32">
            <div className="flex items-center gap-4 mb-10">
                <button onClick={() => router.back()} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={20} /></button>
                <h1 className="text-3xl font-black tracking-tighter">{t.common.checkout}</h1>
            </div>

            {stockErrors.length > 0 && (
                <div className="mb-8 p-6 bg-red-50 rounded-[32px] border border-red-100 animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle size={24} strokeWidth={3} />
                        <h3 className="font-black uppercase text-xs tracking-widest">
                            {language === 'uz' ? 'DIQQAT: QOLDIQ YETARLI EMAS' : 'ВНИМАНИЕ: ОСТАТОК НЕДОСТАТОЧЕН'}
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {stockErrors.map(err => (
                            <div key={err.id} className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-red-50">
                                <span className="text-xs font-bold text-gray-600">{err.name}</span>
                                <span className="text-xs font-black text-red-500 uppercase tracking-tighter">
                                    {language === 'uz' ? `Faqat ${err.available} ta qolgan` : `Осталось только ${err.available} шт`}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => router.push('/cart')}
                        className="w-full mt-6 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200"
                    >
                        {language === 'uz' ? 'Savatni tahrirlash' : 'Редактировать корзину'}
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-[32px] space-y-4 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {language === 'uz' ? 'Ma\'lumotlar' : 'Данные'}
                    </p>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500">{t.account.phone}:</span>
                        <span className="text-sm font-black">{user?.phone || "+998 ..."}</span>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.common.address}</label>
                        <button
                            type="button"
                            onClick={() => setIsMapOpen(true)}
                            className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                            <MapPin size={12} />
                            {language === 'uz' ? 'Kartadan tanlash' : 'Выбрать на карте'}
                        </button>
                    </div>
                    <div className="relative group">
                        <input
                            required
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder={language === 'uz' ? "Toshkent sh., Yunusobod tumani..." : "г. Ташкент, Юнусабадский район..."}
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all pr-12"
                        />
                        {coords && <Globe size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-green-500" />}
                    </div>
                </div>

                <div className="mt-12 p-8 bg-black text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between mb-3 opacity-60 text-xs font-bold uppercase tracking-widest">
                            <span>{t.cart.items}</span>
                            <span>{total.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between mb-6 opacity-60 text-xs font-bold uppercase tracking-widest">
                            <span>{t.common.delivery}</span>
                            <span className="text-green-400">{language === 'uz' ? 'Bepul' : 'Бесплатно'}</span>
                        </div>
                        <div className="flex justify-between font-black text-2xl pt-6 border-t border-white/10">
                            <span>{t.common.total}</span>
                            <span>{total.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0 || stockErrors.length > 0 || isValidating}
                    className="w-full bg-black text-white py-6 rounded-full font-black text-xl shadow-2xl mt-8 active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-4"
                >
                    {isValidating ? <Loader2 className="animate-spin" size={24} /> : (isSubmitting ? (language === 'uz' ? "Yuborilmoqda..." : "Отправка...") : (language === 'uz' ? "To'lovga o'tish" : "Перейти к оплате"))}
                </button>
            </form>

            <YandexMapPicker
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={(addr, c) => {
                    setAddress(addr);
                    setCoords(c);
                }}
            />
        </div>
    );
}
