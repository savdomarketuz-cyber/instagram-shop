"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import { 
    ChevronRight, 
    Package, 
    RotateCcw, 
    Ticket, 
    Star, 
    Heart, 
    Globe, 
    Layers, 
    User, 
    MessageSquare, 
    Headset, 
    LogOut, 
    Loader2, 
    ChevronLeft,
    Save,
    CheckCircle2,
    Settings,
    Tag,
    Wallet,
    HelpCircle,
    Info,
    Camera,
    X,
    Video,
    Play,
    Check,
    Sparkles,
    Users,
    Share2,
    ExternalLink,
    TrendingUp,
    Award,
    ShieldCheck,
    Banknote,
    History,
    KeyRound,
    LayoutGrid,
    Link as LinkIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { mapUser, mapComment } from "@/lib/mappers";
import Image from "next/image";
import { uploadToYandexS3 } from "@/lib/yandex-s3";
import { PinKeypad } from "@/components/PinKeypad";

export default function AccountPage() {
    const router = useRouter();
    const { user, setUser, logout, language, setLanguage, showToast } = useStore();
    const t = translations[language];

    const [view, setView] = useState<"menu" | "edit-profile" | "language" | "returns" | "promo-codes" | "reviews" | "affiliate">("menu");
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [password, setPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [realBalance, setRealBalance] = useState(0);
    const [affiliateCode, setAffiliateCode] = useState("");
    const [pendingCashback, setPendingCashback] = useState(0);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchUserData = async () => {
            const myPhoneClean = user.phone.replace(/\D/g, '');
            
            try {
                const [userRes, walletRes, cashbackRes] = await Promise.all([
                    supabase.from("users").select("*").eq("phone", user.phone).single(),
                    supabase.from("user_wallets").select("balance").eq("phone", myPhoneClean).single(),
                    supabase.from("orders").select("potential_cashback").eq("user_phone", user.phone).neq("status", "Yetkazildi").neq("status", "Bekor qilingan").gt("potential_cashback", 0)
                ]);

                if (userRes.data) {
                    const mappedUser = mapUser(userRes.data);
                    setName(mappedUser.name || "");
                    setUsername(mappedUser.username || "");
                    setAffiliateCode(userRes.data.affiliate_code || "");
                    setRealBalance(userRes.data.real_balance || 0);
                    setUser({ ...user, ...mappedUser });
                }

                if (walletRes.data) setBalance(walletRes.data.balance);

                if (cashbackRes.data) {
                    const total = cashbackRes.data.reduce((sum, o) => sum + Number(o.potential_cashback), 0);
                    setPendingCashback(total);
                }
            } catch (e) {
                console.error("Error fetching account data:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user?.phone, setUser]);

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
            const response = await fetch('/api/auth/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: user.phone, 
                    password,
                    name, 
                    username: trimmedUsername 
                })
            });

            const data = await response.json();
            if (!response.ok) {
                if (data.message === "Ushbu username band.") setUsernameError(language === 'uz' ? "Username band" : "Занято");
                else throw new Error(data.message);
                return;
            }

            setUser({ ...user, name, username: trimmedUsername });
            setPassword("");
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setView("menu");
            }, 1500);
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Xatolik yuz berdi", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#F2F3F5] p-6 pb-32">
            <div className="max-w-xl mx-auto space-y-8 animate-pulse">
                {/* Header Skeleton */}
                <div className="pt-10">
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-6 bg-gray-200 rounded-full w-32"></div>
                            <div className="h-3 bg-gray-100 rounded-full w-24"></div>
                        </div>
                    </div>
                </div>

                {/* Balance Skeleton */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
                        <div className="space-y-2">
                            <div className="h-5 bg-gray-200 rounded-full w-28"></div>
                            <div className="h-3 bg-gray-100 rounded-full w-20"></div>
                        </div>
                    </div>
                </div>

                {/* Menu Skeletons */}
                {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-3">
                        <div className="h-3 bg-gray-200 rounded-full w-20 ml-6"></div>
                        <div className="bg-white rounded-[32px] h-32 border border-gray-100"></div>
                    </div>
                ))}
            </div>
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
                    <button onClick={() => setView("menu")} className="flex items-center gap-2 text-gray-400 font-bold mb-8 hover:text-black transition-colors">
                        <ChevronLeft size={20} />
                        {language === 'uz' ? 'Orqaga' : 'Назад'}
                    </button>
                    
                    <h1 className="text-3xl font-black tracking-tighter mb-10 italic uppercase">{(t.account as any).myInfo}</h1>
                    
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

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-2 block">{language === 'uz' ? 'Tasdiqlash uchun parolingiz' : 'Пароль для подтверждения'}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl px-6 py-4 font-bold outline-none transition-all"
                            />
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
                    <button onClick={() => setView("menu")} className="flex items-center gap-2 text-gray-400 font-bold mb-8 transition-colors">
                        <ChevronLeft size={20} />
                        {language === 'uz' ? 'Orqaga' : 'Назад'}
                    </button>
                    <h1 className="text-3xl font-black tracking-tighter mb-10 italic uppercase">{(t.account.sections as any).language}</h1>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => { 
                                setLanguage("uz"); 
                                router.push("/uz/account");
                                setView("menu"); 
                            }}
                            className={`w-full p-6 bg-white rounded-3xl flex items-center justify-between font-black italic tracking-tighter text-xl ${language === 'uz' ? 'ring-2 ring-black' : ''}`}
                        >
                            O'zbekcha {language === 'uz' && <CheckCircle2 size={24} />}
                        </button>
                        <button 
                            onClick={() => { 
                                setLanguage("ru"); 
                                router.push("/ru/account");
                                setView("menu"); 
                            }}
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

    if (view === "reviews") {
        return <ReviewsView user={user} language={language} t={t} showToast={showToast} onBack={() => setView("menu")} />;
    }

    if (view === "affiliate") {
        return <AffiliateView user={user} language={language} t={t} showToast={showToast} onBack={() => setView("menu")} />;
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
                                    {(t.account as any).myInfo} <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                        <Link href={`/${language}/messages`} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all">
                            <MessageSquare size={20} />
                        </Link>
                    </div>
                </div>

                {/* 2. Balance Card (Bonus Balansi) */}
                <div className="mb-8">
                    <Link href={`/${language}/wallet`} className="block bg-white p-6 rounded-[32px] shadow-sm border border-gray-100/50 hover:scale-[1.02] active:scale-95 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-xl">
                                    <Wallet size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-black italic tracking-tighter">{(balance || 0).toLocaleString()} so'm</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Bonus balansi' : 'Бонусный баланс'}</p>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-300" size={20} />
                        </div>
                    </Link>
                </div>

                {/* 3. Sections Mapping */}
                <div className="space-y-8">
                    {/* Shopping */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.shopping}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem href="/orders" icon={<Package size={20} />} label={t.account.orders} language={language} />
                            <MenuItem onClick={() => setView("returns")} icon={<RotateCcw size={20} />} label={t.account.sections.returns} divider={false} language={language} />
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.benefits}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem onClick={() => setView("promo-codes")} icon={<Ticket size={20} />} label={t.account.sections.promoCodes} language={language} />
                            <MenuItem onClick={() => setView("affiliate")} icon={<Sparkles size={20} />} label={language === 'uz' ? 'Hamkorlik (Pul ishlash)' : 'Партнерство (Заработок)'} divider={false} language={language} />
                        </div>
                    </div>

                    {/* Marketplace */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{language === 'uz' ? 'Mening Bozorim' : 'Мой Маркет'}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem onClick={() => setView("reviews")} icon={<Star size={20} />} label={t.account.sections.reviews} language={language} />
                            <MenuItem href="/wishlist" icon={<Heart size={20} />} label={t.nav.wishlist} language={language} />
                            <MenuItem onClick={() => setView("language")} icon={<Globe size={20} />} label={(t.account.sections as any).language} divider={false} language={language} />
                        </div>
                    </div>

                    {/* Others */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{t.account.sections.others}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100/50">
                            <MenuItem href="/messages" icon={<MessageSquare size={20} />} label={language === 'uz' ? 'Suhbatlar' : 'Беседы'} language={language} />
                            <MenuItem href="/chat" icon={<Headset size={20} />} label={t.account.sections.support} language={language} />
                            <MenuItem onClick={logout} icon={<LogOut size={20} />} label={t.account.logout} variant="danger" divider={false} language={language} />
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                    Velari v1.2.5
                </div>

            </div>
        </div>
    );
}

function ReviewsView({ user, language, showToast, onBack }: any) {
    const [orders, setOrders] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Review states
    const [reviewProduct, setReviewProduct] = useState<any>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [reviewVideo, setReviewVideo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchReviewsData();
    }, [user.phone, user.id]);

    const fetchReviewsData = async () => {
        if (!user) return;
        setLoading(true);
        const myId = user.id || user.phone;
        
        // 1. Fetch all orders (delivered)
        const { data: oData } = await supabase
            .from("orders")
            .select("*")
            .eq("user_phone", user.phone)
            .in("status", ["Yetkazildi", "Доставлено", "yetkazib berildi ✅"])
            .order("created_at", { ascending: false });
        
        // 2. Fetch all user comments
        const { data: cData } = await supabase
            .from("comments")
            .select("*, products(*)")
            .or(`user_id.eq.${myId},user_phone.eq.${user.phone}`)
            .order("created_at", { ascending: false });

        if (oData) setOrders(oData);
        if (cData) setComments(cData);
        setLoading(false);
    };

    const handleSubmitReview = async () => {
        if (!user || !reviewProduct || !reviewText.trim()) return;
        if (!user.username) {
            showToast(language === 'uz' ? "Username kiritilmagan!" : "Имя пользователя не введено!", 'info');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'insert',
                    p_user_phone: user.phone || user.id,
                    p_comment_data: {
                        product_id: reviewProduct.id,
                        username: user.username,
                        text: reviewText,
                        rating: reviewRating,
                        type: 'review',
                        data: {
                            images: reviewImages,
                            video: reviewVideo
                        }
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Xatolik yuz berdi");

            showToast(language === 'uz' ? "Muvaffaqiyatli saqlandi!" : "Успешно сохранено!", 'success');
            setReviewProduct(null);
            setReviewText("");
            setReviewRating(5);
            setReviewImages([]);
            setReviewVideo("");
            fetchReviewsData(); // Refresh list
        } catch (e: any) {
            console.error(e);
            showToast(e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Extract products that need reviews
    const commentedProductIds = new Set(comments.map(c => c.product_id));
    const pendingProducts: any[] = [];
    orders.forEach(order => {
        order.items.forEach((item: any) => {
            if (!commentedProductIds.has(item.id)) {
                if (!pendingProducts.find(p => p.id === item.id)) {
                    pendingProducts.push(item);
                }
            }
        });
    });

    if (loading) return <div className="min-h-screen bg-[#F2F3F5] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10">
            <div className="max-w-xl mx-auto pt-10">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8 hover:text-black transition-all">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>

                <div className="space-y-10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter italic uppercase">{language === 'uz' ? 'Sharhlar va savollar' : 'Отзывы и вопросы'}</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">{language === 'uz' ? 'Sizning fikringiz biz uchun muhim' : 'Ваше мнение важно для нас'}</p>
                    </div>

                    {/* Pending Reviews */}
                    {pendingProducts.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                {language === 'uz' ? 'Baholashni kutyapti' : 'Ожидают оценки'}
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {pendingProducts.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => setReviewProduct(p)}
                                        className="bg-white p-4 rounded-3xl flex items-center gap-4 border border-emerald-100 shadow-xl shadow-emerald-500/5 group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover" alt={p.name} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black italic uppercase truncate">{p.name}</p>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">{language === 'uz' ? 'Mahsulotni baholang' : 'Оцените товар'}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                            <Star size={18} fill="currentColor" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Reviews & Answers */}
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">{language === 'uz' ? 'Mening sharhlarim' : 'Мои отзывы'}</h2>
                        {comments.length === 0 ? (
                            <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-gray-100 opacity-50 italic font-medium text-gray-400">
                                {language === 'uz' ? 'Hozircha sharhlar yo\'q' : 'Пока нет отзывов'}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {comments.map(c => (
                                    <div key={c.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 overflow-hidden"><img src={c.products?.image} className="w-full h-full object-cover" alt="" /></div>
                                            <Link href={`/${language}/products/${c.product_id}`} className="text-[10px] font-black italic uppercase truncate hover:text-blue-500">{c.products?.name_uz || c.products?.name}</Link>
                                        </div>
                                        <div className="flex items-center gap-1 text-yellow-400 mb-2">
                                            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < c.rating ? "currentColor" : "none"} />)}
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4">{c.content || c.text}</p>
                                        
                                        {/* Media in Comment */}
                                        {c.data?.images && c.data.images.length > 0 && (
                                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                                                {c.data.images.map((img: string, i: number) => (
                                                    <div key={i} className="w-20 h-24 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                                        <Image src={img} width={80} height={100} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Reply from Admin */}
                                        {c.reply && (
                                            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-black mt-4 ml-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-4 h-4 bg-black rounded flex items-center justify-center text-[8px] text-white font-black italic">V</div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest">VELARI ADMIN</span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-600 leading-relaxed italic">{c.reply}</p>
                                            </div>
                                        )}

                                        <div className="mt-4 flex justify-between items-center opacity-40 text-[8px] font-black uppercase tracking-widest">
                                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                            {c.is_approved ? <span className="text-green-600">Tasdiqlangan</span> : <span className="italic">Moderatsiyada</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {reviewProduct && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-500">
                        <div className="p-8 pb-4 flex justify-between items-center">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Baholash' : 'Оценка'}</h3>
                            <button onClick={() => setReviewProduct(null)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center"><X size={20} /></button>
                        </div>
                        <div className="px-8 pb-10 space-y-6 overflow-y-auto no-scrollbar">
                           <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl">
                               <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0"><img src={reviewProduct.image} className="w-full h-full object-cover" /></div>
                               <p className="text-[10px] font-black uppercase italic truncate">{reviewProduct.name}</p>
                           </div>

                           <div className="flex justify-center gap-2">
                               {[1,2,3,4,5].map(star => (
                                   <button key={star} onClick={() => setReviewRating(star)} className="p-1 transition-transform active:scale-90">
                                       <Star size={36} fill={reviewRating >= star ? "#EAB308" : "none"} className={reviewRating >= star ? "text-yellow-500" : "text-gray-200"} />
                                   </button>
                               ))}
                           </div>

                           <textarea 
                                value={reviewText}
                                onChange={e => setReviewText(e.target.value)}
                                placeholder={language === 'uz' ? "Fikringiz..." : "Ваш отзыв..."}
                                className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-bold h-32 resize-none outline-none focus:ring-2 focus:ring-black transition-all"
                           />

                           {/* Media Upload */}
                            <div className="flex gap-2">
                               <label className="flex-1 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-100 hover:border-gray-300">
                                   <input 
                                        type="file" accept="image/*" className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setIsUploading(true);
                                                try {
                                                    const { url } = await uploadToYandexS3(file);
                                                    setReviewImages([...reviewImages, url]);
                                                } finally { setIsUploading(false); }
                                            }
                                        }} 
                                   />
                                   <Camera size={20} className="text-gray-400" />
                               </label>
                               <label className="flex-1 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-100 hover:border-gray-300">
                                   <input 
                                        type="file" accept="video/*" className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setIsUploading(true);
                                                try {
                                                    const { url } = await uploadToYandexS3(file);
                                                    setReviewVideo(url);
                                                } finally { setIsUploading(false); }
                                            }
                                        }}
                                   />
                                   <Video size={20} className="text-gray-400" />
                               </label>
                            </div>


                           {/* Media Preview */}
                           {(reviewImages.length > 0 || reviewVideo) && (
                               <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                   {reviewImages.map((img, i) => (
                                       <div key={i} className="w-14 h-14 rounded-xl overflow-hidden relative group">
                                           <img src={img} className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer" onClick={() => setReviewImages(reviewImages.filter((_, idx) => idx !== i))}>
                                               <X size={12} className="text-white" />
                                           </div>
                                       </div>
                                   ))}
                                   {reviewVideo && (
                                       <div className="w-14 h-14 bg-black rounded-xl overflow-hidden relative group">
                                           <video src={reviewVideo} className="w-full h-full object-cover opacity-60" />
                                           <div className="absolute inset-0 flex items-center justify-center"><Play size={14} className="text-white" /></div>
                                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer" onClick={() => setReviewVideo("")}>
                                               <X size={12} className="text-white" />
                                           </div>
                                       </div>
                                   )}
                               </div>
                           )}

                           <button 
                                onClick={handleSubmitReview}
                                disabled={isSubmitting || isUploading || !reviewText.trim()}
                                className="w-full py-5 bg-black text-white rounded-[28px] font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                           >
                               {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> {language === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}</>}
                           </button>
                        </div>
                    </div>
                </div>
            )}
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
            const { data } = await supabase
                .from("orders")
                .select("*")
                .eq("user_phone", user.phone)
                .eq("status", "Yetkazildi")
                .order("created_at", { ascending: false });

            if (data) {
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
            const response = await fetch('/api/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: selectedOrder.id,
                    user_phone: user.phone,
                    items: selectedItems,
                    reason: reason.trim()
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Xatolik");

            setSuccess(true);
            setTimeout(() => onBack(), 2000);
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
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
                                <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-medium h-32 resize-none" />
                            </div>
                            <button onClick={handleSubmit} disabled={submitting || selectedItems.length === 0 || !reason.trim()} className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 disabled:opacity-20 transition-all">TASDIQLASH</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PromoCodesView({ t, language, onBack }: any) {
    const [promos, setPromos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPromos = async () => {
            const { data } = await supabase.from("promo_codes").select("*").eq("active", true).order("created_at", { ascending: false });
            if (data) setPromos(data.filter(p => !p.expires_at || new Date(p.expires_at).getTime() > new Date().getTime()));
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
                    <div className="grid grid-cols-1 gap-4">
                        {promos.map(p => (
                            <div key={p.id} className="bg-white p-8 rounded-[40px] border-2 border-dashed border-gray-100 text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-[#F2F3F5] rounded-b-full border-x border-b border-gray-100" />
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-[#F2F3F5] rounded-t-full border-x border-t border-gray-100" />
                                <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-2 group-hover:scale-110 transition-transform">{p.code}</h3>
                                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value.toLocaleString()} so'm`} Chegirma</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AffiliateView({ user, language, showToast, onBack }: any) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [step, setStep] = useState<"pin" | "contract" | "dashboard">("pin");
    const [pinError, setPinError] = useState("");
    
    // Modal states
    const [showAddMember, setShowAddMember] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    
    // Form states
    const [memberPhone, setMemberPhone] = useState("");
    const [vCode, setVCode] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Recovery states
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState<"password" | "telegram" | "new_pin">("password");
    const [recoveryPassword, setRecoveryPassword] = useState("");
    const [recoveryTelegramCode, setRecoveryTelegramCode] = useState("");
    const [recoveryNewPin, setRecoveryNewPin] = useState("");
    const [recoveryError, setRecoveryError] = useState("");

    // NEW Affiliate states
    const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "promos" | "links">("dashboard");
    const [affProducts, setAffProducts] = useState<any[]>([]);
    const [affTariffs, setAffTariffs] = useState<any[]>([]);
    const [myPromoCodes, setMyPromoCodes] = useState<any[]>([]);
    const [myReferralLinks, setMyReferralLinks] = useState<any[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [showCreatePromo, setShowCreatePromo] = useState(false);
    const [selectedTariff, setSelectedTariff] = useState<any>(null);
    const [customPromoCode, setCustomPromoCode] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/affiliate/user");
            const d = await res.json();
            if (d.success) {
                setData(d);
                if (!d.user.hasPin) setStep("pin");
                else if (!d.user.affiliate_agreed) setStep("contract");
                else if (authorized) setStep("dashboard");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePinComplete = async (pin: string) => {
        setPinError("");
        const action = data?.user?.hasPin ? "verify_pin" : "set_pin";
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, pin })
            });
            const d = await res.json();
            if (d.success) {
                setAuthorized(true);
                if (!data?.user?.affiliate_agreed) setStep("contract");
                else setStep("dashboard");
                if (action === "set_pin") fetchData(); // Refresh to update hasPin
            } else {
                setPinError(d.error);
            }
        } catch (e) {
            setPinError("Xatolik yuz berdi");
        }
    };

    const handleAgree = async () => {
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "agree_contract" })
            });
            const d = await res.json();
            if (d.success) {
                setStep("dashboard");
                fetchData();
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const [codeSent, setCodeSent] = useState(false);

    const handleSendMemberCode = async () => {
        if (!memberPhone) return;
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request_member_verification", memberPhone })
            });
            const d = await res.json();
            if (d.success) {
                setCodeSent(true);
                showToast(language === 'uz' ? "Kod Telegram'ga yuborildi!" : "Код отправлен в Telegram!", "success");
            } else {
                showToast(d.error, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!memberPhone || !vCode) return;
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "add_team_member", memberPhone, verificationCode: vCode })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "A'zo qo'shildi!" : "Участник добавлен!", "success");
                setShowAddMember(false);
                setCodeSent(false);
                setMemberPhone("");
                setVCode("");
                fetchData();
            } else {
                showToast(d.error, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleTransfer = async () => {
        const amount = Number(transferAmount);
        if (!amount || amount <= 0) return;
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "transfer_to_cashback", amount })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "O'tkazildi!" : "Переведено!", "success");
                setShowTransfer(false);
                fetchData();
            } else {
                showToast(d.error, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleWithdraw = async () => {
        const amount = Number(withdrawAmount);
        if (!amount || !cardNumber) return;
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "withdraw", amount, card_number: cardNumber })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "So'rov yuborildi!" : "Запрос отправлен!", "success");
                setShowWithdraw(false);
                fetchData();
            } else {
                showToast(d.error, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleVerifyPassword = async () => {
        setIsActionLoading(true);
        setRecoveryError("");
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify_password", password: recoveryPassword })
            });
            const d = await res.json();
            if (d.success) setRecoveryStep("new_pin");
            else setRecoveryError(d.error);
        } catch (e) {
            setRecoveryError("Xatolik");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSetNewPinDirectly = async (pin: string) => {
        setIsActionLoading(true);
        setRecoveryError("");
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    action: "reset_pin_with_auth", 
                    newPin: pin 
                })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "PIN yangilandi!" : "PIN обновлен!", "success");
                setShowRecovery(false);
                fetchData();
            } else {
                setRecoveryError(d.error);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRequestTelegramCode = async () => {
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request_telegram_reset" })
            });
            const d = await res.json();
            if (d.success) {
                setRecoveryStep("telegram");
                showToast(language === 'uz' ? "Kod yuborildi!" : "Код отправлен!", "success");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleVerifyTelegramAndReset = async () => {
        if (recoveryNewPin.length !== 4) return;
        setIsActionLoading(true);
        setRecoveryError("");
        try {
            const res = await fetch("/api/affiliate/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    action: "verify_telegram_reset", 
                    code: recoveryTelegramCode, 
                    newPin: recoveryNewPin 
                })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "PIN yangilandi!" : "PIN обновлен!", "success");
                setShowRecovery(false);
                fetchData();
            } else {
                setRecoveryError(d.error);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchAffiliateData = async () => {
        setIsDataLoading(true);
        try {
            if (activeTab === "products") {
                const res = await fetch("/api/affiliate/products");
                const d = await res.json();
                if (d.success) setAffProducts(d.products);
            } else if (activeTab === "promos") {
                const res = await fetch("/api/affiliate/promo-codes");
                const d = await res.json();
                if (d.success) {
                    setAffTariffs(d.tariffs);
                    setMyPromoCodes(d.myCodes);
                }
            } else if (activeTab === "links") {
                const res = await fetch("/api/affiliate/links");
                const d = await res.json();
                if (d.success) setMyReferralLinks(d.data);
            }
        } finally {
            setIsDataLoading(false);
        }
    };

    useEffect(() => {
        if (authorized && activeTab !== "dashboard") {
            fetchAffiliateData();
        }
    }, [activeTab, authorized]);

    const handleCreateLink = async (productId: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "Referal link yaratildi!" : "Реферальная ссылка создана!", "success");
                setActiveTab("links");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCreatePromo = async () => {
        if (!selectedTariff || !customPromoCode) return;
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/affiliate/promo-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tariffId: selectedTariff.id, customCode: customPromoCode })
            });
            const d = await res.json();
            if (d.success) {
                showToast(language === 'uz' ? "Promo-kod yaratildi!" : "Промо-код создан!", "success");
                setShowCreatePromo(false);
                fetchAffiliateData();
            } else {
                showToast(d.error, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast(language === 'uz' ? "Nusxa olindi!" : "Скопировано!", "success");
    };

    if (loading) return <div className="min-h-screen bg-[#F2F3F5] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!authorized && data?.user?.hasPin) {
        return (
            <div className="bg-[#F2F3F5] min-h-screen p-4">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>
                <PinKeypad 
                    onComplete={handlePinComplete} 
                    onForgotPin={() => {
                        setShowRecovery(true);
                        setRecoveryStep("password");
                        setRecoveryError("");
                    }}
                    title={language === 'uz' ? "PIN-kodni kiriting" : "Введите PIN-код"} 
                    error={pinError} 
                />
            </div>
        );
    }

    if (!data?.user?.hasPin) {
        return (
            <div className="bg-[#F2F3F5] min-h-screen p-4">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-8">
                    <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                </button>
                <PinKeypad onComplete={handlePinComplete} title={language === 'uz' ? "PIN-kod o'rnating" : "Установите PIN-код"} error={pinError} />
            </div>
        );
    }

    if (step === "contract") {
        return (
            <div className="bg-[#F2F3F5] min-h-screen p-6 flex flex-col items-center justify-center">
                <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl space-y-8">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto">
                        <ShieldCheck className="text-emerald-500" size={40} />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Hamkorlik Shartnomasi' : 'Партнерское Соглашение'}</h2>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Tizimga qo'shilishdan oldin tanishib chiqing</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-4 bg-gray-50 rounded-2xl text-[10px] text-gray-500 leading-relaxed font-bold italic border border-gray-100">
                        {language === 'uz' ? (
                            <>
                                1. Hamkorlik tizimi orqali real daromad olishingiz mumkin.<br/>
                                2. Har bir sotuvdan mahsulotga belgilangan foiz beriladi.<br/>
                                3. Firibgarlik (o'ziga-o'zi sotish) qat'iyan taqiqlanadi.<br/>
                                4. Mablag'lar mahsulot yetkazilgandan 14 kundan keyin yechishga ruxsat beriladi.<br/>
                                5. Adminlar shubhali hisoblarni bloklash huquqiga ega.
                            </>
                        ) : (
                            <>
                                1. Вы можете получать реальный доход через партнерскую систему.<br/>
                                2. С каждой продажи выплачивается установленный процент.<br/>
                                3. Фрод (покупка у самого себя) строго запрещен.<br/>
                                4. Вывод средств возможен через 14 дней после доставки товара.<br/>
                                5. Админы имеют право блокировать подозрительные аккаунты.
                            </>
                        )}
                    </div>
                    <button 
                        onClick={handleAgree}
                        disabled={isActionLoading}
                        className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-black/20"
                    >
                        {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? 'TANISHIB CHIQDIM VA ROZIMAN' : 'Я ОЗНАКОМЛЕН И СОГЛАСЕН')}
                    </button>
                </div>
            </div>
        );
    }

    let roleName = language === 'uz' ? "A'zo" : 'Участник';
    const currentRole = data?.user?.affiliate_role;
    if (currentRole === 'top_manager') roleName = language === 'uz' ? 'Top Menejer' : 'Топ Менеджер';
    else if (currentRole === 'top_sales_manager') roleName = language === 'uz' ? 'Top Sotuv Menejeri' : 'Топ Менеджер Продаж';
    else if (currentRole === 'sales_manager') roleName = language === 'uz' ? 'Sotuv Menejeri' : 'Менеджер Продаж';
    else if (currentRole === 'agent') roleName = language === 'uz' ? 'Agent' : 'Агент';

    return (
        <div className="bg-[#F2F3F5] min-h-screen pb-24 px-4 md:px-10 overflow-x-hidden">
            <div className="max-w-4xl mx-auto pt-10">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-black transition-all">
                        <ChevronLeft size={16} /> {language === 'uz' ? 'Orqaga' : 'Назад'}
                    </button>
                    <div className="flex items-center gap-2 bg-black text-white px-4 py-1.5 rounded-full scale-90">
                         <Award size={14} className="text-yellow-400" />
                         <span className="text-[10px] font-black uppercase italic tracking-tighter">{roleName}</span>
                    </div>
                </div>

                <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-[28px] border border-gray-100 mb-8 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'dashboard', label: language === 'uz' ? 'Asosiy' : 'Главная', icon: LayoutGrid },
                        { id: 'products', label: language === 'uz' ? 'Mahsulotlar' : 'Товары', icon: Package },
                        { id: 'promos', label: language === 'uz' ? 'Promo-kodlar' : 'Промо-коды', icon: Ticket },
                        { id: 'links', label: language === 'uz' ? 'Havolalar' : 'Ссылки', icon: LinkIcon }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white shadow-xl shadow-black/20' : 'text-gray-400 hover:text-black hover:bg-white'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Wallets */}
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-between min-h-[220px]">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                            <Banknote className="text-emerald-500" size={24} />
                                        </div>
                                        <button onClick={() => setShowWithdraw(true)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all">
                                            {language === 'uz' ? 'Yechish' : 'Вывод'}
                                        </button>
                                    </div>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mt-6 italic">Hamkorlik Hamyoni</h3>
                                    <p className="text-4xl font-black italic tracking-tighter text-black mt-1">{(data?.user?.real_balance || 0).toLocaleString()} <span className="text-sm">so'm</span></p>
                                </div>
                                <button 
                                    onClick={() => setShowTransfer(true)}
                                    className="w-full bg-gray-50 text-gray-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 group"
                                >
                                    <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                    {language === 'uz' ? "Cashback hamyonga o'tkazish" : "Перевод na кэшбэк"}
                                </button>
                            </div>

                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Oddiy Hamyon</h3>
                                    <p className="text-2xl font-black italic tracking-tighter text-black mt-1">{(data?.user?.wallet_balance || 0).toLocaleString()} <span className="text-xs">so'm</span></p>
                                </div>
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Wallet className="text-blue-500" size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Team & Stats */}
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Mening Jamoam' : 'Моя Команда'}</h3>
                                    {data?.user?.affiliate_role !== 'agent' && (
                                        <button onClick={() => setShowAddMember(true)} className="p-2 bg-black text-white rounded-xl hover:scale-110 transition-all">
                                            <Users size={18} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {data?.team?.length === 0 ? (
                                        <div className="py-8 text-center text-gray-300 font-bold italic text-xs">Jamoa a'zolari yo'q</div>
                                    ) : (
                                        data?.team?.map((m: any) => (
                                            <div key={m.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-xs text-black border border-gray-200">
                                                        {m.name?.[0] || m.phone?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black italic">{m.name || m.phone}</p>
                                                        <p className="text-[8px] font-bold uppercase text-gray-400 tracking-tighter">{m.affiliate_role}</p>
                                                    </div>
                                                </div>
                                                <div className="text-emerald-500">
                                                    <TrendingUp size={14} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {data?.team?.length > 0 && (
                                        <p className="text-[8px] text-center text-gray-400 font-bold uppercase mt-4">Maksimum: {data?.team?.length}/10 a'zo</p>
                                    )}
                                </div>
                            </div>

                            {/* Referral Code */}
                            <div className="bg-black p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                                    <Ticket size={80} />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{language === 'uz' ? 'Mening Kodim' : 'Мой Код'}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-black italic tracking-tighter">{data?.user?.affiliate_code || "KOD_YO'Q"}</span>
                                    <button onClick={() => copyToClipboard(data?.user?.affiliate_code)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                                        <Share2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {affProducts.map(p => (
                                <div key={p.id} className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100 group">
                                    <div className="relative h-48 overflow-hidden">
                                        <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase italic">
                                            {p.myCommission?.toLocaleString()} so'm foyda
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <h3 className="font-black italic tracking-tighter text-sm uppercase line-clamp-1">{language === 'uz' ? p.name_uz || p.name : p.name_ru || p.name}</h3>
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-black italic tracking-tighter">{p.price?.toLocaleString()} so'm</span>
                                            <button 
                                                onClick={() => handleCreateLink(p.id)}
                                                className="bg-black text-white p-3 rounded-2xl hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <LinkIcon size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'promos' && (
                    <div className="space-y-10">
                        {/* My Codes */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Mening Promo-kodlarim</h3>
                            {myPromoCodes.length === 0 ? (
                                <div className="bg-white p-12 rounded-[40px] text-center text-gray-300 font-bold italic text-sm border border-dashed border-gray-200">
                                    Hali promo-kodlar yaratilmagan
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myPromoCodes.map(c => (
                                        <div key={c.id} className="bg-white p-6 rounded-[32px] border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <p className="text-2xl font-black italic tracking-tighter text-black">{c.code}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.promo_code_tariffs?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-500">+{c.total_earned?.toLocaleString()} so'm</p>
                                                <p className="text-[8px] font-bold text-gray-300 uppercase">{c.usage_count} marta ishlatildi</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Available Tariffs */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Mavjud Tariflar</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {affTariffs.map(t => (
                                    <div key={t.id} className="bg-black p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden group">
                                        <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-150 transition-transform duration-1000">
                                            <Ticket size={160} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black italic tracking-tighter uppercase">{t.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                Minimal buyurtma: {t.min_order_value?.toLocaleString()} so'm
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-500 uppercase">Mijoz uchun chegirma</p>
                                                <p className="text-xl font-black italic">{t.discount_value}{t.type === 'percentage' ? '%' : ' so\'m'}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-emerald-500 uppercase">Sizning foydangiz</p>
                                                <p className="text-xl font-black italic text-emerald-400">
                                                    {t.affiliate_reward_type === 'fixed_per_use' ? `${t.affiliate_reward_value.toLocaleString()} so'm` : `${t.affiliate_reward_value}%`}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setSelectedTariff(t);
                                                setShowCreatePromo(true);
                                            }}
                                            className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all"
                                        >
                                            Kod yaratish
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'links' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100">
                            {myReferralLinks.length === 0 ? (
                                <div className="p-16 text-center text-gray-300 font-bold italic text-sm">Hali havolalar yaratilmagan</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Mahsulot</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Bosildi</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Ko'rildi</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Sotildi</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {myReferralLinks.map((l: any) => (
                                                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-6">
                                                        <p className="text-xs font-black italic uppercase">{l.products?.name}</p>
                                                        <p className="text-[8px] font-bold text-gray-400 font-mono">/{language}/ref/{l.slug}</p>
                                                    </td>
                                                    <td className="p-6 text-center font-black italic">{l.clicks}</td>
                                                    <td className="p-6 text-center font-black italic">{l.views}</td>
                                                    <td className="p-6 text-center font-black italic text-emerald-500">{l.conversions}</td>
                                                    <td className="p-6 text-right">
                                                        <button 
                                                            onClick={() => copyToClipboard(`${window.location.origin}/${language}/ref/${l.slug}`)}
                                                            className="p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"
                                                        >
                                                            <Share2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Transactions / History */}
                <div className="mt-10 space-y-6">
                    <div className="flex items-center gap-2 ml-4">
                        <History size={16} className="text-gray-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{language === 'uz' ? "So'nggi harakatlar" : 'Последние действия'}</h3>
                    </div>
                    <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100">
                        {data?.transactions?.length === 0 ? (
                            <div className="p-16 text-center text-gray-300 font-bold italic text-sm">Hali daromadlar yo'q</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Holat / Bosqich</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Summa</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Vaqt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data?.transactions?.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${t.status === 'released' ? 'bg-emerald-500' : t.status === 'approved' ? 'bg-blue-500' : t.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'} animate-pulse`} />
                                                        <div>
                                                            <p className="text-xs font-black italic tracking-tighter uppercase">{t.order_stage || 'Jarayonda'}</p>
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {t.status === 'released' ? 'Hamyonda' : t.status === 'approved' ? 'Muzlatilgan' : 'Kutilmoqda'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-sm font-black italic tracking-tighter">+{t.amount.toLocaleString()} so'm</p>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-[10px] text-gray-400 font-bold italic">{new Date(t.created_at).toLocaleDateString()}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => { setShowAddMember(false); setCodeSent(false); setMemberPhone(""); setVCode(""); }} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><X size={18} /></button>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? "A'zo Qo'shish" : 'Добавить Участника'}</h2>
                        <div className="space-y-4">
                            {/* Step 1: Phone + Send Code */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block">Telefon Raqam</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={memberPhone}
                                        onChange={e => { setMemberPhone(e.target.value); setCodeSent(false); setVCode(""); }}
                                        placeholder="+998"
                                        disabled={codeSent}
                                        className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-black transition-all disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleSendMemberCode}
                                        disabled={isActionLoading || !memberPhone || codeSent}
                                        className="shrink-0 bg-black text-white px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {isActionLoading && !codeSent ? <Loader2 size={16} className="animate-spin" /> : codeSent ? <Check size={16} /> : (language === 'uz' ? 'Kod' : 'Код')}
                                    </button>
                                </div>
                                {codeSent && (
                                    <p className="text-[10px] text-emerald-500 font-black uppercase ml-4 mt-2">
                                        ✓ {language === 'uz' ? "Kod Telegram'ga yuborildi" : "Код отправлен в Telegram"}
                                    </p>
                                )}
                            </div>

                            {/* Step 2: Enter Code (shown after code sent) */}
                            {codeSent && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block">Telegram Kod</label>
                                        <input
                                            type="text"
                                            value={vCode}
                                            onChange={e => setVCode(e.target.value)}
                                            placeholder="1234"
                                            maxLength={4}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black outline-none focus:ring-2 focus:ring-black transition-all text-center tracking-[1em] text-2xl"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddMember}
                                        disabled={isActionLoading || !vCode || vCode.length < 4}
                                        className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-black/10 disabled:opacity-40"
                                    >
                                        {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? "QO'SHISH" : 'ДОБАВИТЬ')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCreatePromo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowCreatePromo(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><X size={18} /></button>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Promo-kod yaratish</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase">Tanlangan Tarif</p>
                                <p className="text-sm font-black italic uppercase">{selectedTariff?.name}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block">Sizning kodingiz</label>
                                <input 
                                    type="text"
                                    value={customPromoCode}
                                    onChange={e => setCustomPromoCode(e.target.value)}
                                    placeholder="MASALAN: ALISHER20"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none focus:ring-2 focus:ring-black transition-all"
                                />
                            </div>
                            <button 
                                onClick={handleCreatePromo}
                                disabled={isActionLoading || !customPromoCode}
                                className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-black/10"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : 'YARATISH VA TASDIQLASH'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showTransfer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowTransfer(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><X size={18} /></button>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? "Ichki O'tkazma" : 'Внутренний Перевод'}</h2>
                        <p className="text-gray-400 text-xs font-bold italic">Sizning mablag'ingiz cashback hamyoniga o'tkaziladi va uni saytda ishlatishingiz mumkin bo'ladi.</p>
                        <div className="space-y-4">
                            <input 
                                type="number"
                                value={transferAmount}
                                onChange={e => setTransferAmount(e.target.value)}
                                placeholder={language === 'uz' ? "O'tkazish summasi" : "Сумма перевода"}
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black italic text-xl outline-none focus:ring-2 focus:ring-black transition-all"
                            />
                            <button 
                                onClick={handleTransfer}
                                disabled={isActionLoading || !transferAmount}
                                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-emerald-500/20"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? 'O\'TKAZISH' : 'ПЕРЕВЕСТИ')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWithdraw && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowWithdraw(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><X size={18} /></button>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Kartaga Yechish' : 'Вывод на Карту'}</h2>
                        <div className="space-y-4">
                            <input 
                                type="number"
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                placeholder={language === 'uz' ? "Summa (min: 50k)" : "Сумма (мин: 50к)"}
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-black transition-all"
                            />
                            <input 
                                type="text"
                                value={cardNumber}
                                onChange={e => setCardNumber(e.target.value)}
                                placeholder="8600 **** **** ****"
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-black transition-all"
                            />
                            <button 
                                onClick={handleWithdraw}
                                disabled={isActionLoading || !withdrawAmount || !cardNumber}
                                className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-black/20"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? 'Yuborish' : 'Отправить')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showRecovery && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowRecovery(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><X size={18} /></button>
                        
                        {recoveryStep === "password" && (
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'PIN Tiklash' : 'Восстановление PIN'}</h2>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Akaunt parolingizni kiriting</p>
                                </div>
                                <input 
                                    type="password"
                                    value={recoveryPassword}
                                    onChange={e => setRecoveryPassword(e.target.value)}
                                    placeholder="******"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-black transition-all"
                                />
                                {recoveryError && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{recoveryError}</p>}
                                <button 
                                    onClick={handleVerifyPassword}
                                    disabled={isActionLoading || !recoveryPassword}
                                    className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95"
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? 'DAVOM ETISH' : 'ПРОДОЛЖИТЬ')}
                                </button>
                                <button 
                                    onClick={handleRequestTelegramCode}
                                    className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-all"
                                >
                                    Parolni ham unutdim (Telegram)
                                </button>
                            </div>
                        )}

                        {recoveryStep === "telegram" && (
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Telegram Tiklash' : 'Telegram Сброс'}</h2>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Botdan kelgan kodni kiriting</p>
                                </div>
                                <div className="space-y-4">
                                    <input 
                                        type="text"
                                        value={recoveryTelegramCode}
                                        onChange={e => setRecoveryTelegramCode(e.target.value)}
                                        placeholder="----"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-center tracking-[1em] outline-none focus:ring-2 focus:ring-black transition-all"
                                    />
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Yangi PIN o'rnating</p>
                                        <input 
                                            type="text"
                                            maxLength={4}
                                            value={recoveryNewPin}
                                            onChange={e => setRecoveryNewPin(e.target.value)}
                                            placeholder="****"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-center tracking-[1em] outline-none focus:ring-2 focus:ring-black transition-all"
                                        />
                                    </div>
                                </div>
                                {recoveryError && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{recoveryError}</p>}
                                <button 
                                    onClick={handleVerifyTelegramAndReset}
                                    disabled={isActionLoading || recoveryTelegramCode.length < 4 || recoveryNewPin.length !== 4}
                                    className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95"
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : (language === 'uz' ? 'TASDIQLASH' : 'ПОДТВЕРДИТЬ')}
                                </button>
                            </div>
                        )}

                        {recoveryStep === "new_pin" && (
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{language === 'uz' ? 'Yangi PIN' : 'Новый PIN'}</h2>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Yangi 4 xonali PIN kiriting</p>
                                </div>
                                <PinKeypad onComplete={handleSetNewPinDirectly} title="" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuItem({ href, icon, label, language, divider = true, onClick, variant = "default" }: any) {

    const Content = (
        <div className="flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group">
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
                <Link href={`/${language}${href}`}>{Content}</Link>
            ) : (
                <div onClick={onClick}>{Content}</div>
            )}
            {divider && <div className="mx-6 border-b border-gray-50" />}
        </>
    );
}
