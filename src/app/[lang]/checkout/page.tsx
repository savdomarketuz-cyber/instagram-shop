"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowLeft, Loader2, PackageX, MapPin, Globe, Tag, X, Wallet, Check } from "lucide-react";
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
    const [walletBalance, setWalletBalance] = useState(0);
    const [useWallet, setUseWallet] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Auth check — foydalanuvchi login qilmagan bo'lsa, darhol redirect
        if (!user) {
            router.push(`/${language}/login?redirect=/${language}/checkout`);
            return;
        }

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
                router.push(`/${language}`);
            }
        } else {
            if (cart.length > 0) {
                setDisplayProducts(cart);
            } else if (mounted) {
                router.push(`/${language}`);
            }
        }
    }, [cart, isSubmitting, mounted, user, language]);

    useEffect(() => {
        if (user?.phone) {
            fetchWalletBalance();
        }
    }, [user]);

    const fetchWalletBalance = async () => {
        try {
            const { data } = await supabase
                .from("user_wallets")
                .select("balance")
                .eq("user_phone", user?.phone)
                .single();
            if (data) setWalletBalance(data.balance);
        } catch (e) {
            console.error("Fetch wallet balance error:", e);
        }
    };

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
            const ids = displayProducts.map(item => item.id).filter(Boolean);
            if (ids.length === 0) return errors;

            // Bitta batch query — N+1 o'rniga
            const { data: products } = await supabase
                .from("products")
                .select("id, stock_details")
                .in("id", ids);

            if (!products) return errors;

            const stockMap = new Map(products.map(p => [p.id, p.stock_details || {}]));

            for (const item of displayProducts) {
                if (!item.id) continue;
                const stockDetails = stockMap.get(item.id) || {};
                const actualStock = Object.values(stockDetails).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0);

                if (item.quantity > actualStock) {
                    errors.push({
                        id: item.id,
                        name: item[`name_${language}`] || item.name,
                        available: actualStock as number
                    });
                }
            }
        } catch (e) {
            console.error("Stock check error:", e);
        }
        return errors;
    };

    const subtotal = displayProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const [promoCode, setPromoCode] = useState("");
    const [promoData, setPromoData] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const total = Math.max(0, subtotal - (promoData?.discount || 0));

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        try {
            const res = await fetch("/api/promo-codes/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: promoCode, totalAmount: subtotal })
            });
            const data = await res.json();
            if (data.success) {
                setPromoData(data);
                showToast(language === 'uz' ? "Promo kod qo'llanildi!" : "Промокод применен!", 'success');
            } else {
                showToast(data.error, 'error');
                setPromoData(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push(`/${language}/login`);
            return;
        }

        if (isSubmitting || isValidating) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('place_order', {
                p_user_phone: user.phone,
                p_items: displayProducts.map(item => ({
                    id: item.id,
                    name: item[`name_${language}`] || item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.imageUrl || item.image
                })),
                p_address: address,
                p_coords: coords,
                p_status: language === 'uz' ? "To'lov kutilmoqda" : "Ожидание оплаты",
                p_promo_code: promoData?.code || null,
                p_wallet_usage: useWallet ? Math.min(walletBalance, total) : 0
            });

            if (error) throw error;

            if (!data.success && data.errors) {
                setStockErrors(data.errors);
                showToast(language === 'uz' ? "Ayrim mahsulotlar qoldig'i yetarli emas" : "Недостаточное количество некоторых товаров", 'error');
                setIsSubmitting(false);
                return;
            }

            if (data.success && data.orderId) {
                // Do NOT call clearCart here because it triggers the useEffect that redirects to '/'
                router.push(`/${language}/payment?orderId=${data.orderId}`);
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
        <div className="p-4 md:p-6 bg-white min-h-screen pt-8 md:pt-12 pb-32">
            <div className="flex items-center gap-4 mb-8 md:mb-10">
                <button onClick={() => router.back()} className="p-3 bg-gray-50 rounded-2xl"><ArrowLeft size={20} /></button>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter sm:truncate">{t.common.checkout}</h1>
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
                        onClick={() => router.push(`/${language}/cart`)}
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
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-base font-bold focus:ring-2 focus:ring-black outline-none transition-all pr-12"
                        />
                        {coords && <Globe size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-green-500" />}
                    </div>
                </div>

                {/* Promo Code Input */}
                <div className="bg-gray-50 p-6 rounded-[32px] space-y-4 shadow-sm border border-gray-100/50">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                        <Tag size={12} className="text-purple-500" />
                        {language === 'uz' ? 'Promo kod bormi?' : 'Есть промокод?'}
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={promoCode}
                            onChange={e => setPromoCode(e.target.value.toUpperCase())}
                            placeholder={language === 'uz' ? "PROMOKODINGIZNI KIRITING" : "ВВЕДИТЕ ПРОМОКОД"}
                            disabled={!!promoData}
                            className="flex-1 bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-6 text-base font-black italic outline-none transition-all uppercase tracking-tighter disabled:opacity-50"
                        />
                        {promoData ? (
                            <button
                                type="button"
                                onClick={() => { setPromoData(null); setPromoCode(""); }}
                                className="px-6 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleApplyPromo}
                                disabled={isApplyingPromo || !promoCode.trim()}
                                className="px-8 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                            >
                                {isApplyingPromo ? <Loader2 size={18} className="animate-spin" /> : (language === 'uz' ? 'QO\'LLASH' : 'ПРИМЕНИТЬ')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Wallet Balance Usage - NEW */}
                {walletBalance > 0 && !promoData && (
                    <div className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer ${useWallet ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`} 
                         onClick={() => setUseWallet(!useWallet)}>
                        <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${useWallet ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase italic tracking-tighter">Hamyondan to'lash</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        Mavjud: {walletBalance.toLocaleString()} so'm
                                    </p>
                                </div>
                             </div>
                             <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${useWallet ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                                {useWallet && <Check size={14} className="text-white" strokeWidth={4} />}
                             </div>
                        </div>
                        {useWallet && (
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pl-14 mt-2 animate-in slide-in-from-top-2">
                                - {Math.min(walletBalance, total).toLocaleString()} so'm kashbek ishlatiladi
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-8 md:mt-12 p-5 md:p-10 bg-black text-white rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between mb-4 opacity-60 text-[10px] font-black uppercase tracking-[0.2em] px-1">
                            <span>{language === 'uz' ? 'Mahsulotlar' : 'Товары'}</span>
                            <span className="font-mono">{subtotal.toLocaleString()} so'm</span>
                        </div>
                        {promoData && (
                            <div className="flex justify-between mb-4 text-[10px] font-black uppercase tracking-[0.2em] px-1 text-green-400">
                                <span className="flex items-center gap-2"><Tag size={12} /> {promoData.code}</span>
                                <span className="font-mono">-{promoData.discount.toLocaleString()} so'm</span>
                            </div>
                        )}
                        <div className="flex justify-between mb-8 opacity-60 text-[10px] font-black uppercase tracking-[0.2em] px-1">
                            <span>{t.common.delivery}</span>
                            <span className="text-green-400 font-black">{language === 'uz' ? 'Bepul' : 'Бесплатно'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end font-black pt-6 md:pt-8 border-t border-white/10 px-1 gap-2 md:gap-4 w-full">
                            <span className="uppercase text-[10px] md:text-sm not-italic opacity-40 tracking-[0.2em]">{t.common.total}</span>
                            <div className="leading-[1.1] text-left sm:text-right text-3xl md:text-4xl italic tracking-tighter flex flex-wrap items-baseline gap-1">
                                <span>{total.toLocaleString().replace(/\u00A0/g, ' ')}</span>
                                <span className="text-xl md:text-2xl not-italic opacity-80">so'm</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || displayProducts.length === 0 || stockErrors.length > 0 || isValidating}
                    className="w-full bg-[#2d6e3e] text-white py-6 rounded-full font-black text-xl shadow-2xl mt-8 active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-4"
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
