"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
    Users,
    Banknote,
    Clock,
    CheckCircle,
    XCircle,
    Settings,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
    CreditCard,
    ExternalLink
} from "lucide-react";

interface WithdrawalRequest {
    id: string;
    user_phone: string;
    amount: number;
    card_number: string;
    status: "pending" | "paid" | "rejected";
    created_at: string;
    users: {
        name: string;
        phone: string;
    };
}

interface AffiliateSettings {
    referrer_reward: number;
    buyer_discount: number;
    min_withdrawal: number;
    reward_type: "fixed" | "percent";
}

interface Stats {
    total_earned: number;
    pending_rewards: number;
    active_affiliates_count: number;
}

export default function AffiliateAdminPage() {
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [settings, setSettings] = useState<AffiliateSettings>({
        referrer_reward: 15000,
        buyer_discount: 10000,
        min_withdrawal: 50000,
        reward_type: "fixed"
    });
    const [stats, setStats] = useState<Stats>({
        total_earned: 0,
        pending_rewards: 0,
        active_affiliates_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/affiliate");
            const data = await res.json();
            if (data.success) {
                setWithdrawals(data.withdrawals || []);
                if (data.settings) setSettings(data.settings);
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await fetch("/api/admin/affiliate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_settings",
                    settings
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Sozlamalar yangilandi");
            } else {
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Server bilan bog'lanishda xatolik");
        } finally {
            setSaving(false);
        }
    };

    const handleWithdraw = async (id: string, status: "paid" | "rejected") => {
        if (!confirm(`Ushbu so'rovni ${status === 'paid' ? 'tasdiqlaysizmi' : 'rad etasizmi'}?`)) return;

        try {
            const res = await fetch("/api/admin/affiliate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "handle_withdraw",
                    id,
                    status
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Amal bajarildi");
                fetchData();
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight italic">HAMKORLIK TIZIMI</h1>
                    <p className="text-gray-500 mt-2 font-medium">Affiliate dasturi va pul yechish so'rovlarini boshqarish</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="text-green-600" size={20} />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tizim holati</p>
                        <p className="text-sm font-black text-green-600">FAOL</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} />
                    </div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-4">Jami To'langan</p>
                    <h3 className="text-3xl font-black">{stats.total_earned.toLocaleString()} <span className="text-sm text-gray-400 font-medium">SO'M</span></h3>
                    <div className="mt-4 flex items-center gap-2 text-green-600 font-bold text-xs">
                        <TrendingUp size={14} />
                        <span>Real hamyon orqali</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={80} />
                    </div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-4">Kutilayotgan Bonuslar</p>
                    <h3 className="text-3xl font-black">{stats.pending_rewards.toLocaleString()} <span className="text-sm text-gray-400 font-medium">SO'M</span></h3>
                    <div className="mt-4 flex items-center gap-2 text-orange-500 font-bold text-xs">
                        <Clock size={14} />
                        <span>Mijozlar buyurtmasi kutilmoqda</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Users size={80} />
                    </div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-4">Faol Hamkorlar</p>
                    <h3 className="text-3xl font-black">{stats.active_affiliates_count} <span className="text-sm text-gray-400 font-medium">NAFAR</span></h3>
                    <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs">
                        <Users size={14} />
                        <span>O'z kodi bor foydalanuvchilar</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Settings Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden sticky top-32">
                        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                                <Settings size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase italic">Tariflar</h2>
                                <p className="text-xs text-gray-400 font-medium">Referal tizimi qoidalari</p>
                            </div>
                        </div>
                        <form onSubmit={handleUpdateSettings} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Hamkor Mukofoti (So'm)</label>
                                <input
                                    type="number"
                                    value={settings.referrer_reward}
                                    onChange={(e) => setSettings({ ...settings, referrer_reward: Number(e.target.value) })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-black transition-all"
                                    placeholder="Masalan: 15000"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 italic font-medium">* Kod egasiga beriladigan summa</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Xaridor Chegirmasi (So'm)</label>
                                <input
                                    type="number"
                                    value={settings.buyer_discount}
                                    onChange={(e) => setSettings({ ...settings, buyer_discount: Number(e.target.value) })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-black transition-all"
                                    placeholder="Masalan: 10000"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 italic font-medium">* Promokod ishlatgan yangi mijozga chegirma</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Minimal Yechish (So'm)</label>
                                <input
                                    type="number"
                                    value={settings.min_withdrawal}
                                    onChange={(e) => setSettings({ ...settings, min_withdrawal: Number(e.target.value) })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-black transition-all"
                                    placeholder="Masalan: 50000"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-black text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                            >
                                {saving ? "SAQLANMOQDA..." : "SOZLAMALARNI SAQLASH"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Withdraw Requests Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Banknote size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase italic">To'lov So'rovlari</h2>
                                    <p className="text-xs text-gray-400 font-medium">Yechib olish uchun arizalar</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Foydalanuvchi</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Summa</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Karta</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Holat</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {withdrawals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold italic">Hozircha so'rovlar yo'q</td>
                                        </tr>
                                    ) : (
                                        withdrawals.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xs">
                                                            {req.users?.name?.charAt(0) || "U"}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{req.users?.name || "Noma'lum"}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium">{req.user_phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-black text-sm">
                                                    {req.amount.toLocaleString()} <span className="text-[10px] text-gray-400 font-medium">SO'M</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-gray-600 font-bold text-xs bg-gray-100 py-2 px-3 rounded-xl inline-flex">
                                                        <CreditCard size={14} />
                                                        {req.card_number}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                                                            req.status === 'paid' ? 'bg-green-50 text-green-600' :
                                                                'bg-red-50 text-red-600'
                                                        }`}>
                                                        {req.status === 'pending' ? 'Kutilmoqda' :
                                                            req.status === 'paid' ? 'To''landi' : 'Rad etildi'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    {req.status === 'pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleWithdraw(req.id, 'rejected')}
                                                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                                                title="Rad etish"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleWithdraw(req.id, 'paid')}
                                                                className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-600/10"
                                                                title="To'landi"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Bajarildi</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
