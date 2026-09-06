"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    ShoppingCart, 
    Send, 
    Clock, 
    User, 
    Loader2, 
    RefreshCw, 
    Phone, 
    Search, 
    Package, 
    CheckCircle2
} from "lucide-react";
import { useStore } from "@/store/store";

interface CartItem {
    id: string;
    quantity: number;
    name: string;
    price: number;
    image?: string;
    is_deleted?: boolean;
}

interface AbandonedCart {
    user_phone: string;
    items: CartItem[];
    updated_at: string;
    total: number;
    users?: {
        name?: string;
        telegram_id?: number | string;
    } | null;
}

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "bot" | "no_bot">("all");
    const [sendingPhone, setSendingPhone] = useState<string | null>(null);
    const { showToast } = useStore();

    const fetchCarts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/carts");
            const data = await res.json();
            if (data.success) {
                setCarts(data.carts || []);
            } else {
                showToast(data.error || "Savatlarni yuklashda xatolik", "error");
            }
        } catch (error) {
            showToast("Savatlarni yuklashda tarmoq xatosi", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCarts();
    }, []);

    const handleRemind = async (cart: AbandonedCart) => {
        setSendingPhone(cart.user_phone);
        try {
            const res = await fetch("/api/admin/carts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cart.user_phone, items: cart.items }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || "Eslatma yuborildi!", "success");
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
        if (!dateStr) return "Noma'lum";
        const diffInMs = Math.abs(new Date().getTime() - new Date(dateStr).getTime());
        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMs / 36e5);
        const diffInDays = Math.floor(diffInMs / (24 * 36e5));

        if (diffInMinutes < 1) return "Hozirgina";
        if (diffInMinutes < 60) return `${diffInMinutes} daqiqa oldin`;
        if (diffInHours < 24) return `${diffInHours} soat oldin`;
        return `${diffInDays} kun oldin`;
    };

    // Filtered carts
    const filteredCarts = useMemo(() => {
        return carts.filter(cart => {
            const matchesPhone = cart.user_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (cart.users?.name && cart.users.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                cart.items.some(i => i.name?.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesPhone) return false;

            if (filterStatus === "bot") return !!cart.users?.telegram_id;
            if (filterStatus === "no_bot") return !cart.users?.telegram_id;
            return true;
        });
    }, [carts, searchQuery, filterStatus]);

    // Statistics
    const stats = useMemo(() => {
        const totalValue = carts.reduce((sum, c) => sum + (Number(c.total) || 0), 0);
        const botUsers = carts.filter(c => !!c.users?.telegram_id).length;
        const totalItemsCount = carts.reduce((sum, c) => sum + c.items.reduce((iSum, it) => iSum + (it.quantity || 1), 0), 0);
        return {
            totalCarts: carts.length,
            totalValue,
            botUsers,
            totalItemsCount
        };
    }, [carts]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-black bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
                        <span className="p-2.5 bg-black text-white rounded-2xl">
                            <ShoppingCart size={24} strokeWidth={2.5} />
                        </span>
                        Tark etilgan Savatlar
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Savatiga mahsulot qo'shib, to'lovni yakunlamagan xaridorlar bilan aloqa
                    </p>
                </div>
                <button
                    onClick={fetchCarts}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition shadow-sm active:scale-95"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Yangilash
                </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Jami savatlar</p>
                    <p className="text-2xl font-black mt-1 text-black">{stats.totalCarts} <span className="text-sm font-semibold text-gray-400">ta</span></p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Savatlardagi summa</p>
                    <p className="text-2xl font-black mt-1 text-black">
                        {stats.totalValue.toLocaleString()} <span className="text-sm font-semibold text-gray-400">so'm</span>
                    </p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Telegram botda bor</p>
                    <p className="text-2xl font-black mt-1 text-blue-600">{stats.botUsers} <span className="text-sm font-semibold text-gray-400">ta</span></p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Jami mahsulotlar</p>
                    <p className="text-2xl font-black mt-1 text-emerald-600">{stats.totalItemsCount} <span className="text-sm font-semibold text-gray-400">dona</span></p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Telefon yoki mahsulot nomi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 transition"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                            filterStatus === "all" ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Barchasi ({carts.length})
                    </button>
                    <button
                        onClick={() => setFilterStatus("bot")}
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                            filterStatus === "bot" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Botda bor ({stats.botUsers})
                    </button>
                    <button
                        onClick={() => setFilterStatus("no_bot")}
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                            filterStatus === "no_bot" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Botda yo'q ({stats.totalCarts - stats.botUsers})
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-28 bg-white rounded-3xl border border-gray-100">
                    <Loader2 size={44} className="animate-spin text-black mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Savatlar yuklanmoqda...</p>
                </div>
            ) : filteredCarts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Tark etilgan savat topilmadi</h3>
                    <p className="text-gray-400 text-xs mt-1">
                        {searchQuery ? "Qidiruv bo'yicha hech qanday natija chiqmadi." : "Hozircha barcha mijozlar savatlarini rasmiylashtirib bo'lgan."}
                    </p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCarts.map((cart, idx) => {
                        const isConnected = !!cart.users?.telegram_id;
                        const cartTotal = Number(cart.total || cart.items.reduce((sum: number, i: any) => sum + (Number(i.price || 0) * (Number(i.quantity) || 1)), 0));

                        return (
                            <div 
                                key={idx} 
                                className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md hover:border-gray-200 transition-all duration-200"
                            >
                                {/* Header: User & Status */}
                                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 bg-gray-100 text-black rounded-2xl flex items-center justify-center font-black">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`tel:${cart.user_phone}`}
                                                    className="font-black text-base hover:text-blue-600 transition flex items-center gap-1.5"
                                                    title="Qo'ng'iroq qilish"
                                                >
                                                    {cart.user_phone}
                                                    <Phone size={12} className="text-gray-400" />
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {cart.users?.name && (
                                                    <span className="text-xs font-semibold text-gray-600">
                                                        {cart.users.name} •
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                                                    <Clock size={11} /> {formatTimeAgo(cart.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {isConnected ? (
                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                                                <CheckCircle2 size={11} /> Botda bor
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                                                Botda yo'q
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items in Cart */}
                                <div className="flex-1 bg-gray-50/80 rounded-2xl p-3.5 mb-4 border border-gray-100/80">
                                    <div className="flex justify-between items-center mb-2.5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            Mahsulotlar ({cart.items.length})
                                        </p>
                                    </div>
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                        {cart.items.map((item: CartItem, i: number) => {
                                            const itemPrice = Number(item.price || 0);

                                            return (
                                                <div 
                                                    key={i} 
                                                    className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100/90 text-xs"
                                                >
                                                    {/* Product Thumbnail */}
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative flex items-center justify-center">
                                                        {item.image ? (
                                                            <img 
                                                                src={item.image} 
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Package size={16} className="text-gray-400" />
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-bold text-gray-800 truncate" title={item.name}>
                                                                {item.name || "(Noma'lum mahsulot)"}
                                                            </p>
                                                            {item.is_deleted && (
                                                                <span className="shrink-0 bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                    O'chirilgan
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5 font-semibold">
                                                            <span>{itemPrice.toLocaleString()} so'm</span>
                                                            <span className="font-black text-black">x{item.quantity || 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Total and Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Jami summa:</p>
                                        <p className="font-black text-lg text-black">
                                            {cartTotal.toLocaleString()} <span className="text-xs font-semibold text-gray-400">so'm</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`tel:${cart.user_phone}`}
                                            className="p-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                                            title="Qo'ng'iroq qilish"
                                        >
                                            <Phone size={15} />
                                        </a>

                                        <button
                                            onClick={() => handleRemind(cart)}
                                            disabled={sendingPhone === cart.user_phone}
                                            title="Sayt, PWA va Telegram orqali eslatma yuborish"
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition active:scale-95 disabled:opacity-50"
                                        >
                                            {sendingPhone === cart.user_phone ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Send size={14} />
                                            )}
                                            Eslatish
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
