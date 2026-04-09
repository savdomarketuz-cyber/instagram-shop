"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Send, Key } from "lucide-react";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";

export default function LoginPage() {
    const router = useRouter();
    const setUser = useStore((state) => state.setUser);
    const { language, showToast } = useStore();
    const t = translations[language];

    const BOT_URL = "https://t.me/velari_uz_xabarnoma_bot?start=register";

    // Form States
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [errorType, setErrorType] = useState<"none" | "not_found" | "wrong_password">("none");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"password" | "2fa">("password");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setErrorType("none");

        try {
            // 1. Admin login logic
            const authRes = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id, 
                    password, 
                    code: step === "2fa" ? otp : undefined, 
                    step 
                })
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
                    setErrorType("not_found");
                    setError(language === 'uz' 
                        ? "Bunday raqam ro'yxatdan o'tmagan. Iltimos bot orqali ro'yxatdan o'ting." 
                        : "Этот номер не зарегистрирован. Пожалуйста, зарегистрируйтесь через бота.");
                } else if (errorMsg === "Invalid password") {
                    setErrorType("wrong_password");
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

    return (
        <div className="p-4 bg-white min-h-screen flex flex-col pt-16 font-sans selection:bg-black selection:text-white">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <ShieldCheck size={20} />
                    </div>
                    {step === "2fa" && (
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">2FA Active</span>
                    )}
                </div>
                <h1 className="text-2xl font-black mb-1 tracking-tighter italic uppercase text-black">
                    {step === "password" 
                        ? (language === 'uz' ? 'Xush kelibsiz!' : 'Добро пожаловать!')
                        : (language === 'uz' ? 'Xavfsizlik' : 'Безопасность')
                    }
                </h1>
                <p className="text-gray-500 font-medium text-xs">
                    {step === "password"
                        ? (language === 'uz' ? 'Tizimga kirish uchun ma\'lumotlarni kiriting' : 'Введите данные для входа')
                        : (language === 'uz' ? 'Telegram botingizga yuborilgan kodni kiriting' : 'Введите код из Telegram')
                    }
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                    <div className="text-red-500 text-[10px] font-black bg-red-50 p-4 rounded-[20px] flex flex-col gap-2 border border-red-100 italic uppercase tracking-tight">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                             {error}
                        </div>
                        {errorType === "wrong_password" && (
                            <a 
                                href={BOT_URL}
                                target="_blank"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-white/50 p-2 rounded-lg mt-1"
                            >
                                <Key size={12} />
                                <span>{language === 'uz' ? "Parolni tiklash" : "Сбросить пароль"}</span>
                            </a>
                        )}
                        {errorType === "not_found" && (
                            <a 
                                href={BOT_URL}
                                target="_blank"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-white/50 p-2 rounded-lg mt-1"
                            >
                                <Send size={12} />
                                <span>{language === 'uz' ? "Telegram orqali ro'yxatdan o'tish" : "Регистрация через Telegram"}</span>
                            </a>
                        )}
                    </div>
                )}

                {step === "password" ? (
                    <div className="space-y-4">
                        <div className="space-y-1.5 text-left">
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1.5">
                                {language === 'uz' ? 'Identifikator' : 'Идентификатор'}
                            </label>
                            <input
                                required
                                type="text"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                className="w-full bg-gray-50 rounded-[22px] py-4 px-6 focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-black text-base text-black"
                                placeholder={language === 'uz' ? 'Telefon yoki ID' : 'Телефон или ID'}
                            />
                        </div>

                        <div className="space-y-1.5 text-left">
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1.5">
                                {language === 'uz' ? 'Parol' : 'Пароль'}
                            </label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 rounded-[22px] py-4 px-6 focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-black text-base text-black"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
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
                                className="w-full bg-gray-50 rounded-[28px] py-6 px-6 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-3xl text-center tracking-[0.6em] placeholder:text-gray-200 text-black"
                                placeholder="000000"
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setStep("password")}
                            className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                        >
                            {language === 'uz' ? "Orqaga qaytish" : "Назад"}
                        </button>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-5 rounded-[24px] font-black text-base flex justify-center items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span className="uppercase tracking-[0.1em]">
                                {step === "password" ? t.account.login : (language === 'uz' ? 'Kodni tasdiqlash' : 'Подтвердить kod')}
                            </span>
                            <LogIn size={18} strokeWidth={4} />
                        </>
                    )}
                </button>
            </form>

            {step === "password" && (
                <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300">
                            {language === 'uz' ? 'Yangi foydalanuvchi' : 'Новый пользователь'}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <a 
                        href={BOT_URL}
                        target="_blank"
                        className="group relative w-full block bg-gradient-to-br from-[#2299d9] to-[#1d88c2] p-8 rounded-[32px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
                        
                        <div className="relative flex items-center justify-between gap-4">
                            <div className="text-left">
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-tight">
                                    {language === 'uz' ? 'Telegram orqali' : 'Чerez Telegram'}
                                </h3>
                                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    {language === 'uz' ? 'Tezkor roʻyxatdan oʻtish' : 'Мгновенная регистрация'}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                                <Send className="rotate-[350deg]" size={24} strokeWidth={3} />
                            </div>
                        </div>
                    </a>

                    <p className="text-center text-[8px] font-medium text-gray-400 px-10 leading-relaxed uppercase tracking-tighter">
                        {language === 'uz'
                            ? "Saytga kirish uchun parolingiz bo'lishi kerak. Uni bizning botimizda atigi 10 soniyada o'rnatishingiz mumkin."
                            : "Для входа на сайт требуется пароль. Вы можете установить его в нашем боте всего за 10 секунд."
                        }
                    </p>
                </div>
            )}

            <div className="mt-auto pt-8 flex items-center justify-center gap-2 opacity-10 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
                <ShieldCheck size={12} />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] italic text-black">Iron Bank Vault v5.2</span>
            </div>
        </div>
    );
}
