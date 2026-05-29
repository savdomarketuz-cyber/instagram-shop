"use client";

import { useEffect, useState } from "react";

interface PromoSettings {
    enabled: boolean;
    start_time: string;
    end_time: string;
    text_uz: string;
    text_ru: string;
    label_uz: string;
    label_ru: string;
    bg_color: string;
    link: string;
    discount_percent: number;
    target_type: "all" | "category" | "brand" | "manual";
    target_ids: string[];
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function calcTimeLeft(targetTime: string): TimeLeft | null {
    const diff = new Date(targetTime).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
    };
}

function pad(n: number) {
    return String(n).padStart(2, "0");
}

export default function PromoCountdown({ language, initialSettings }: { language: "uz" | "ru"; initialSettings?: any }) {
    const [settings] = useState<PromoSettings | null>(() => {
        if (!initialSettings) return null;
        const s = initialSettings as PromoSettings;
        if (!s.enabled) return null;
        return s;
    });

    const [status, setStatus] = useState<"waiting" | "active" | "ended">("ended");
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    useEffect(() => {
        if (!settings) return;
        const id = setInterval(() => {
            const now = Date.now();
            const start = new Date(settings.start_time).getTime();
            const end = new Date(settings.end_time).getTime();

            if (now < start) {
                setStatus("waiting");
                setTimeLeft(calcTimeLeft(settings.start_time));
            } else if (now <= end) {
                setStatus("active");
                setTimeLeft(calcTimeLeft(settings.end_time));
            } else {
                setStatus("ended");
                setTimeLeft(null);
                clearInterval(id);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [settings]);

    if (!settings || !timeLeft || status === "ended") return null;

    const bg = settings.bg_color || "#2D6E3E";
    const label = language === "uz" ? settings.label_uz : settings.label_ru;
    
    let text = language === "uz" ? settings.text_uz : settings.text_ru;
    if (status === "waiting") {
        text = language === "uz" ? "Aksiya boshlanishiga" : "До начала акции";
    }

    const inner = (
        <div
            className="md:hidden mx-4 mt-4"
            style={{ borderRadius: 20, overflow: "hidden" }}
        >
            <div
                style={{
                    background: bg,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>
                        {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                        {settings.discount_percent > 0 && status === "active" && (
                            <span style={{ background: "#fff", color: bg, padding: "2px 6px", borderRadius: 6, fontSize: 11, fontWeight: 900 }}>
                                -{settings.discount_percent}%
                            </span>
                        )}
                        {text}
                    </div>
                </div>

                {/* Timer blocks */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {timeLeft.days > 0 && (
                        <>
                            <TimeBlock value={timeLeft.days} label={language === "uz" ? "kun" : "д"} />
                            <Colon />
                        </>
                    )}
                    <TimeBlock value={timeLeft.hours} label={language === "uz" ? "soat" : "ч"} />
                    <Colon />
                    <TimeBlock value={timeLeft.minutes} label={language === "uz" ? "daq" : "м"} />
                    <Colon />
                    <TimeBlock value={timeLeft.seconds} label={language === "uz" ? "son" : "с"} />
                </div>
            </div>
        </div>
    );

    if (settings.link && status === "active") {
        return (
            <a href={settings.link} style={{ textDecoration: "none", display: "block" }}>
                {inner}
            </a>
        );
    }

    return inner;
}

function TimeBlock({ value, label }: { value: number; label: string }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            minWidth: 38,
            padding: "5px 6px",
            textAlign: "center",
        }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: -0.5 }}>
                {pad(value)}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {label}
            </div>
        </div>
    );
}

function Colon() {
    return <span style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>:</span>;
}
