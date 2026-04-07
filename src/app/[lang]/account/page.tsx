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
    Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { mapUser, mapComment } from "@/lib/mappers";
import Image from "next/image";
import { uploadToYandexS3 } from "@/lib/yandex-s3";

export default function AccountPage() {
    const router = useRouter();
    const { user, setUser, logout, language, setLanguage, showToast } = useStore();
    const t = translations[language];

    const [view, setView] = useState<"menu" | "edit-profile" | "language" | "returns" | "promo-codes" | "reviews">("menu");
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
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

            // Fetch Wallet Balance
            try {
                const myPhoneClean = user.phone.replace(/\D/g, '');
                const { data: wData } = await supabase
                    .from("user_wallets")
                    .select("balance")
                    .eq("phone", myPhoneClean)
                    .single();
                
                if (wData) setBalance(wData.balance);
            } catch (e) {
                console.error("Error fetching balance:", e);
            }

            // Fetch Pending Cashback
            try {
                const { data: pOrders } = await supabase
                    .from("orders")
                    .select("potential_cashback")
                    .eq("user_phone", user.phone)
                    .neq("status", "Yetkazildi")
                    .neq("status", "Bekor qilingan")
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
                            <MenuItem onClick={() => setView("promo-codes")} icon={<Ticket size={20} />} label={t.account.sections.promoCodes} divider={false} language={language} />
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
            const newComment = {
                product_id: reviewProduct.id,
                user_id: user.id || user.phone,
                user_phone: user.phone,
                username: user.username,
                text: reviewText,
                rating: reviewRating,
                type: 'review',
                data: {
                    images: reviewImages,
                    video: reviewVideo
                }
            };

            const { error } = await supabase.from("comments").insert([newComment]);
            if (error) throw error;

            // Update product rating (optional but recommended)
            try {
                const { data: prod } = await supabase.from("products").select("rating, review_count").eq("id", reviewProduct.id).single();
                if (prod) {
                    const currentCount = prod.review_count || 0;
                    const currentRating = prod.rating || 0;
                    const newCount = currentCount + 1;
                    const newRating = ((currentRating * currentCount) + reviewRating) / newCount;
                    await supabase.from("products").update({ rating: newRating, review_count: newCount }).eq("id", reviewProduct.id);
                }
            } catch (rErr) { console.warn("Rating update failed", rErr); }

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
            const { error } = await supabase.from("returns").insert({
                order_id: selectedOrder.id,
                user_phone: user.phone,
                items: selectedItems,
                reason: reason.trim(),
                status: "Kutilmoqda"
            });
            if (error) throw error;
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
