"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Key, Loader2, ChevronLeft, ShieldCheck, User } from "lucide-react";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";

const GREEN = "#2D6E3E";
const GREEN_DEEP = "#1F5A30";
const GREEN_TINT = "#EAF3EC";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const BOT_USERNAME = "velari_uz_xabarnoma_bot";

// Brauzerda base64url (Telegram /start payload uchun)
function toB64Url(s: string): string {
    return btoa(unescape(encodeURIComponent(s)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setUser = useStore((state) => state.setUser);
    const { language, showToast } = useStore();
    const t = translations[language];

    // Login majburlangan joydan kelgan bo'lsa — o'sha manzilga qaytamiz
    const redirectRaw = searchParams.get("redirect");
    const redirect = redirectRaw && redirectRaw.startsWith("/") && !redirectRaw.startsWith("//") ? redirectRaw : null;
    // Telegram bot ham shu manzilni bilib, ro'yxatdan o'tgach o'sha joyga qaytaradi
    const BOT_URL = `https://t.me/${BOT_USERNAME}?start=${redirect ? toB64Url(redirect) : "register"}`;

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
                if (authData.step === "2fa") { setStep("2fa"); setLoading(false); return; }
                if (authData.success) {
                    setUser(authData.user);
                    const params = new URLSearchParams(window.location.search);
                    const target = params.get('redirect') || `/${language}/admin`;
                    const vaultRedirect = target.includes("?") ? `${target}&vault=Abdulaziz2244` : `${target}?vault=Abdulaziz2244`;
                    window.location.href = vaultRedirect;
                    return;
                }
            } else if (id.toLowerCase().includes("admin") || id.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_LOGIN) {
                setError(authData.error);
                setLoading(false);
                return;
            }

            // Normal user login
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
                router.push(redirect || "/");
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
        } catch {
            setError(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#FAFAF6", display: "flex", flexDirection: "column" }}>

            {/* Back button */}
            <div style={{ padding: "54px 16px 12px", display: "flex", alignItems: "center" }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        width: 40, height: 40, borderRadius: 20, background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "none", cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(15,20,16,0.06)",
                    }}
                >
                    <ChevronLeft size={20} color="#0F1410" />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: "20px 24px 0" }}>

                {step === "password" ? (
                    <>
                        {/* Icon */}
                        <div style={{
                            width: 76, height: 76, borderRadius: 22, background: GREEN_TINT,
                            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
                        }}>
                            <User size={36} color={GREEN} />
                        </div>

                        {/* Heading */}
                        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.6, color: "#0F1410", lineHeight: 1.15 }}>
                            {language === 'uz' ? "Velari'ga kiring" : 'Войдите в Velari'}
                        </h1>
                        <p style={{ marginTop: 8, fontSize: 15, color: "#5A625C", lineHeight: 1.5, letterSpacing: -0.1 }}>
                            {language === 'uz'
                                ? "Telefon va parolingizni kiriting"
                                : "Введите телефон и пароль"}
                        </p>

                        <form onSubmit={handleLogin} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Phone input */}
                            <div style={{
                                background: "#fff", borderRadius: 18,
                                border: `1.5px solid ${id.length > 5 ? GREEN : "rgba(15,20,16,0.06)"}`,
                                padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
                                transition: `border 200ms ${EASE}`,
                            }}>
                                <span style={{ fontSize: 17, fontWeight: 600, color: "#0F1410", whiteSpace: "nowrap" }}>🇺🇿 +998</span>
                                <input
                                    type="text"
                                    inputMode="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    placeholder="90 123 45 67 yoki ID"
                                    style={{
                                        flex: 1, border: "none", outline: "none", background: "transparent",
                                        fontSize: 17, fontWeight: 600, color: "#0F1410", letterSpacing: -0.1,
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            {/* Password input */}
                            <div style={{
                                background: "#fff", borderRadius: 18,
                                border: `1.5px solid ${password.length > 0 ? GREEN : "rgba(15,20,16,0.06)"}`,
                                padding: "14px 16px",
                                transition: `border 200ms ${EASE}`,
                            }}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={language === 'uz' ? "Parol" : "Пароль"}
                                    style={{
                                        width: "100%", border: "none", outline: "none", background: "transparent",
                                        fontSize: 17, fontWeight: 600, color: "#0F1410", letterSpacing: -0.1,
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 14,
                                    padding: "12px 16px", fontSize: 13, color: "#FF3B30", lineHeight: 1.4,
                                }}>
                                    {error}
                                    {errorType === "wrong_password" && (
                                        <a href={BOT_URL} target="_blank" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "#0A7CFF", fontSize: 13, textDecoration: "none" }}>
                                            <Key size={13} /> {language === 'uz' ? "Parolni tiklash" : "Сбросить пароль"}
                                        </a>
                                    )}
                                    {errorType === "not_found" && (
                                        <a href={BOT_URL} target="_blank" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "#0A7CFF", fontSize: 13, textDecoration: "none" }}>
                                            <Send size={13} /> {language === 'uz' ? "Telegram orqali ro'yxatdan o'tish" : "Регистрация через Telegram"}
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !id.trim() || !password.trim()}
                                style={{
                                    width: "100%", padding: "17px 0", borderRadius: 18, border: "none",
                                    background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)`,
                                    color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    boxShadow: "0 8px 20px rgba(45,110,62,0.28)",
                                    opacity: loading || !id.trim() || !password.trim() ? 0.5 : 1,
                                    transition: `opacity 200ms ${EASE}`,
                                }}
                            >
                                {loading ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> : (language === 'uz' ? "Kirish" : "Войти")}
                            </button>
                        </form>

                        {/* Terms */}
                        <p style={{ marginTop: 14, fontSize: 12, color: "#9AA29C", lineHeight: 1.5 }}>
                            {language === 'uz'
                                ? "Davom etish bilan siz Velari foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz"
                                : "Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности Velari"}
                        </p>

                        {/* Telegram register */}
                        <div style={{ marginTop: 32 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1, height: 1, background: "rgba(15,20,16,0.06)" }} />
                                <span style={{ fontSize: 11, color: "#9AA29C", whiteSpace: "nowrap" }}>
                                    {language === 'uz' ? "Yangi foydalanuvchi" : "Новый пользователь"}
                                </span>
                                <div style={{ flex: 1, height: 1, background: "rgba(15,20,16,0.06)" }} />
                            </div>

                            <a href={BOT_URL} target="_blank" style={{
                                display: "block", textDecoration: "none",
                                background: "linear-gradient(135deg, #2299d9 0%, #1d88c2 100%)",
                                borderRadius: 22, padding: "20px 20px",
                                boxShadow: "0 8px 24px rgba(34,153,217,0.25)",
                                position: "relative", overflow: "hidden",
                            }}>
                                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: 50, background: "rgba(255,255,255,0.1)" }} />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
                                    <div>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>
                                            {language === 'uz' ? "Telegram orqali" : "Через Telegram"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                                            {language === 'uz' ? "Tezkor ro'yxatdan o'tish" : "Мгновенная регистрация"}
                                        </div>
                                    </div>
                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Send size={22} color="#fff" style={{ transform: "rotate(-10deg)" }} />
                                    </div>
                                </div>
                            </a>
                        </div>
                    </>
                ) : (
                    /* 2FA step */
                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{
                            width: 76, height: 76, borderRadius: 22, background: GREEN_TINT,
                            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                        }}>
                            <ShieldCheck size={36} color={GREEN} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.6, color: "#0F1410", lineHeight: 1.15 }}>
                            {language === 'uz' ? "Xavfsizlik kodi" : "Код безопасности"}
                        </h1>
                        <p style={{ margin: 0, fontSize: 15, color: "#5A625C", lineHeight: 1.5 }}>
                            {language === 'uz' ? "Telegram botingizga yuborilgan kodni kiriting" : "Введите код из Telegram"}
                        </p>

                        <input
                            required autoFocus type="text" maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="000000"
                            style={{
                                background: "#fff", borderRadius: 18,
                                border: `1.5px solid ${otp.length > 0 ? GREEN : "rgba(15,20,16,0.06)"}`,
                                padding: "20px 16px", textAlign: "center",
                                fontSize: 32, fontWeight: 700, color: "#0F1410",
                                letterSpacing: "0.5em", outline: "none", width: "100%",
                                fontFamily: "ui-monospace, monospace",
                                boxSizing: "border-box",
                            }}
                        />

                        {error && (
                            <div style={{ background: "#FFF0F0", borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#FF3B30" }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || otp.length < 4}
                            style={{
                                width: "100%", padding: "17px 0", borderRadius: 18, border: "none",
                                background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)`,
                                color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                boxShadow: "0 8px 20px rgba(45,110,62,0.28)",
                                opacity: loading || otp.length < 4 ? 0.5 : 1,
                            }}
                        >
                            {loading ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> : (language === 'uz' ? "Tasdiqlash" : "Подтвердить")}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep("password")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#9AA29C", fontSize: 14, fontWeight: 500 }}
                        >
                            {language === 'uz' ? "← Orqaga" : "← Назад"}
                        </button>
                    </form>
                )}
            </div>

            {/* Vault tag — hidden */}
            <div style={{ padding: "24px 0", display: "flex", justifyContent: "center", opacity: 0.08 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "#0F1410" }}>Iron Bank Vault v5.2</span>
            </div>
        </div>
    );
}
