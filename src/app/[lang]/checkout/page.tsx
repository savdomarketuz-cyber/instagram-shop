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
                showToast(t.common.promoApplied, 'success');
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
            // Using secure API instead of direct RPC
            const response = await fetch(`/api/orders/place`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                    p_status: t.common.statusPendingPayment,
                    p_promo_code: promoData?.code || null,
                    p_wallet_usage: useWallet ? Math.min(walletBalance, total) : 0,
                    p_referral_data: (() => {
                        const cookieStr = document.cookie.split('; ').find(row => row.startsWith('affiliate_data='));
                        if (cookieStr) {
                            try { return JSON.parse(decodeURIComponent(cookieStr.split('=')[1])); } catch(e) { return null; }
                        }
                        return null;
                    })()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Xatolik yuz berdi");
            }

            if (!data.success && data.errors) {
                setStockErrors(data.errors);
                showToast(t.common.notEnoughStock, 'error');
                setIsSubmitting(false);
                return;
            }

            if (data.success && data.orderId) {
                // Do NOT call clearCart here because it triggers the useEffect that redirects to '/'
                router.push(`/${language}/payment?orderId=${data.orderId}`);
            }

        } catch (error: any) {
            console.error("Order submit error:", error);
            showToast(t.common.error + ": " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="p-4 md:p-6 min-h-screen pt-8 md:pt-12 pb-32" style={{ background: "#FAFAF6" }}>
            <div className="flex items-center gap-4 mb-8 md:mb-10">
                <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", cursor: "pointer", flexShrink: 0 }}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter sm:truncate">{t.common.checkout}</h1>
            </div>

            {stockErrors.length > 0 && (
                <div className="mb-8 p-6 bg-red-50 rounded-[32px] border border-red-100 animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle size={24} strokeWidth={3} />
                        <h3 className="font-black uppercase text-xs tracking-widest">
                            DIQQAT: {t.common.notEnoughStock.toUpperCase()}
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {stockErrors.map(err => (
                            <div key={err.id} className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-red-50">
                                <span className="text-xs font-bold text-gray-600">{err.name}</span>
                                <span className="text-xs font-black text-red-500 uppercase tracking-tighter">
                                    {t.common.onlyLeft.replace('{count}', err.available.toString())}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => router.push(`/${language}/cart`)}
                        className="w-full mt-6 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200"
                    >
                        {t.common.editCart}
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Phone info card */}
                <div style={{ background: "#fff", borderRadius: 22, padding: "16px 18px", boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
                        {t.account.myInfo}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#9AA29C" }}>{t.account.phone}:</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#0F1410" }}>{user?.phone || "+998 ..."}</span>
                    </div>
                </div>

                {/* Address */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.4, textTransform: "uppercase" }}>{t.common.address}</label>
                        <button
                            type="button"
                            onClick={() => setIsMapOpen(true)}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#2D6E3E", background: "#EAF3EC", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}
                        >
                            <MapPin size={12} />
                            {t.common.selectOnMap}
                        </button>
                    </div>
                    <div style={{ position: "relative" }}>
                        <input
                            required
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder={t.common.addressPlaceholder}
                            style={{ width: "100%", background: "#fff", border: "none", borderRadius: 18, padding: "14px 48px 14px 18px", fontSize: 14, fontWeight: 600, color: "#0F1410", outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}
                        />
                        {coords && <Globe size={16} color="#2D6E3E" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }} />}
                    </div>
                </div>

                {/* Promo Code */}
                <div style={{ background: "#fff", borderRadius: 22, padding: "16px 18px", boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.4, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <Tag size={12} color="#9AA29C" />
                        {t.common.promoQuestion}
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            type="text"
                            value={promoCode}
                            onChange={e => setPromoCode(e.target.value.toUpperCase())}
                            placeholder={t.common.promoPlaceholder}
                            disabled={!!promoData}
                            style={{ flex: 1, background: "#F5F5F0", border: promoData ? "1.5px solid #2D6E3E" : "1.5px solid transparent", borderRadius: 14, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#0F1410", outline: "none", letterSpacing: 0.5, opacity: promoData ? 0.8 : 1 }}
                        />
                        {promoData ? (
                            <button type="button" onClick={() => { setPromoData(null); setPromoCode(""); }}
                                style={{ padding: "12px 16px", background: "#FFF0EE", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                <X size={18} color="#FF3B30" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleApplyPromo} disabled={isApplyingPromo || !promoCode.trim()}
                                style={{ padding: "12px 20px", background: "#0F1410", color: "#fff", border: "none", borderRadius: 14, fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: (!promoCode.trim() || isApplyingPromo) ? 0.3 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                                {isApplyingPromo ? <Loader2 size={16} className="animate-spin" /> : t.common.apply}
                            </button>
                        )}
                    </div>
                    {promoData && (
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#2D6E3E" }}>
                            ✓ -{promoData.discount.toLocaleString()} so'm chegirma qo'llandi
                        </div>
                    )}
                </div>

                {/* Wallet */}
                {walletBalance > 0 && !promoData && (
                    <div onClick={() => setUseWallet(!useWallet)}
                        style={{ background: useWallet ? "#EAF3EC" : "#fff", border: useWallet ? "1.5px solid #2D6E3E" : "1.5px solid rgba(15,20,16,0.06)", borderRadius: 22, padding: "16px 18px", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,20,16,0.04)", transition: "all 200ms ease" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 13, background: useWallet ? "#2D6E3E" : "#F0F0EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Wallet size={18} color={useWallet ? "#fff" : "#9AA29C"} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: "#0F1410", marginBottom: 2 }}>{t.common.payFromWallet}</p>
                                    <p style={{ fontSize: 11, fontWeight: 500, color: "#9AA29C" }}>
                                        {t.common.availableBalance.replace("{balance}", walletBalance.toLocaleString())}
                                    </p>
                                </div>
                            </div>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", border: useWallet ? "none" : "2px solid #D0D5CF", background: useWallet ? "#2D6E3E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {useWallet && <Check size={13} color="#fff" strokeWidth={3} />}
                            </div>
                        </div>
                        {useWallet && (
                            <p style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#2D6E3E", paddingLeft: 52 }}>
                                {t.common.walletUsageHint.replace("{amount}", Math.min(walletBalance, total).toLocaleString())}
                            </p>
                        )}
                    </div>
                )}

                {/* Summary card \u2014 Velari green */}
                <div style={{ marginTop: 24, padding: "20px 20px", background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)", color: "#fff", borderRadius: 24, boxShadow: "0 16px 40px rgba(45,110,62,0.28)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, opacity: 0.8 }}>
                            <span>{t.common.products}</span>
                            <span>{subtotal.toLocaleString()} {language === "ru" ? "\u0441\u0443\u043C" : "so'm"}</span>
                        </div>
                        {promoData && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, color: "#A3F0B8" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Tag size={12} /> {promoData.code}</span>
                                <span>-{promoData.discount.toLocaleString()} {language === "ru" ? "\u0441\u0443\u043C" : "so'm"}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 12, opacity: 0.8 }}>
                            <span>{t.common.delivery}</span>
                            <span style={{ color: "#A3F0B8", fontWeight: 700 }}>{t.cart.free}</span>
                        </div>
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.common.total}</span>
                            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
                                {total.toLocaleString()} <span style={{ fontSize: 16, opacity: 0.8 }}>{language === "ru" ? "\u0441\u0443\u043C" : "so'm"}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || displayProducts.length === 0 || stockErrors.length > 0 || isValidating}
                    style={{
                        width: "100%", padding: "17px 0", borderRadius: 18, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)",
                        color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: "0 8px 20px rgba(45,110,62,0.28)", marginTop: 12,
                        opacity: (isSubmitting || displayProducts.length === 0 || stockErrors.length > 0 || isValidating) ? 0.4 : 1,
                    }}
                >
                    {isValidating ? <Loader2 className="animate-spin" size={20} /> : (isSubmitting ? <><Loader2 className="animate-spin" size={20} /> {t.common.sending}</> : t.common.goToPayment)}
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
