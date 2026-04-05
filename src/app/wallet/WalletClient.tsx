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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F3F5]">
            <Loader2 className="animate-spin text-black" size={32} />
        </div>
    );

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
            <div className="max-w-xl mx-auto pt-10">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8 hover:text-black transition-all">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>

                {/* Bank Card */}
                <div className="bg-black text-white p-8 md:p-10 rounded-[50px] shadow-2xl relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1 italic">Tizim hamyoni</p>
                                <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter">{(wallet?.balance || 0).toLocaleString()} <span className="text-lg opacity-40">SO'M</span></h2>
                            </div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/10">
                                <Wallet size={24} />
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-1 italic">Kutilmoqda</p>
                                <p className="font-bold text-sm text-green-400">+{totalPending.toLocaleString()} som</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-1 italic">Foydalanuvchi</p>
                                <p className="font-bold text-sm uppercase">{user?.name || "Mijoz"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* P2P Transfer Button */}
                <button 
                    onClick={() => setShowTransfer(true)}
                    className="w-full bg-white p-6 rounded-[32px] border-2 border-transparent hover:border-black shadow-sm mb-10 flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                            <RotateCcw className="rotate-90" size={20} />
                        </div>
                        <div>
                            <h3 className="font-black italic uppercase text-sm tracking-tighter">Hamyonlararo o'tkazma</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bank darajasidagi xavfsizlik (2FA Telegram)</p>
                        </div>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-black transition-all" />
                </button>

                {/* Audit Trail */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Tranzaksiyalar auditi</p>
                        <HistoryIcon size={16} className="text-gray-300" />
                    </div>
                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="bg-white p-12 rounded-[40px] text-center italic font-bold text-gray-300">Hozircha tranzaksiyalar yo'q...</div>
                        ) : transactions.map((t, i) => (
                            <div key={i} className="bg-white p-5 rounded-[28px] border border-gray-100 flex items-center justify-between group shadow-sm transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${t.val > 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                        {t.val > 0 ? '+' : '-'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black italic uppercase text-[12px] tracking-tight truncate">
                                            {t.type === 'cashback' ? "Keshbek to'plandi" : 
                                             t.type.includes('gift') ? `🎁 Sovg'a: ${t.isOutgoing ? t.receiver_phone : t.sender_phone}` :
                                             (t.isOutgoing ? `To: ${t.receiver_phone}` : `From: ${t.sender_phone}`)}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`shrink-0 font-black italic text-sm tracking-tighter ${t.val > 0 ? (t.type.includes('gift') ? 'text-amber-500' : 'text-green-500') : 'text-red-500'}`}>
                                    {Math.abs(t.val).toLocaleString()} <span className="text-[9px] opacity-40 italic">som</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[50px] p-8 shadow-2xl relative">
                        <button onClick={() => { setShowTransfer(false); setTransferStep(1); }} className="absolute top-6 right-6 text-gray-300 hover:text-black transition-all rotate-45"><RotateCcw size={24} /></button>
                        
                        <div className="text-center mb-10 pt-4">
                            <div className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/20">
                                <ShieldCheck size={28} />
                            </div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase">{transferStep === 1 ? "O'tkazma" : "2FA Tasdiqlash"}</h2>
                        </div>

                        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-[10px] font-black uppercase text-center mb-6 tracking-widest">{error}</div>}

                        {transferStep === 1 ? (
                            <div className="space-y-4">
                                <input type="tel" placeholder="Qabul qiluvchi tel..." value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 text-sm font-bold outline-none" />
                                <input type="number" placeholder="Summa..." value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 text-sm font-bold outline-none" />
                                
                                <button 
                                    onClick={() => setIsGift(!isGift)}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${isGift ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isGift ? 'bg-amber-400 text-white' : 'bg-gray-100'}`}>
                                            <Star size={16} fill={isGift ? "currentColor" : "none"} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">🎁 Sovg'a sifatida yuborish</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-all ${isGift ? 'bg-amber-400' : 'bg-gray-200'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGift ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </button>

                                <button onClick={handleTransferRequest} disabled={isProcessing} className={`w-full ${isGift ? 'bg-amber-500' : 'bg-black'} text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl ${isGift ? 'shadow-amber-500/20' : 'shadow-black/20'}`}>
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />} DAVOM ETISH
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <input type="text" maxLength={6} placeholder="000000" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 text-2xl font-black tracking-[0.5em] text-center outline-none" />
                                <button onClick={handleTransferConfirm} disabled={isProcessing || otpCode.length < 6} className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} TASDIQLASH
                                </button>
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">Kodni botimizdan oldingiz</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
