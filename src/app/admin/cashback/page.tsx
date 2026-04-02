"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Edit2, Check, X, Tag, Calculator, Calendar, Hash, ToggleLeft, ToggleRight, Loader2, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, History, User, Banknote, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminCashback() {
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [globalSettings, setGlobalSettings] = useState({ rate: 0.02, enabled: true });
    const [loading, setLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [adjustment, setAdjustment] = useState({
        amount: 0,
        type: "earned",
        description: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/admin/cashback");
            const data = await res.json();
            if (data.success) {
                setWallets(data.wallets);
                setTransactions(data.transactions);
                if (data.settings) setGlobalSettings(data.settings);
            }
        } catch (error) {
            console.error("Fetch cashback data error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        setIsSavingSettings(true);
        try {
            const res = await fetch("/api/admin/cashback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: 'update_settings', settings: globalSettings })
            });
            const data = await res.json();
            if (data.success) {
                alert("Sozlamalar yangilandi!");
            }
        } catch (error) {
            console.error("Update settings error:", error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/admin/cashback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    user_phone: selectedWallet.user_phone, 
                    amount: adjustment.amount, 
                    type: adjustment.type, 
                    description: adjustment.description 
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchData();
                setIsAdjustModalOpen(false);
                setAdjustment({ amount: 0, type: "earned", description: "" });
            }
        } catch (error) {
            console.error("Manual adjustment error:", error);
        }
    };

    if (loading && wallets.length === 0) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-12 h-12 text-black animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4 text-emerald-600 italic">Cashback Tizimi</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Ichki pul tizimi • {wallets.length} ta hamyon • {transactions.length} ta operatsiya</p>
                </div>
            </div>

            {/* Global Settings Control */}
            <div className="bg-white p-10 rounded-[50px] shadow-2xl border-2 border-gray-50 flex flex-col md:flex-row items-center gap-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center shrink-0">
                    <Settings className="w-10 h-10" />
                </div>
                <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Global Sozlamalar</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-md">
                        Har bir xariddan beriladigan cashback foizini va tizimning umumiy holatini boshqaring.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 bg-gray-50 p-6 rounded-[35px] border border-gray-100">
                    <div className="flex items-center gap-3 space-x-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-4 border-r border-gray-200 shrink-0">Foiz</span>
                        <div className="relative">
                            <input 
                                type="number" 
                                step="0.5"
                                value={globalSettings.rate * 100}
                                onChange={(e) => setGlobalSettings({ ...globalSettings, rate: Number(e.target.value) / 100 })}
                                className="w-28 bg-white border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 text-xl font-black italic outline-none transition-all pr-8"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-emerald-500 italic">%</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setGlobalSettings({ ...globalSettings, enabled: !globalSettings.enabled })}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            globalSettings.enabled ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                        {globalSettings.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {globalSettings.enabled ? 'Yoqilgan' : 'O\'chirilgan'}
                    </button>

                    <button 
                        onClick={handleUpdateSettings}
                        disabled={isSavingSettings}
                        className="px-8 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {isSavingSettings ? <Loader2 className="animate-spin" size={16} /> : 'Saqlash'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Wallets List */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Wallet className="text-emerald-500" size={24} />
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Mijoz Hamyonlari</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {wallets.map((wallet) => (
                            <div key={wallet.user_phone} className="bg-white p-6 rounded-[40px] shadow-xl border-2 border-gray-50 relative group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedWallet(wallet); setIsAdjustModalOpen(true); }}
                                        className="p-3 bg-black text-white rounded-2xl hover:scale-110 active:scale-95 transition-all text-[10px] font-black"
                                    >
                                        Tahrirlash
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{wallet.user_phone}</p>
                                    <p className="font-mono text-xs text-gray-600 font-bold mb-4">{wallet.wallet_number.replace(/(.{4})/g, '$1 ')}</p>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 italic">Hamyon balansi</p>
                                        <p className="text-2xl font-black italic tracking-tighter text-emerald-600 ">{Number(wallet.balance).toLocaleString()} so'm</p>
                                    </div>
                                    {wallet.is_active ? <Check className="text-emerald-500 mb-1" size={16} /> : <X className="text-red-500 mb-1" size={16} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transactions Audit Trail */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <History className="text-blue-500" size={24} />
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Audit Transaksiyalar</h2>
                    </div>

                    <div className="bg-white rounded-[40px] shadow-xl border-2 border-gray-50 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mijoz / SANA</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">TUR</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">TAVSIF</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">MIQDOR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-black italic">{t.user_phone}</p>
                                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{new Date(t.created_at).toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                t.type === 'earned' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                t.type === 'spent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[11px] font-bold text-gray-600">{t.description || 'Kommentariya yo\'q'}</p>
                                            {t.order_id && <p className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-widest">Buyurtma: #{t.order_id}</p>}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className={`text-base font-black italic tracking-tighter ${t.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {t.amount >= 0 ? '+' : ''}{Number(t.amount).toLocaleString()} so'm
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Manual Adjustment Modal */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-emerald-50/30">
                            <div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Balansni Sozlash</h2>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Hamyon: {selectedWallet?.wallet_number.replace(/(.{4})/g, '$1 ')}</p>
                            </div>
                            <button onClick={() => setIsAdjustModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleAdjustment} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Miqdor (Summa)</label>
                                    <input 
                                        required
                                        type="number"
                                        value={adjustment.amount}
                                        onChange={(e) => setAdjustment({ ...adjustment, amount: Number(e.target.value) })}
                                        placeholder="so'm"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-5 text-xl font-black outline-none transition-all italic tracking-tighter"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amal Turi</label>
                                    <select 
                                        value={adjustment.type}
                                        onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-5 text-sm font-black outline-none transition-all"
                                    >
                                        <option value="earned">Qo'shish (Credit)</option>
                                        <option value="penalty">Ayrish (Penalty)</option>
                                        <option value="refunded">Qaytarish (Refund)</option>
                                        <option value="manual">Boshqa (Manual)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sabab / Tavsif</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={adjustment.description}
                                    onChange={(e) => setAdjustment({ ...adjustment, description: e.target.value })}
                                    placeholder="Tizim tomonidan sovg'a yoki jarima sababi..."
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-6 text-sm font-bold outline-none transition-all resize-none"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-black text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
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
