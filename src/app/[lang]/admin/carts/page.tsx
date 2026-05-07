"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Send, Clock, User, Loader2, RefreshCw } from "lucide-react";
import { useStore } from "@/store/store";

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingPhone, setSendingPhone] = useState<string | null>(null);
    const { showToast } = useStore();

    const fetchCarts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/carts");
            const data = await res.json();
            if (data.success) {
                setCarts(data.carts);
            }
        } catch (error) {
            showToast("Savatlarni yuklashda xatolik", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCarts();
    }, []);

    const handleRemind = async (cart: any) => {
        setSendingPhone(cart.user_phone);
        try {
            const res = await fetch("/api/admin/carts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cart.user_phone, items: cart.items }),
            });
            const data = await res.json();
            if (data.success) {
                showToast("Eslatma yuborildi!", "success");
            } else {
                showToast(data.error || "Xatolik yuz berdi", "error");
            }
        } catch (error) {
            showToast("Server xatosi", "error");
        } finally {
            setSendingPhone(null);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diffInHours = Math.abs(new Date().getTime() - new Date(dateStr).getTime()) / 36e5;
        if (diffInHours < 1) return "Yaqinda";
        if (diffInHours < 24) return `${Math.floor(diffInHours)} soat oldin`;
        return `${Math.floor(diffInHours / 24)} kun oldin`;
    };

    return (
        <div className="p-6 min-h-screen text-black">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                        <ShoppingCart size={28} strokeWidth={3} />
                        Tark etilgan Savatlar
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Savatiga mahsulot solib sotib olmagan mijozlar ro'yxati
                    </p>
                </div>
                <button
                    onClick={fetchCarts}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Yangilash
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-gray-300" />
                </div>
            ) : carts.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
                    <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-xl font-bold">Hech narsa topilmadi</h3>
                    <p className="text-gray-400 mt-2">Hozircha hamma savatini xarid qilib bo'lgan ko'rinadi.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {carts.map((cart, idx) => {
                        const isConnected = !!cart.users?.telegram_id;
                        const cartTotal = cart.items.reduce((sum: number, i: any) => sum + (Number(i.price) * (i.quantity || 1)), 0);

                        return (
                            <div key={idx} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg">{cart.user_phone}</p>
                                            <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                                <Clock size={12} /> {formatTimeAgo(cart.updated_at)}
                                            </p>
                                        </div>
                                    </div>
                                    {!isConnected && (
                                        <span className="bg-red-50 text-red-500 text-[10px] font-black uppercase px-2 py-1 rounded-lg">Botda yo'q</span>
                                    )}
                                </div>

                                <div className="flex-1 bg-gray-50 rounded-2xl p-4 mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Savatdagi mahsulotlar:</p>
                                    <ul className="space-y-3">
                                        {cart.items.map((item: any, i: number) => (
                                            <li key={i} className="flex justify-between items-center text-sm font-medium">
                                                <span className="truncate pr-4 flex-1">{item.name}</span>
                                                <span className="font-bold whitespace-nowrap">x{item.quantity || 1}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex justify-between items-center mt-auto">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jami summa:</p>
                                        <p className="font-black text-xl">{cartTotal.toLocaleString()} <span className="text-sm font-medium">so'm</span></p>
                                    </div>
                                    <button
                                        onClick={() => handleRemind(cart)}
                                        disabled={!isConnected || sendingPhone === cart.user_phone}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            isConnected 
                                            ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200" 
                                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        {sendingPhone === cart.user_phone ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Eslatish
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
