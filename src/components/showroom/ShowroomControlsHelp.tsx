"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, MousePointerClick, Move, Eye } from "lucide-react";
import { translations } from "@/lib/translations";

interface ShowroomControlsHelpProps {
    lang: "uz" | "ru";
    invertY?: boolean;
    onToggleInvertY?: () => void;
}

export default function ShowroomControlsHelp({ lang, invertY = false, onToggleInvertY }: ShowroomControlsHelpProps) {
    const [isOpen, setIsOpen] = useState(false);
    const t = translations[lang];

    return (
        <div className="fixed bottom-7 left-6 z-30 select-none">
            {isOpen ? (
                <div className="w-72 rounded-2xl border border-black/8 bg-white/85 p-4 text-[#1d1d1f] shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in duration-200">
                    <div className="mb-3 flex items-center justify-between border-b border-black/8 pb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1d1d1f]">
                            <HelpCircle size={14} className="text-emerald-600" />
                            {lang === "ru" ? "Управление" : "Boshqaruv"}
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg p-1 text-[#86868b] hover:bg-black/5 hover:text-[#1d1d1f] transition-colors"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className="space-y-2 text-xs text-[#515154]">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-14 items-center justify-center rounded-md bg-black/5 border border-black/10 font-mono text-[11px] font-bold text-[#1d1d1f] shrink-0">
                                WASD
                            </div>
                            <span>
                                {lang === "ru" ? "Ходьба по заlu" : "Do'konda erkin yurish"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-14 items-center justify-center rounded-md bg-black/5 border border-black/10 font-mono text-[11px] font-bold text-[#1d1d1f] shrink-0">
                                Shift
                            </div>
                            <span>
                                {lang === "ru" ? "Бег (ускорение)" : "Yugurish (tezlanish)"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-14 items-center justify-center rounded-md bg-black/5 border border-black/10 font-mono text-[11px] font-bold text-[#1d1d1f] shrink-0">
                                Space
                            </div>
                            <span>
                                {lang === "ru" ? "Прыжок" : "Sakrash"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-14 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30 font-mono text-[11px] font-bold text-emerald-700 shrink-0">
                                E / Klik
                            </div>
                            <span>
                                {lang === "ru" ? "Осмотр и покупка" : "Tovar va xarid"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-14 items-center justify-center rounded-md bg-black/5 border border-black/10 font-mono text-[11px] font-bold text-[#1d1d1f] shrink-0">
                                ESC
                            </div>
                            <span>
                                {lang === "ru" ? "Освободить мышь" : "Kursorni chiqarish"}
                            </span>
                        </div>
                    </div>

                    {/* Invert Y O'qi sozlamasi */}
                    {onToggleInvertY && (
                        <div className="mt-3 pt-2.5 border-t border-black/8 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#6e6e73]">
                                {lang === "ru" ? "Инверсия мыши Y" : "Teskari Y o'qi"}
                            </span>
                            <button
                                onClick={onToggleInvertY}
                                className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                                    invertY ? "bg-emerald-600" : "bg-neutral-300"
                                }`}
                                title={lang === "ru" ? "Инвертировать вертикальное движение мыши" : "Sichqonchaning vertikal harakatini teskari qilish"}
                            >
                                <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                                        invertY ? "translate-x-3.5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-black/8 bg-white/85 px-3 py-2 text-xs font-semibold text-[#1d1d1f] backdrop-blur-2xl transition-all hover:bg-white hover:shadow-md active:scale-95 shadow-[0_8px_25px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
                >
                    <HelpCircle size={15} className="text-emerald-600" />
                    <span>{lang === "ru" ? "Управление" : "Boshqaruv"}</span>
                </button>
            )}
        </div>
    );
}
