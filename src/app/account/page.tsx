import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import { ArrowRight, User as UserIcon, Camera, Package, Heart, LogOut, Save, Loader2, CheckCircle2, Phone, Headset } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { mapUser } from "@/lib/mappers";

export default function AccountPage() {
    const router = useRouter();
    const { user, setUser, logout, language, setLanguage } = useStore();
    const t = translations[language];
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

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
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user?.phone]);

    const handleSave = async () => {
        if (!user) return;
        setUsernameError("");

        // Username validation
        const usernameRegex = /^[a-zA-Z0-9_]+$/;

        if (username && !usernameRegex.test(username)) {
            setUsernameError(language === 'uz' ? "Username noto'g'ri formatda (faqat harf, raqam va pastki chiziq '_', bo'sh joy mumkin emas)" : "Неверный формат имени пользователя (только буквы, цифры и нижнее подчеркивание '_', без пробелов)");
            return;
        }

        const trimmedUsername = username.trim();

        if (trimmedUsername && (trimmedUsername.length < 3 || trimmedUsername.length > 20)) {
            setUsernameError(language === 'uz' ? "Username 3-20 ta belgidan iborat bo'lishi kerak" : "Имя пользователя должно содержать от 3 до 20 символов");
            return;
        }

        setIsSaving(true);
        try {
            // Check if username is taken
            if (trimmedUsername && trimmedUsername !== user.username) {
                const { data: existing } = await supabase
                    .from("users")
                    .select("phone")
                    .eq("username", trimmedUsername)
                    .neq("phone", user.phone)
                    .maybeSingle();

                if (existing) {
                    setUsernameError(language === 'uz' ? "Ushbu username band" : "Это имя пользователя уже занято");
                    setIsSaving(false);
                    return;
                }
            }

            const { error } = await supabase
                .from("users")
                .update({
                    name: name,
                    username: trimmedUsername
                })
                .eq("phone", user.phone);
            
            if (error) throw error;

            setUser({ ...user, name: name, username: trimmedUsername });
            setUsername(trimmedUsername);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (e) {
            console.error("Error updating profile:", e);
            alert(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 bg-white min-h-screen flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300">
                    <UserIcon size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tighter mb-2">
                        {language === 'uz' ? 'Profilga kiring' : 'Войдите в профиль'}
                    </h2>
                    <p className="text-gray-400 text-sm font-medium max-w-[240px]">
                        {language === 'uz' ? 'Buyurtmalaringizni kuzatish va ma\'lumotlaringizni saqlash uchun tizimga kiring.' : 'Войдите в систему, чтобы отслеживать свои заказы и сохранять свои данные.'}
                    </p>
                </div>
                <Link href="/login" className="w-full max-w-[200px] bg-black text-white py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all">
                    {t.account.login}
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen pb-24">
            {/* Header */}
            <div className="p-8 pt-12">
                <h1 className="text-3xl font-black tracking-tighter mb-8 italic uppercase">{t.account.title}</h1>

                {/* Profile Card */}
                <div className="bg-black text-white p-8 rounded-[40px] mb-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors" />

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center text-2xl font-black border border-white/10 backdrop-blur-sm">
                            {name ? name.charAt(0).toUpperCase() : user.phone.slice(-2)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight">
                                {name || (language === 'uz' ? "Ism kiritilmagan" : "Имя не введено")}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-white/50">
                                <Phone size={12} />
                                <span className="text-xs font-bold tracking-tight">{user.phone}</span>
                            </div>
                            <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">
                                {language === 'uz' ? 'Sodiq mijoz' : 'Постоянный клиент'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 mb-12">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4 mb-3 block">{t.account.name}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={language === 'uz' ? "Ismingizni kiriting" : "Введите ваше имя"}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-[28px] px-8 py-5 font-bold text-sm outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4 mb-3 block">Username (@)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                                placeholder={language === 'uz' ? "unique_username" : "уникальный_никнейм"}
                                className={`w-full bg-gray-50 border-2 ${usernameError ? 'border-red-500' : 'border-transparent focus:border-black'} rounded-[28px] px-8 py-5 font-bold text-sm outline-none transition-all placeholder:text-gray-300`}
                            />
                        </div>
                        {usernameError && <p className="text-red-500 text-[10px] font-bold mt-2 ml-4">{usernameError}</p>}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || (name === (user.name || "") && username === (user.username || ""))}
                        className="w-full bg-black text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {language === 'uz' ? 'Saqlash' : 'Сохранить'}
                    </button>
                </div>

                {/* Success Toast */}
                {showSuccess && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
                        <CheckCircle2 size={16} /> {language === 'uz' ? 'Muvaffaqiyatli saqlandi!' : 'Успешно сохранено!'}
                    </div>
                )}

                {/* Menu Links */}
                <div className="grid grid-cols-1 gap-4">
                    <Link href="/orders" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:translate-x-2 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Package size={22} />
                            </div>
                            <div>
                                <span className="font-black text-sm italic uppercase tracking-tighter block">{t.account.orders}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {language === 'uz' ? 'Tarixni kuzatish' : 'Отслеживание истории'}
                                </span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                    </Link>

                    <Link href="/wishlist" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:translate-x-2 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Heart size={22} />
                            </div>
                            <div>
                                <span className="font-black text-sm italic uppercase tracking-tighter block">{t.nav.wishlist}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {language === 'uz' ? 'Sizga yoqqanlar' : 'То, что вам понравилось'}
                                </span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                    </Link>

                    <Link href="/chat" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:translate-x-2 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                                <Headset size={22} />
                            </div>
                            <div>
                                <span className="font-black text-sm italic uppercase tracking-tighter block">{language === 'uz' ? 'Yordam markazi' : 'Центр поддержки'}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {language === 'uz' ? 'Admin bilan chat' : 'Чат с админом'}
                                </span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                    </Link>
                </div>

                {/* Language Selector */}
                <div className="mt-12">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4 mb-3 block">
                        {language === 'uz' ? 'Tizim tili' : 'Язык системы'}
                    </label>
                    <div className="flex bg-gray-50 p-1.5 rounded-[28px] gap-1.5">
                        <button
                            onClick={() => setLanguage("uz")}
                            className={`flex-1 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest transition-all ${language === 'uz' ? 'bg-black text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:text-black'}`}
                        >
                            O'zbekcha
                        </button>
                        <button
                            onClick={() => setLanguage("ru")}
                            className={`flex-1 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest transition-all ${language === 'ru' ? 'bg-black text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:text-black'}`}
                        >
                            Русский
                        </button>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full mt-12 py-5 text-gray-400 hover:text-red-500 font-black tracking-[0.2em] uppercase border-2 border-gray-50 px-6 rounded-[32px] hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <LogOut size={18} />
                    {t.account.logout}
                </button>
            </div>
        </div>
    );
}
