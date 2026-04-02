"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import { 
    ChevronRight, 
    Package, 
    ShoppingBag, 
    RotateCcw, 
    Ticket, 
    Star, 
    Heart, 
    Moon, 
    Layers, 
    User, 
    MessageSquare, 
    Headset, 
    LogOut, 
    Loader2, 
    ChevronLeft,
    Phone,
    Save,
    CheckCircle2,
    Settings,
    Tag,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    History as HistoryIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { mapUser } from "@/lib/mappers";

export default function AccountPage() {
    const router = useRouter();
    const { user, setUser, logout, language, setLanguage } = useStore();
    const t = translations[language];

    const [view, setView] = useState<"menu" | "edit-profile" | "language" | "returns" | "promo-codes" | "wallet">("menu");
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pendingCashback, setPendingCashback] = useState(0);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchUserData = async () => {
            try {
                const { data, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("phone", user.phone)
                    .single();

                if (data) {
                    const mappedUser = mapUser(data);
                    setName(mappedUser.name || "");
                    setUsername(mappedUser.username || "");
                    setUser({ ...user, ...mappedUser });
                }
            } catch (e) {
                console.error("Error fetching user data:", e);
            }

            // Fetch Pending Cashback
            try {
                const { data: pOrders } = await supabase
                    .from("orders")
                    .select("potential_cashback")
                    .eq("user_phone", user.phone)
                    .neq("status", "delivered")
                    .neq("status", "cancelled")
                    .neq("status", "returned")
                    .gt("potential_cashback", 0);
                
                if (pOrders) {
                    const total = pOrders.reduce((sum, o) => sum + Number(o.potential_cashback), 0);
                    setPendingCashback(total);
                }
            } catch (e) {
                console.error("Error fetching pending cashback:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user?.phone]);

    const handleSave = async () => {
        if (!user) return;
        setUsernameError("");

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (username && !usernameRegex.test(username)) {
            setUsernameError(language === 'uz' ? "Username noto'g'ri formatda" : "Неверный формат");
            return;
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername && (trimmedUsername.length < 3 || trimmedUsername.length > 20)) {
            setUsernameError(language === 'uz' ? "3-20 ta belgi" : "3-20 символов");
            return;
        }

        setIsSaving(true);
        try {
            if (trimmedUsername && trimmedUsername !== user.username) {
                const { data: existing } = await supabase.from("users").select("phone").eq("username", trimmedUsername).neq("phone", user.phone).maybeSingle();
                if (existing) {
                    setUsernameError(language === 'uz' ? "Username band" : "Занято");
                    setIsSaving(false);
                    return;
                }
            }

            const { error } = await supabase.from("users").update({ name, username: trimmedUsername }).eq("phone", user.phone);
            if (error) throw error;

            setUser({ ...user, name, username: trimmedUsername });
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setView("menu");
            }, 1500);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F3F5]">
            <Loader2 className="animate-spin text-black" size={32} />
        </div>
    );

    if (!user) {
        return (
            <div className="p-8 bg-[#F2F3F5] min-h-screen flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center text-gray-300 shadow-sm">
                    <User size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tighter mb-2">{t.account.login}</h2>
                    <p className="text-gray-400 text-sm font-medium max-w-[240px]">
                        {language === 'uz' ? 'Profilga kirib buyurtmalarni kuzating' : 'Войдите чтобы заказать'}
                    </p>
                </div>
                <Link href="/login" className="w-full max-w-[200px] bg-black text-white py-4 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
                    {t.account.login}
                </Link>
            </div>
        );
    }

    // --- Sub-Views ---

    if (view === "edit-profile") {
        return (
            <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
                <div className="max-w-xl mx-auto pt-10">
                    <button onClick={() => setView("menu")} className="flex items-center gap-2 text-gray-500 font-bold mb-8 hover:text-black transition-colors">
                        <ChevronLeft size={20} />
                        {language === 'uz' ? 'Orqaga' : 'Назад'}
                    </button>
                    
                    <h1 className="text-3xl font-black tracking-tighter mb-10 italic uppercase">{t.account.sections.settings}</h1>
                    
                    <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-2 block">{t.account.name}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl px-6 py-4 font-bold outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-2 block">Username (@)</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`w-full bg-gray-50 border-2 ${usernameError ? 'border-red-500' : 'border-transparent focus:border-black'} rounded-2xl px-6 py-4 font-bold outline-none transition-all`}
                            />
                            {usernameError && <p className="text-red-500 text-[10px] font-bold mt-2 ml-4">{usernameError}</p>}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {language === 'uz' ? 'Saqlash' : 'Сохранить'}
                        </button>
                    </div>
                </div>
                {showSuccess && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                        <CheckCircle2 size={18} className="text-green-400" /> {language === 'uz' ? 'Saqlandi' : 'Сохранено'}
                    </div>
                )}
            </div>
        );
    }

    if (view === "language") {
        return (
            <div className="bg-[#F2F3F5] min-h-screen px-4 md:px-10">
                <div className="max-w-xl mx-auto pt-10">
                    <button onClick={() => setView("menu")} className="flex items-center gap-2 text-gray-500 font-bold mb-8 transition-colors">
                        <ChevronLeft size={20} />
                        {language === 'uz' ? 'Orqaga' : 'Назад'}
                    </button>
                    <h1 className="text-3xl font-black tracking-tighter mb-10 italic uppercase">{language === 'uz' ? 'Tilni tanlash' : 'Выбор языка'}</h1>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => { setLanguage("uz"); setView("menu"); }}
                            className={`w-full p-6 bg-white rounded-3xl flex items-center justify-between font-black italic tracking-tighter text-xl ${language === 'uz' ? 'ring-2 ring-black' : ''}`}
                        >
                            O'zbekcha {language === 'uz' && <CheckCircle2 size={24} />}
                        </button>
                        <button 
                            onClick={() => { setLanguage("ru"); setView("menu"); }}
                            className={`w-full p-6 bg-white rounded-3xl flex items-center justify-between font-black italic tracking-tighter text-xl ${language === 'ru' ? 'ring-2 ring-black' : ''}`}
                        >
                            Русский {language === 'ru' && <CheckCircle2 size={24} />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === "returns") {
        return <ReturnsView user={user} t={t} language={language} onBack={() => setView("menu")} />;
    }

    if (view === "promo-codes") {
        return <PromoCodesView t={t} language={language} onBack={() => setView("menu")} />;
    }

    if (view === "wallet") {
        return <WalletView user={user} t={t} language={language} onBack={() => setView("menu")} />;
    }

    // --- Main Menu View ---

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-32">
            <div className="max-w-xl mx-auto px-4 md:px-0">
                
                {/* 1. Profile Header */}
                <div className="pt-10 pb-6">
                    <div className="flex items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-gray-100/50">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-black overflow-hidden relative group">
                                {name ? name.charAt(0).toUpperCase() : <User size={24} />}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Settings size={16} />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tighter truncate">{name || user.phone}</h2>
                                <button onClick={() => setView("edit-profile")} className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-black transition-colors mt-0.5">
                                    {language === 'uz' ? 'Profilni oching' : 'Открыть профиль'} <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                        <Link href="/messages" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all">
                            <MessageSquare size={20} />
                        </Link>
                    </div>
                </div>

                {/* 2. Promo Section (Split/Balance) */}
                <div className="mb-8">
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100/50 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-xl">
                                    <Ticket size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-black italic tracking-tighter">700 000 so'm</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bonus balansi</p>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-300" size={20} />
                        </div>
                    </div>
                </div>

                {/* 3. Sections Mapping */}
                <div className="space-y-8">
                    {/* Shopping */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.shopping}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem href="/orders" icon={<Package size={20} />} label={t.account.orders} />
                            <MenuItem onClick={() => setView("returns")} icon={<RotateCcw size={20} />} label={t.account.sections.returns} divider={false} />
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.benefits}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <div className="relative">
                                <MenuItem onClick={() => setView("wallet")} icon={<Wallet size={20} />} label={language === 'uz' ? 'Mening hamyonim' : 'Мой кошелек'} />
                                {pendingCashback > 0 && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-12 flex items-center gap-1.5 animate-pulse">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                                        <span className="text-[8px] font-black italic text-orange-500 uppercase tracking-tighter">
                                            {pendingCashback.toLocaleString()}...
                                        </span>
                                    </div>
                                )}
                            </div>
                            <MenuItem href="#" icon={<Ticket size={20} />} label={t.account.sections.promoCodes} divider={false} />
                        </div>
                    </div>

                    {/* Marketplace */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{language === 'uz' ? 'Mening Bozorim' : 'Мой Маркет'}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem href="/chat" icon={<Star size={20} />} label={t.account.sections.reviews} />
                            <MenuItem href="/wishlist" icon={<Heart size={20} />} label={t.nav.wishlist} />
                            <MenuItem onClick={() => setView("language")} icon={<Moon size={20} />} label={t.account.sections.theme} />
                            <MenuItem href="#" icon={<Layers size={20} />} label={t.account.sections.compare} />
                            <MenuItem onClick={() => setView("edit-profile")} icon={<User size={20} />} label={t.account.sections.settings} divider={false} />
                        </div>
                    </div>

                    {/* Others */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.others}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem href="/messages" icon={<MessageSquare size={20} />} label={language === 'uz' ? 'Suhbatlar' : 'Беседы'} />
                            <MenuItem href="/chat" icon={<Headset size={20} />} label={t.account.sections.support} />
                            <MenuItem onClick={logout} icon={<LogOut size={20} />} label={t.account.logout} variant="danger" divider={false} />
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                    Velari v1.2.0
                </div>

            </div>
        </div>
    );
}

function ReturnsView({ user, t, language, onBack }: any) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_phone", user.phone)
                .eq("status", "Yetkazildi")
                .order("created_at", { ascending: false });

            if (data) {
                // Filter by 14 days
                const now = new Date().getTime();
                const fourteenDays = 14 * 24 * 60 * 60 * 1000;
                const eligible = data.filter(o => {
                    const deliveredAt = new Date(o.delivered_at || o.created_at).getTime();
                    return (now - deliveredAt) <= fourteenDays;
                });
                setOrders(eligible);
            }
            setLoading(false);
        };
        fetchOrders();
    }, [user.phone]);

    const handleSubmit = async () => {
        if (selectedItems.length === 0 || !reason.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    userPhone: user.phone,
                    items: selectedItems,
                    reason: reason.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => onBack(), 2000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) return (
        <div className="min-h-screen bg-[#F2F3F5] flex items-center justify-center p-8">
            <div className="bg-white p-10 rounded-[48px] text-center shadow-xl flex flex-col items-center max-w-sm">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter mb-4">{language === 'uz' ? 'So\'rov yuborildi!' : 'Заявка отправлена!'}</h2>
                <p className="text-gray-400 font-medium text-sm leading-relaxed">{language === 'uz' ? "Sizning qaytarish so'rovingiz ko'rib chiqiladi. Tez orada adminlarimiz siz bilan bog'lanishadi." : "Ваша заявка будет рассмотрена. Наши админы свяжутся с вами в ближайшее время."}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
            <div className="max-w-xl mx-auto pt-10">
                <button onClick={selectedOrder ? () => setSelectedOrder(null) : onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8 hover:text-black transition-all">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>

                {!selectedOrder ? (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-black tracking-tighter italic uppercase">{t.account.sections.returns}</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                            {language === 'uz' ? 'Yetkazib berilganidan so\'ng 14 kun ichida mahsulotlarni qaytarishingiz mumkin.' : 'Вы можете вернуть товары в течение 14 дней после доставки.'}
                        </p>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-black" /></div>
                        ) : orders.length === 0 ? (
                            <div className="bg-white p-12 rounded-[40px] text-center border border-gray-100 italic font-bold text-gray-400">
                                {language === 'uz' ? 'Hozircha qaytarish uchun buyurtmalar yo\'q.' : 'Нет заказов для возврата.'}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div 
                                        key={order.id} 
                                        onClick={() => setSelectedOrder(order)}
                                        className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase">#{order.id.slice(0,8)}</p>
                                                <p className="font-black text-lg italic tracking-tighter">{order.total.toLocaleString()} so'm</p>
                                            </div>
                                            <ChevronRight className="text-gray-300 group-hover:text-black transition-all" />
                                        </div>
                                        <div className="flex -space-x-2">
                                            {order.items.map((item: any, i: number) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-black">{item.name[0]}</div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-10">
                        <h1 className="text-2xl font-black tracking-tighter italic uppercase">{language === 'uz' ? 'Qaytarish tafsilotlari' : 'Детали возврата'}</h1>
                        
                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{language === 'uz' ? 'Qaysi mahsulotlarni qaytarmoqchisiz?' : 'Какие товары хотите вернуть?'}</label>
                                <div className="space-y-3">
                                    {selectedOrder.items.map((item: any, i: number) => {
                                        const isSelected = selectedItems.find(si => si.id === item.id);
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    if (isSelected) setSelectedItems(selectedItems.filter(si => si.id !== item.id));
                                                    else setSelectedItems([...selectedItems, item]);
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'border-black bg-gray-50' : 'border-gray-50 hover:border-gray-200'}`}
                                            >
                                                <div className="font-bold text-sm tracking-tighter italic uppercase">{item.name}</div>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${isSelected ? 'bg-black border-black text-white' : 'border-gray-100'}`}>
                                                    {isSelected && <CheckCircle2 size={12} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{language === 'uz' ? 'Qaytarish sababi' : 'Причина возврата'}</label>
                                <textarea 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={language === 'uz' ? 'Mahsulot kutilganidek emas, nuqsoni bor va h.k.' : 'Товар не соответствует, есть дефекты и т.д.'}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-6 text-sm font-medium outline-none transition-all h-32 resize-none"
                                />
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={submitting || selectedItems.length === 0 || !reason.trim()}
                                className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                                {language === 'uz' ? 'TASDIQLASH' : 'ПОДТВЕРДИТЬ'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function WalletView({ user, t, language, onBack }: any) {
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWallet = async () => {
            const { data: wData } = await supabase
                .from("user_wallets")
                .select("*")
                .eq("user_phone", user.phone)
                .single();
            
            const { data: tData } = await supabase
                .from("cashback_transactions")
                .select("*")
                .eq("user_phone", user.phone)
                .order("created_at", { ascending: false });

            if (wData) setWallet(wData);
            if (tData) setTransactions(tData);

            // Fetch Pending details
            const { data: pOrders } = await supabase
                .from("orders")
                .select("id, potential_cashback, items")
                .eq("user_phone", user.phone)
                .neq("status", "delivered")
                .neq("status", "cancelled")
                .neq("status", "returned")
                .gt("potential_cashback", 0);
            
            setPendingOrders(pOrders || []);
            setLoading(false);
        };
        fetchWallet();
    }, [user]);

    const totalPending = pendingOrders.reduce((sum: number, o: any) => sum + Number(o.potential_cashback), 0);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#F2F3F5]"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
            <div className="max-w-xl mx-auto pt-10">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8 hover:text-black transition-all">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Profil'}
                </button>

                {/* Main Card */}
                <div className="bg-black text-white p-10 rounded-[50px] shadow-2xl relative overflow-hidden mb-10">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <Wallet size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1 italic">Tizim hamyoni</p>
                                <h2 className="text-xl font-bold tracking-tighter sm:truncate">{wallet?.wallet_number.replace(/(.{4})/g, '$1 ')}</h2>
                            </div>
                            <div className="px-4 py-2 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">
                                Active
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1 italic">Mavjud balans</p>
                             <p className="text-5xl font-black italic tracking-tighter">
                                {Number(wallet?.balance || 0).toLocaleString()} <span className="text-2xl not-italic opacity-60">so'm</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Processing/Pending Cashback Section */}
                {totalPending > 0 && (
                    <div className="bg-orange-50/50 p-6 rounded-[32px] border border-orange-100 mb-10 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <Loader2 size={18} className="animate-spin" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black italic tracking-tighter uppercase text-orange-600">Ishlanmoqda...</h4>
                                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">{language === 'uz' ? 'Kutilayotgan cashback' : 'Ожидаемый кэшбэк'}</p>
                                </div>
                            </div>
                            <p className="text-xl font-black italic tracking-tighter text-orange-600">
                                +{totalPending.toLocaleString()} so'm
                            </p>
                        </div>
                        <div className="p-3 bg-white/50 rounded-2xl border border-orange-100/50">
                            <p className="text-[9px] font-bold text-orange-700/70 leading-relaxed italic">
                                ✨ {language === 'uz' 
                                    ? "Ushbu summa buyurtma yetkazib berilgach avtomatik ravishda asosiy hamyonga tushadi." 
                                    : "Эта сумма автоматически поступит в основной кошелек после доставки заказа."}
                            </p>
                        </div>
                    </div>
                )}

                {/* History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed flex items-center gap-2">
                             <HistoryIcon size={14} /> {language === 'uz' ? 'OPERTASIYALAR TARIXI' : 'ИСТОРИЯ ОПЕРАЦИЙ'}
                        </h3>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="bg-white p-12 rounded-[40px] text-center italic font-bold text-gray-300">
                             {language === 'uz' ? 'Hozircha operatsiyalar mavjud emas' : 'Операций пока нет'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map(t => (
                                <div key={t.id} className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`p-4 rounded-2xl shrink-0 ${t.amount >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                            {t.amount >= 0 ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black italic uppercase tracking-tight truncate">
                                                {t.description || (t.amount >= 0 ? (language === 'uz' ? 'Hisob toldirildi' : 'Пополнение') : (language === 'uz' ? 'Hisobdan yechildi' : 'Списание'))}
                                            </p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight italic">
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black italic tracking-tighter ${t.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.amount >= 0 ? '+' : ''}{Number(t.amount).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PromoCodesView({ t, language, onBack }: any) {
    const [promos, setPromos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPromos = async () => {
            const { data } = await supabase
                .from("promo_codes")
                .select("*")
                .eq("active", true)
                .order("created_at", { ascending: false });
            
            if (data) {
                // Filter expired ones on client side for extra safety
                const now = new Date().getTime();
                const filtered = data.filter(p => !p.expires_at || new Date(p.expires_at).getTime() > now);
                setPromos(filtered);
            }
            setLoading(false);
        };
        fetchPromos();
    }, []);

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
            <div className="max-w-xl mx-auto pt-10">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8 hover:text-black transition-all">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>

                <div className="space-y-6">
                    <h1 className="text-3xl font-black tracking-tighter italic uppercase">{t.account.sections.promoCodes}</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        {language === 'uz' ? 'Xaridlar uchun maxsus chegirmali kodlarimizdan foydalaning.' : 'Используйте наши специальные скидочные коды для покупок.'}
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-black" /></div>
                    ) : promos.length === 0 ? (
                        <div className="bg-white p-12 rounded-[40px] text-center border border-gray-100 italic font-bold text-gray-400">
                            {language === 'uz' ? 'Hozircha faol promo kodlar yo\'q.' : 'Пока нет активных промокодов.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {promos.map(promo => (
                                <div key={promo.id} className="bg-white p-8 rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center text-center relative overflow-hidden group">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-[#F2F3F5] rounded-b-full border-x border-b border-gray-100"></div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-[#F2F3F5] rounded-t-full border-x border-t border-gray-100"></div>
                                    
                                    <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-[28px] flex items-center justify-center mb-6">
                                        <Tag size={32} />
                                    </div>

                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-2 group-hover:scale-110 transition-transform">{promo.code}</h3>
                                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-6">
                                        {promo.discount_type === 'percent' ? `${promo.discount_value}% Chegirma` : `${promo.discount_value.toLocaleString()} so'm Chegirma`}
                                    </p>

                                    <div className="w-full pt-6 border-t border-gray-50 flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">{language === 'uz' ? 'Minimal buyurtma' : 'Мин. заказ'}</p>
                                            <p className="text-xs font-black italic">{promo.min_order_amount.toLocaleString()} so'm</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">{language === 'uz' ? 'Muddati' : 'Срок'}</p>
                                            <p className="text-xs font-black italic text-purple-500 uppercase">{promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Cheksiz'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MenuItem({ href, icon, label, divider = true, onClick, variant = "default" }: any) {
    const Content = (
        <div className={`flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group`}>
            <div className="flex items-center gap-4">
                <div className={`text-gray-400 group-hover:text-black transition-colors ${variant === 'danger' ? 'group-hover:text-red-500' : ''}`}>
                    {icon}
                </div>
                <span className={`text-sm font-bold tracking-tight text-gray-700 group-hover:text-black transition-colors ${variant === 'danger' ? 'group-hover:text-red-500' : ''}`}>
                    {label}
                </span>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-black transition-colors" />
        </div>
    );

    return (
        <>
            {href && href !== "#" ? (
                <Link href={href}>{Content}</Link>
            ) : (
                <div onClick={onClick}>{Content}</div>
            )}
            {divider && <div className="mx-6 border-b border-gray-50" />}
        </>
    );
}
