"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";

export default function LoginPage() {
    const router = useRouter();
    const setUser = useStore((state) => state.setUser);
    const { language, showToast } = useStore();
    const t = translations[language];

    // Form States
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"password" | "2fa">("password");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Admin login logic
            const authRes = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, password, code: otp, step })
            });

            const authData = await authRes.json();

            if (authRes.ok) {
                if (authData.step === "2fa") {
                    setStep("2fa");
                    setLoading(false);
                    return;
                }
                
                if (authData.success) {
                    setUser(authData.user);
                    const params = new URLSearchParams(window.location.search);
                    const target = params.get('redirect') || "/admin";
                    const vaultRedirect = target.includes("?") 
                        ? `${target}&vault=Abdulaziz2244` 
                        : `${target}?vault=Abdulaziz2244`;
                    
                    window.location.href = vaultRedirect;
                    return;
                }
            } else if (id.toLowerCase().includes("admin") || id.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_LOGIN) {
                setError(authData.error);
                setLoading(false);
                return;
            }

            // 2. Normal User Login logic
            const isPhoneNumber = /^\d+$/.test(id.replace(/\s+/g, "").replace("+", ""));
            let queryId = id;
            if (isPhoneNumber) {
                queryId = id.startsWith("+998") ? id : `+998${id.replace(/\s+/g, "")}`;
            }

            const userAuthRes = await fetch("/api/auth/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: queryId, password })
            });

            const userAuthData = await userAuthRes.json();

            if (userAuthRes.ok && userAuthData.success) {
                setUser(userAuthData.user);
                showToast(language === 'uz' ? "Xush kelibsiz!" : "Добро пожаловать!");
                router.push("/");
            } else {
                const errorMsg = userAuthData.error;
                if (errorMsg === "User not found") {
                    setError(language === 'uz' ? "Bunday ma'lumot ro'yxatdan o'tmagan" : "Такие данные не зарегистрированы");
                } else if (errorMsg === "Invalid password") {
                    setError(language === 'uz' ? "Parol noto'g'ri" : "Неверный пароль");
                } else {
                    setError(userAuthData.error || (language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка"));
                }
            }
        } catch (err) {
            setError(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
        } finally {
            setLoading(false);
        }
    };

    const handleTelegramAuth = async (user: any) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setUser(data.user);
                showToast(language === 'uz' ? "Muvaffaqiyatli kirdingiz!" : "Успешный вход!");
                router.push("/");
            } else {
                setError(data.error || "Telegram Auth failed");
            }
        } catch (err) {
            setError("Auth error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen flex flex-col pt-20 font-sans selection:bg-black selection:text-white">
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <ShieldCheck size={20} />
                    </div>
                    {step === "2fa" && (
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">2FA Active</span>
                    )}
                </div>
                <h1 className="text-3xl font-black mb-2 tracking-tighter italic uppercase text-black">
                    {step === "password" 
                        ? (language === 'uz' ? 'Xush kelibsiz!' : 'Добро пожаловать!')
                        : (language === 'uz' ? 'Xavfsizlik' : 'Безопасность')
                    }
                </h1>
                <p className="text-gray-500 font-medium text-sm">
                    {step === "password"
                        ? (language === 'uz' ? 'Tizimga kirish uchun ma\'lumotlarni kiriting' : 'Введите данные для входа')
                        : (language === 'uz' ? 'Telegram botingizga yuborilgan kodni kiriting' : 'Введите код из Telegram')
                    }
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                    <div className="text-red-500 text-[11px] font-black bg-red-50 p-5 rounded-[24px] flex items-center gap-3 border border-red-100 italic uppercase tracking-tight">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        {error}
                    </div>
                )}

                {step === "password" ? (
                    <div className="space-y-5">
                        <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">
                                {language === 'uz' ? 'Identifikator' : 'Идентификатор'}
                            </label>
                            <input
                                required
                                type="text"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                className="w-full bg-gray-50 rounded-[28px] py-6 px-8 focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-black text-lg text-black"
                                placeholder={language === 'uz' ? 'Telefon yoki ID' : 'Телефон или ID'}
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">
                                {language === 'uz' ? 'Parol' : 'Пароль'}
                            </label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 rounded-[28px] py-6 px-8 focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-black text-lg text-black"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                         <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">
                                {language === 'uz' ? 'Tasdiqlash kodi' : 'Код подтверждения'}
                            </label>
                            <input
                                required
                                autoFocus
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-gray-50 rounded-[32px] py-8 px-8 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-4xl text-center tracking-[0.6em] placeholder:text-gray-200 text-black"
                                placeholder="000000"
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setStep("password")}
                            className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                        >
                            {language === 'uz' ? "Orqaga qaytish" : "Назад"}
                        </button>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-6 rounded-[32px] font-black text-lg flex justify-center items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span className="uppercase tracking-[0.1em]">
                                {step === "password" ? t.account.login : (language === 'uz' ? 'Kodni tasdiqlash' : 'Подтвердить kod')}
                            </span>
                            <LogIn size={22} strokeWidth={4} />
                        </>
                    )}
                </button>
            </form>

            {step === "password" && (
                <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="items-center gap-4 hidden sm:flex">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-300">
                            {language === 'uz' ? 'Tezkor kirish' : 'Быстрый вход'}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="bg-blue-50/50 p-10 rounded-[44px] border border-blue-100/50 text-center space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-tight text-blue-900 italic leading-snug">
                            {language === 'uz' 
                                ? 'Yangi foydalanuvchimisiz? Bir zumda kirishni tanlang' 
                                : 'Новый пользователь? Выберите мгновенный вход'}
                        </h3>
                        
                        <div className="flex justify-center scale-110 md:scale-125 origin-center py-2">
                             <TelegramLoginButton 
                                botName="style_gadgetuz_bot" 
                                onAuth={handleTelegramAuth} 
                                buttonSize="large"
                                cornerRadius={20}
                             />
                        </div>

                        <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest">
                            {language === 'uz' 
                                ? 'Bot orqali avtomatik ro‘yxatdan o‘tish' 
                                : 'Автоматическая регистрация через бота'}
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-10 flex items-center justify-center gap-2 opacity-10 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] italic text-black">Iron Bank Vault v5.2</span>
            </div>
        </div>
    );
}
