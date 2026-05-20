"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function calcTimeLeft(endTime: string): TimeLeft | null {
    const diff = new Date(endTime).getTime() - Date.now();
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

export default function PromoCountdown({ language }: { language: "uz" | "ru" }) {
    const [settings, setSettings] = useState<PromoSettings | null>(null);
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("value")
            .eq("key", "promo_countdown")
            .single()
            .then(({ data }) => {
                if (!data) return;
                const s = data.value as PromoSettings;
                if (!s.enabled) return;
                setSettings(s);
                setTimeLeft(calcTimeLeft(s.end_time));
            });
    }, []);

    useEffect(() => {
        if (!settings) return;
        const id = setInterval(() => {
            const t = calcTimeLeft(settings.end_time);
            setTimeLeft(t);
            if (!t) clearInterval(id);
        }, 1000);
        return () => clearInterval(id);
    }, [settings]);

    if (!settings || !timeLeft) return null;

    const bg = settings.bg_color || "#2D6E3E";
    const label = language === "uz" ? settings.label_uz : settings.label_ru;
    const text = language === "uz" ? settings.text_uz : settings.text_ru;

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
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
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

    if (settings.link) {
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
