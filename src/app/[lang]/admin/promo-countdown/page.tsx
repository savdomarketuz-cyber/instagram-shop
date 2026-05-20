"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Timer, ToggleLeft, ToggleRight, Save, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";

interface PromoSettings {
    enabled: boolean;
    end_time: string;
    text_uz: string;
    text_ru: string;
    label_uz: string;
    label_ru: string;
    bg_color: string;
    link: string;
}

const DEFAULT: PromoSettings = {
    enabled: false,
    end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    text_uz: "Chegirma tugashiga",
    text_ru: "До конца скидки",
    label_uz: "Maxsus taklif!",
    label_ru: "Специальное предложение!",
    bg_color: "#2D6E3E",
    link: "",
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function LivePreview({ settings, language }: { settings: PromoSettings; language: "uz" | "ru" }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calc = () => {
            const diff = new Date(settings.end_time).getTime() - Date.now();
            if (diff <= 0) return;
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [settings.end_time]);

    const label = language === "uz" ? settings.label_uz : settings.label_ru;
    const text = language === "uz" ? settings.text_uz : settings.text_ru;

    return (
        <div style={{ borderRadius: 20, overflow: "hidden", maxWidth: 400 }}>
            <div style={{ background: settings.bg_color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{text}</div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {timeLeft.days > 0 && (
                        <>
                            <Block n={timeLeft.days} l={language === "uz" ? "kun" : "д"} />
                            <Dot />
                        </>
                    )}
                    <Block n={timeLeft.hours} l={language === "uz" ? "soat" : "ч"} />
                    <Dot />
                    <Block n={timeLeft.minutes} l={language === "uz" ? "daq" : "м"} />
                    <Dot />
                    <Block n={timeLeft.seconds} l={language === "uz" ? "son" : "с"} />
                </div>
            </div>
        </div>
    );
}

function Block({ n, l }: { n: number; l: string }) {
    return (
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, minWidth: 38, padding: "5px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{pad(n)}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginTop: 2, textTransform: "uppercase" }}>{l}</div>
        </div>
    );
}

function Dot() {
    return <span style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>:</span>;
}

export default function PromoCountdownAdmin() {
    const [settings, setSettings] = useState<PromoSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [previewLang, setPreviewLang] = useState<"uz" | "ru">("uz");

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("value")
            .eq("key", "promo_countdown")
            .single()
            .then(({ data }) => {
                if (data?.value) {
                    const v = data.value as PromoSettings;
                    // normalize datetime-local format
                    setSettings({
                        ...v,
                        end_time: v.end_time ? new Date(v.end_time).toISOString().slice(0, 16) : DEFAULT.end_time,
                    });
                }
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...settings,
                end_time: new Date(settings.end_time).toISOString(),
            };
            const { error } = await supabase
                .from("site_settings")
                .upsert({ key: "promo_countdown", value: payload });
            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Saqlashda xatolik!");
        } finally {
            setSaving(false);
        }
    };

    const field = (label: string, key: keyof PromoSettings, type = "text", placeholder = "") => (
        <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{label}</label>
            <input
                type={type}
                value={settings[key] as string}
                onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-sm font-semibold focus:outline-none focus:border-black transition-colors"
            />
        </div>
    );

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-10 pb-20 max-w-4xl">
            {saved && (
                <div className="fixed top-10 right-10 z-[100] bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl">
                    <CheckCircle2 size={16} /> Saqlandi!
                </div>
            )}

            <div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 italic uppercase flex items-center gap-4">
                    <Timer size={40} /> Promo Countdown
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Mobil banner — bosh sahifada ko'rinadi</p>
            </div>

            {/* Toggle */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex items-center justify-between gap-6">
                <div>
                    <div className="font-black text-lg tracking-tight">Banner holati</div>
                    <div className="text-gray-400 text-sm mt-1">{settings.enabled ? "Yoqilgan — foydalanuvchilar ko'rmoqda" : "O'chirilgan — hech kim ko'rmaydi"}</div>
                </div>
                <button
                    onClick={() => setSettings(p => ({ ...p, enabled: !p.enabled }))}
                    className="flex items-center gap-3 transition-all"
                >
                    {settings.enabled
                        ? <ToggleRight size={52} className="text-green-600" />
                        : <ToggleLeft size={52} className="text-gray-300" />
                    }
                </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
                <div className="font-black text-lg tracking-tight mb-2">Kontent</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {field("Sarlavha (UZ)", "label_uz", "text", "Maxsus taklif!")}
                    {field("Sarlavha (RU)", "label_ru", "text", "Специальное предложение!")}
                    {field("Matn (UZ)", "text_uz", "text", "Chegirma tugashiga")}
                    {field("Matn (RU)", "text_ru", "text", "До конца скидки")}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Tugash vaqti</label>
                        <input
                            type="datetime-local"
                            value={settings.end_time}
                            onChange={e => setSettings(p => ({ ...p, end_time: e.target.value }))}
                            className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-sm font-semibold focus:outline-none focus:border-black transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fon rangi</label>
                        <div className="flex gap-3 items-center">
                            <input
                                type="color"
                                value={settings.bg_color}
                                onChange={e => setSettings(p => ({ ...p, bg_color: e.target.value }))}
                                className="w-12 h-12 rounded-xl border-2 border-gray-100 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={settings.bg_color}
                                onChange={e => setSettings(p => ({ ...p, bg_color: e.target.value }))}
                                className="flex-1 px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-sm font-semibold focus:outline-none focus:border-black transition-colors font-mono"
                            />
                        </div>
                    </div>
                </div>

                {field("Havola (ixtiyoriy)", "link", "url", "https://...")}
            </div>

            {/* Live Preview */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="font-black text-lg tracking-tight">Ko'rinish</div>
                    <div className="flex gap-2">
                        {(["uz", "ru"] as const).map(l => (
                            <button
                                key={l}
                                onClick={() => setPreviewLang(l)}
                                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${previewLang === l ? "bg-black text-white" : "bg-gray-100 text-gray-400"}`}
                            >
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <LivePreview settings={settings} language={previewLang} />
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-3 px-10 py-5 bg-black text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Saqlash
            </button>
        </div>
    );
}
