"use client";

import { useState, useEffect } from "react";
import { 
    ChevronLeft, 
    ChevronRight, 
    Wallet, 
    ShieldCheck, 
    RotateCcw, 
    History as HistoryIcon, 
    Loader2,
    Star,
    CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { useRouter } from "next/navigation";

export default function WalletClient() {
    const router = useRouter();
    const { user, language } = useStore();
    const t = translations[language];

    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Transfer States
    const [showTransfer, setShowTransfer] = useState(false);
    const [receiverPhone, setReceiverPhone] = useState("");
    const [amount, setAmount] = useState("");
    const [isGift, setIsGift] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [transferStep, setTransferStep] = useState(1); // 1: Input, 2: OTP
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");

    const fetchWalletData = async () => {
        if (!user) return;
        const myPhoneClean = user.phone.replace(/\D/g, '');
        
        // Fetch Balance
        const { data: wData } = await supabase.from("user_wallets").select("*").eq("phone", myPhoneClean).single();
        
        // Fetch Combined History (Cashback + Transfers)
        const { data: cData } = await supabase.from("cashback_transactions").select("*").eq("user_phone", user.phone);
        const { data: tData } = await supabase.from("wallet_transfers").select("*").or(`sender_phone.eq.${myPhoneClean},receiver_phone.eq.${myPhoneClean}`);

        const combined = [
            ...(cData || []).map(c => ({ ...c, type: 'cashback', date: c.created_at, val: c.amount })),
            ...(tData || []).map(t => ({ 
                ...t, 
                type: 'transfer', 
                date: t.created_at, 
                val: t.sender_phone === myPhoneClean ? -t.amount : t.amount,
                isOutgoing: t.sender_phone === myPhoneClean
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (wData) setWallet(wData);
        setTransactions(combined);

        const { data: pOrders } = await supabase.from("orders").select("id, potential_cashback").eq("user_phone", user.phone).neq("status", "Yetkazildi").gt("potential_cashback", 0);
        setPendingOrders(pOrders || []);
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchWalletData();
        else router.push("/login");
    }, [user]);

    const totalPending = pendingOrders.reduce((sum: number, o: any) => sum + Number(o.potential_cashback), 0);

    const handleTransferRequest = async () => {
        if (!receiverPhone || !amount || Number(amount) < 1000) {
            setError(language === 'uz' ? "Minimal o'tkazma: 1 000 so'm" : "Минимум: 1 000 сум");
            return;
        }
        setIsProcessing(true);
        setError("");
        try {
            const res = await fetch("/api/wallet/transfer/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senderPhone: user?.phone, receiverPhone, amount: Number(amount), isGift })
            });
            const data = await res.json();
            if (data.success) setTransferStep(2);
            else setError(data.message);
        } catch (e) { setError("Xatolik yuz berdi"); }
        setIsProcessing(false);
    };

    const handleTransferConfirm = async () => {
        if (!otpCode) return;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/wallet/transfer/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senderPhone: user?.phone, receiverPhone, amount: Number(amount), code: otpCode })
            });
            const data = await res.json();
            if (data.success) {
                setShowTransfer(false);
                setTransferStep(1);
                setIsGift(false);
                fetchWalletData();
            } else setError(data.message);
        } catch (e) { setError("Xatolik yuz berdi"); }
        setIsProcessing(false);
    };

    const GREEN = "#2D6E3E";
    const GREEN_DEEP = "#1F5A30";

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#FAFAF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 style={{ animation: "spin 1s linear infinite", color: GREEN }} size={32} />
        </div>
    );

    return (
        <div style={{ background: "#FAFAF6", minHeight: "100vh", paddingBottom: 100 }}>
            <div className="max-w-xl mx-auto" style={{ padding: "0 16px" }}>
                {/* Back button */}
                <div style={{ paddingTop: 20, marginBottom: 16 }}>
                    <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", cursor: "pointer" }}>
                        <ChevronLeft size={20} color="#0F1410" />
                    </button>
                </div>

                {/* Balance card — Velari green gradient */}
                <div style={{
                    background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)`,
                    color: "#fff", borderRadius: 28, padding: "22px 22px 26px",
                    boxShadow: "0 16px 40px rgba(45,110,62,0.28)", position: "relative", overflow: "hidden", marginBottom: 14,
                }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: -50, left: -20, width: 140, height: 140, borderRadius: 70, background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <div>
                                <p style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                                    {language === 'uz' ? "Cashback hamyoni" : "Кэшбэк кошелёк"}
                                </p>
                                <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8, margin: 0 }}>
                                    {(wallet?.balance || 0).toLocaleString()} <span style={{ fontSize: 16, opacity: 0.7 }}>{language === 'uz' ? "so'm" : "сум"}</span>
                                </h2>
                            </div>
                            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Wallet size={22} color="#fff" />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.12)" }}>
                                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{language === 'uz' ? "Kutilmoqda" : "Ожидается"}</div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>+{totalPending.toLocaleString()}</div>
                            </div>
                            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.12)" }}>
                                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{language === 'uz' ? "Foydalanuvchi" : "Пользователь"}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Mijoz"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transfer button */}
                <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 14 }}>
                    <button
                        onClick={() => setShowTransfer(true)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF3EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <RotateCcw size={18} color={GREEN} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F1410", letterSpacing: -0.2 }}>
                                {language === 'uz' ? "Hamyonlararo o'tkazma" : "Перевод между кошельками"}
                            </div>
                            <div style={{ fontSize: 11, color: "#9AA29C", marginTop: 2 }}>
                                {language === 'uz' ? "2FA Telegram orqali himoya" : "Защита через 2FA Telegram"}
                            </div>
                        </div>
                        <ChevronRight size={18} color="#C7CDC8" />
                    </button>
                </div>

                {/* Transaction history */}
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 10px" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9AA29C", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {language === 'uz' ? "Tranzaksiyalar" : "Транзакции"}
                        </p>
                        <HistoryIcon size={16} color="#9AA29C" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {transactions.length === 0 ? (
                            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 16px", textAlign: "center", color: "#9AA29C", fontSize: 14 }}>
                                {language === 'uz' ? "Hozircha tranzaksiyalar yo'q" : "Транзакций пока нет"}
                            </div>
                        ) : transactions.map((tx, i) => (
                            <div key={i} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 13, background: tx.val > 0 ? "#EAF3EC" : "#FFF0EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 16, color: tx.val > 0 ? GREEN : "#FF3B30" }}>
                                    {tx.val > 0 ? "+" : "−"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0F1410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {tx.type === 'cashback' ? (language === 'uz' ? "Keshbek to'plandi" : "Кэшбэк начислен") :
                                         tx.type?.includes('gift') ? `🎁 ${tx.isOutgoing ? tx.receiver_phone : tx.sender_phone}` :
                                         (tx.isOutgoing ? `→ ${tx.receiver_phone}` : `← ${tx.sender_phone}`)}
                                    </p>
                                    <p style={{ fontSize: 11, color: "#9AA29C", marginTop: 2 }}>{new Date(tx.date).toLocaleDateString()}</p>
                                </div>
                                <p style={{ flexShrink: 0, fontWeight: 700, fontSize: 15, color: tx.val > 0 ? GREEN : "#FF3B30", letterSpacing: -0.3 }}>
                                    {tx.val > 0 ? "+" : "−"}{Math.abs(tx.val).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            {showTransfer && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,16,0.6)", backdropFilter: "blur(20px)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 20px" }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: "32px 32px 28px 28px", padding: "24px 24px 32px", boxShadow: "0 -8px 40px rgba(15,20,16,0.12)", position: "relative" }}>
                        <button onClick={() => { setShowTransfer(false); setTransferStep(1); }} style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: 18, background: "#F5F5F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            ✕
                        </button>
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 18, background: "#EAF3EC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                                <ShieldCheck size={26} color={GREEN} />
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F1410", letterSpacing: -0.4 }}>
                                {transferStep === 1 ? (language === 'uz' ? "O'tkazma" : "Перевод") : (language === 'uz' ? "2FA Tasdiqlash" : "2FA Подтверждение")}
                            </h2>
                        </div>

                        {error && <div style={{ background: "#FFF0EE", color: "#FF3B30", padding: "12px 16px", borderRadius: 14, fontSize: 13, marginBottom: 16 }}>{error}</div>}

                        {transferStep === 1 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <input type="tel" placeholder={language === 'uz' ? "Qabul qiluvchi tel..." : "Телефон получателя..."} value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} style={{ width: "100%", background: "#F5F5F0", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#0F1410", outline: "none", boxSizing: "border-box" }} />
                                <input type="number" placeholder={language === 'uz' ? "Summa (so'm)..." : "Сумма (сум)..."} value={amount} onChange={e => setAmount(e.target.value)} style={{ width: "100%", background: "#F5F5F0", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#0F1410", outline: "none", boxSizing: "border-box" }} />
                                <button onClick={() => setIsGift(!isGift)} style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: isGift ? "1.5px solid #F59E0B" : "1.5px solid rgba(15,20,16,0.06)", background: isGift ? "#FFFBEB" : "#fff", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: isGift ? "#F59E0B" : "#F5F5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Star size={16} fill={isGift ? "#fff" : "none"} color={isGift ? "#fff" : "#9AA29C"} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: isGift ? "#B45309" : "#9AA29C" }}>🎁 {language === 'uz' ? "Sovg'a sifatida yuborish" : "Отправить как подарок"}</span>
                                </button>
                                <button onClick={handleTransferRequest} disabled={isProcessing} style={{ width: "100%", padding: "16px", borderRadius: 18, border: "none", background: `linear-gradient(135deg, ${GREEN} 0%, #1F5A30 100%)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 20px rgba(45,110,62,0.28)", opacity: isProcessing ? 0.5 : 1 }}>
                                    {isProcessing ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : (language === 'uz' ? "Davom etish" : "Продолжить")}
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
                                <input type="text" maxLength={6} placeholder="000000" value={otpCode} onChange={e => setOtpCode(e.target.value)} style={{ background: "#F5F5F0", border: "none", borderRadius: 16, padding: "20px 16px", fontSize: 32, fontWeight: 700, textAlign: "center", letterSpacing: "0.5em", outline: "none", width: "100%", boxSizing: "border-box", color: "#0F1410" }} />
                                <button onClick={handleTransferConfirm} disabled={isProcessing || otpCode.length < 6} style={{ width: "100%", padding: "16px", borderRadius: 18, border: "none", background: `linear-gradient(135deg, ${GREEN} 0%, #1F5A30 100%)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (isProcessing || otpCode.length < 6) ? 0.5 : 1 }}>
                                    {isProcessing ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={18} />}
                                    {language === 'uz' ? "Tasdiqlash" : "Подтвердить"}
                                </button>
                                <p style={{ fontSize: 12, color: "#9AA29C" }}>{language === 'uz' ? "Kodni Telegram botimizdan oldingiz" : "Код получен в Telegram боте"}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
