"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, Lock, LogIn, ExternalLink, ShieldCheck } from "lucide-react";
import { db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "@/lib/firebase";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";

export default function LoginPage() {
    const router = useRouter();
    const setUser = useStore((state) => state.setUser);
    const { language } = useStore();
    const t = translations[language];
    const [id, setId] = useState(""); // Can be phone or username
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Admin login — server-side orqali tekshirish
            const authRes = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, password })
            });

            if (authRes.ok) {
                const authData = await authRes.json();
                if (authData.success) {
                    setUser(authData.user);
                    const params = new URLSearchParams(window.location.search);
                    router.push(params.get('redirect') || "/admin");
                    return;
                }
            }

            // 2. Normal User Login logic — Server-side orqali
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
                router.push("/");
            } else {
                const errorMsg = userAuthData.error;
                if (errorMsg === "User not found") {
                    setError(language === 'uz' ? "Bunday ma'lumot ro'yxatdan o'tmagan" : "Такие данные не зарегистрированы");
                } else if (errorMsg === "Invalid password") {
                    setError(language === 'uz' ? "Parol noto'g'ri" : "Неверный пароль");
                } else {
                    setError(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
                }
            }
        } catch (err) {
            setError(language === 'uz' ? "Xatolik yuz berdi. Iltimos qayta urining." : "Произошла ошибка. Пожалуйста, попробуйте еще раз.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen flex flex-col pt-20">
            <div className="mb-12">
                <h1 className="text-3xl font-black mb-2 tracking-tighter">
                    {language === 'uz' ? 'Xush kelibsiz!' : 'Добро пожаловать!'}
                </h1>
                <p className="text-gray-500 font-medium">
                    {language === 'uz' ? 'Tizimga kirish uchun ma\'lumotlarni kiriting' : 'Введите данные для входа в систему'}
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                    <div className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">
                        {language === 'uz' ? 'Telefon raqamingiz' : 'Ваш номер телефона'}
                    </label>
                    <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold transition-opacity group-focus-within:opacity-100">
                            +998
                        </span>
                        <input
                            required
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            className="w-full bg-gray-50 rounded-2xl py-4 pl-16 pr-6 focus:outline-none focus:ring-2 focus:ring-black transition-all font-bold placeholder:text-gray-300 placeholder:font-medium"
                            placeholder="90 123 45 67"
                            aria-label={language === 'uz' ? 'Telefon raqami' : 'Номер телефона'}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">
                        {language === 'uz' ? 'Parol' : 'Пароль'}
                    </label>
                    <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-black transition-all font-bold placeholder:text-gray-300 placeholder:font-medium"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-5 rounded-full font-black text-lg flex justify-center items-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>{t.account.login}</span>
                            <LogIn size={22} strokeWidth={3} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-12 space-y-4">
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {language === 'uz' ? 'Profilingiz yo\'qmi?' : 'Нет профиля?'}
                </p>
                <a
                    href="https://t.me/style_gadgetuz_bot"
                    target="_blank"
                    className="w-full bg-blue-50 text-blue-600 py-4 rounded-full font-black flex justify-center items-center gap-3 hover:bg-blue-100 transition-colors tracking-tight"
                >
                    <ExternalLink size={18} strokeWidth={3} />
                    <span>
                        {language === 'uz' ? 'Telegram-bot orqali kirish' : 'Вход через Telegram-бот'}
                    </span>
                </a>
            </div>

            <div className="mt-auto pt-10 flex items-center justify-center gap-2 opacity-20 grayscale">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Entry System</span>
            </div>
        </div>
    );
}
