"use client";

import { useState, useEffect } from "react";
import { 
    Wallet, 
    Search, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Plus, 
    Minus, 
    History, 
    User,
    ChevronRight,
    X,
    Loader2,
    CheckCircle2,
    DollarSign,
    RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminWalletsPage() {
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Adjustment Modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [adjustment, setAdjustment] = useState({ amount: "", description: "", type: "earned" });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: wData },
                { data: tData }
            ] = await Promise.all([
                supabase.from("user_wallets").select("*").order("balance", { ascending: false }),
                supabase.from("cashback_transactions").select("*").order("created_at", { ascending: false }).limit(50)
            ]);

            if (wData) setWallets(wData);
            if (tData) setTransactions(tData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWallet || !adjustment.amount) return;

        const amount = Number(adjustment.amount);
        const finalAmount = amount; // Negative is handled by the description/logic

        try {
            const { data, error } = await supabase.rpc('adjust_wallet_balance', {
                p_user_phone: selectedWallet.user_phone,
                p_amount: finalAmount,
                p_description: adjustment.description || "Admin tomonidan hisob o'zgartirildi",
                p_type: adjustment.type
            });

            if (error) throw error;
            
            setIsAdjustModalOpen(false);
            setAdjustment({ amount: "", description: "", type: "earned" });
            fetchData();
            alert("Muvaffaqiyatli bajarildi!");
        } catch (e) {
            console.error(e);
            alert("Xatolik yuz berdi");
        }
    };

    const filteredWallets = wallets.filter(w => 
        w.user_phone.includes(searchQuery) || 
        w.wallet_number.includes(searchQuery)
    );

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-black" size={40} />
        </div>
    );

    return (
        <div className="p-4 md:p-10 space-y-10 max-w-[1600px] mx-auto bg-[#F8F9FA] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">HAMYON TIZIMI</h1>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Wallet size={14} className="text-black" /> Foydalanuvchilar balansini boshqarish
                    </p>
                </div>
                <button 
                    onClick={fetchData}
                    className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
                >
                    <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-black text-white p-8 rounded-[48px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2 italic">Umumiy Platforma Balansi</p>
                    <h2 className="text-4xl font-black italic tracking-tighter">
                        {wallets.reduce((s, w) => s + Number(w.balance), 0).toLocaleString()} <span className="text-xl not-italic opacity-40">so'm</span>
                    </h2>
                </div>
                <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Hamyonlar Soni</p>
                        <h2 className="text-3xl font-black italic tracking-tighter">{wallets.length} <span className="text-lg not-italic opacity-40 uppercase">ta aktiv</span></h2>
                    </div>
                    <div className="w-16 h-16 bg-gray-50 rounded-[28px] flex items-center justify-center">
                        <User size={28} className="text-gray-300" />
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">So'nggi 24s tranzaksiyalar</p>
                        <h2 className="text-3xl font-black italic tracking-tighter">
                            {transactions.filter(t => new Date(t.created_at).getTime() > Date.now() - 86400000).length}
                        </h2>
                    </div>
                    <div className="w-16 h-16 bg-emerald-50 rounded-[28px] flex items-center justify-center">
                        <History size={28} className="text-emerald-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Wallets List Section */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 h-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">FOYDALANUVCHILAR</h3>
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Telefon yoki hamyon raqami..."
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl py-4 pl-12 pr-6 text-sm font-bold outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-gray-50">
                                        <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">User</th>
                                        <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Hamyon Raqami</th>
                                        <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-right">Balans</th>
                                        <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredWallets.map(w => (
                                        <tr key={w.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black italic">{w.user_phone.slice(-2)}</div>
                                                    <p className="font-bold text-sm">{w.user_phone}</p>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4 font-mono text-[11px] font-black text-gray-400 uppercase tracking-tighter">
                                                {w.wallet_number.replace(/(.{4})/g, '$1 ')}
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <p className="font-black italic tracking-tighter text-lg">{w.balance.toLocaleString()} so'm</p>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <button 
                                                    onClick={() => { setSelectedWallet(w); setIsAdjustModalOpen(true); }}
                                                    className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                                                >
                                                    BALANS
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Transactions Section */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase">OXIRGI TRANZAKSIYALAR</h3>
                            <History size={20} className="text-gray-300" />
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {transactions.map(t => (
                                <div key={t.id} className="p-4 bg-gray-50 rounded-3xl flex items-center justify-between border-2 border-transparent hover:border-black transition-all group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${t.amount >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {t.amount >= 0 ? <Plus size={16} /> : <Minus size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-gray-900 group-hover:text-black transition-colors uppercase leading-tight line-clamp-1 italic">{t.description}</p>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{new Date(t.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className={`text-xs font-black italic tracking-tighter shrink-0 ${t.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Adjust Balance Modal */}
            {isAdjustModalOpen && selectedWallet && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/50">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Balansni Boshqarish</h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{selectedWallet.user_phone}</p>
                            </div>
                            <button onClick={() => setIsAdjustModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleAdjustBalance} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tranzaksiya Turi</label>
                                    <select 
                                        value={adjustment.type}
                                        onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-6 text-sm font-black outline-none transition-all shadow-inner"
                                    >
                                        <option value="earned">Qo'shish (Premium/Refund)</option>
                                        <option value="penalty">Ayirish (Penalty/Correction)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Summa (so'm)</label>
                                    <input 
                                        required
                                        type="number"
                                        value={adjustment.amount}
                                        onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
                                        placeholder="0"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-6 text-2xl font-black outline-none transition-all italic tracking-tighter shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Izoh (Mijoz ko'radi)</label>
                                <textarea 
                                    value={adjustment.description}
                                    onChange={(e) => setAdjustment({ ...adjustment, description: e.target.value })}
                                    placeholder="Tizim tomonidan sovg'a yoki jarima sababi..."
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-8 text-sm font-bold outline-none transition-all resize-none shadow-inner h-32"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-black text-white py-8 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                BALANSNI YANGILASH
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
