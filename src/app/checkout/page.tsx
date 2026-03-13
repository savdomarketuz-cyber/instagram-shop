"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { db, collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment, setDoc, runTransaction } from "@/lib/firebase";
import { AlertCircle, ArrowLeft, Loader2, PackageX, MapPin, Globe } from "lucide-react";
import dynamic from "next/dynamic";
const YandexMapPicker = dynamic(() => import("@/components/YandexMapPicker"), {
    loading: () => <div className="h-64 animate-pulse bg-gray-50 rounded-3xl" />,
    ssr: false,
});
import { translations } from "@/lib/translations";

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, user, clearCart, language, showToast } = useStore();
    const [displayProducts, setDisplayProducts] = useState<any[]>([]);
    const [isFastBuy, setIsFastBuy] = useState(false);
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
        if (isSubmitting) return;

        const searchParams = new URLSearchParams(window.location.search);
        const fast = searchParams.get('fast') === 'true';
        
        if (fast) {
            const fastItem = sessionStorage.getItem('fast_buy_item');
            if (fastItem) {
                const item = JSON.parse(fastItem);
                setDisplayProducts([item]);
                setIsFastBuy(true);
            } else {
                router.push('/');
            }
        } else {
            if (cart.length > 0) {
                setDisplayProducts(cart);
            } else if (mounted) {
                router.push('/');
            }
        }
    }, [cart, isSubmitting, mounted]);

    useEffect(() => {
        if (displayProducts.length > 0) {
            performStockCheck();
        }
    }, [displayProducts]);

    const performStockCheck = async () => {
        setIsValidating(true);
        try {
            const errors = await getStockErrors();
            setStockErrors(errors);
        } finally {
            setIsValidating(false);
        }
    };

    const getStockErrors = async () => {
        const errors: { id: string, name: string, available: number }[] = [];
        try {
            for (const item of displayProducts) {
                if (!item.id) continue;
                const productRef = doc(db, "products", item.id);
                const snap = await getDoc(productRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const stockDetails = data.stockDetails || {};
                    const actualStock = Object.values(stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                    if (item.quantity > actualStock) {
                        errors.push({ 
                            id: item.id, 
                            name: item[`name_${language}`] || item.name, 
                            available: actualStock as number 
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Stock check error:", e);
        }
        return errors;
    };

    const total = displayProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push("/login");
            return;
        }

        if (isSubmitting || isValidating) return;

        setIsSubmitting(true);
        try {
            // Atomic Order Submission via Transaction
            const result = await runTransaction(db, async (transaction) => {
                const currentStockErrors: { id: string, name: string, available: number }[] = [];
                const updates: { ref: any, data: any }[] = [];

                for (const item of displayProducts) {
                    const productRef = doc(db, "products", item.id);
                    const productSnap = await transaction.get(productRef);
                    
                    if (!productSnap.exists()) {
                        throw new Error(language === 'uz' ? `Mahsulot topilmadi: ${item.id}` : `Товар не найден: ${item.id}`);
                    }

                    const data = productSnap.data();
                    const stockDetails = data.stockDetails || {};
                    const actualStock = Object.values(stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                    if (item.quantity > actualStock) {
                        currentStockErrors.push({ 
                            id: item.id, 
                            name: item[`name_${language}`] || item.name, 
                            available: actualStock as number 
                        });
                    } else {
                        // Stockni kamaytirish (OMBORLAR BO'YICHA)
                        const newStockDetails = { ...stockDetails };
                        let remaining = item.quantity;
                        
                        // Birinchi mos ombordan ayiramiz (yoki tarqatamiz)
                        for (const whId in newStockDetails) {
                            const whStock = Number(newStockDetails[whId]) || 0;
                            if (whStock >= remaining) {
                                newStockDetails[whId] = whStock - remaining;
                                remaining = 0;
                                break;
                            } else {
                                remaining -= whStock;
                                newStockDetails[whId] = 0;
                            }
                        }

                        updates.push({
                            ref: productRef,
                            data: {
                                stockDetails: newStockDetails,
                                sales: increment(item.quantity)
                            }
                        });
                    }
                }

                if (currentStockErrors.length > 0) {
                    return { success: false, errors: currentStockErrors };
                }

                // Hamma update-larni amalga oshiramiz
                for (const update of updates) {
                    transaction.update(update.ref, update.data);
                }

                // Buyurtmani yaratamiz
                const orderId = Math.floor(100000 + Math.random() * 900000).toString() + Date.now().toString().slice(-4);
                const orderRef = doc(db, "orders", orderId);
                
                transaction.set(orderRef, {
                    userPhone: user.phone,
                    items: displayProducts.map(item => ({
                        id: item.id,
                        name: item[`name_${language}`] || item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.imageUrl || item.image
                    })),
                    total: total,
                    address: address,
                    coords: coords,
                    status: language === 'uz' ? "To'lov kutilmoqda" : "Ожидание оплаты",
                    createdAt: serverTimestamp(),
                });

                return { success: true, orderId };
            });

            if (!result.success && result.errors) {
                setStockErrors(result.errors);
                showToast(language === 'uz' ? "Ayrim mahsulotlar qoldig'i yetarli emas" : "Недостаточное количество некоторых товаров", 'error');
                setIsSubmitting(false);
                return;
            }

            if (result.success && result.orderId) {
                router.push(`/payment?orderId=${result.orderId}`);
            }

        } catch (error: any) {
            console.error("Order submit error:", error);
            showToast(language === 'uz' ? "Xatolik yuz berdi: " + error.message : "Произошла ошибка: " + error.message, 'error');
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

                <div className="mt-12 p-10 bg-black text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between mb-4 opacity-60 text-[10px] font-black uppercase tracking-[0.2em] px-1">
                            <span>{t.cart.items}</span>
                            <span>{total.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between mb-8 opacity-60 text-[10px] font-black uppercase tracking-[0.2em] px-1">
                            <span>{t.common.delivery}</span>
                            <span className="text-green-400 font-black">{language === 'uz' ? 'Bepul' : 'Бесплатно'}</span>
                        </div>
                        <div className="flex justify-between font-black text-3xl italic tracking-tighter pt-8 border-t border-white/10 px-1">
                            <span className="uppercase text-sm not-italic opacity-40">{t.common.total}</span>
                            <span>{total.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || displayProducts.length === 0 || stockErrors.length > 0 || isValidating}
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
