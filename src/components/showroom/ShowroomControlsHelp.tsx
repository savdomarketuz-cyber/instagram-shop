"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, MousePointerClick, Move, Eye } from "lucide-react";
import { translations } from "@/lib/translations";

interface ShowroomControlsHelpProps {
    lang: "uz" | "ru";
}

export default function ShowroomControlsHelp({ lang }: ShowroomControlsHelpProps) {
    const [isOpen, setIsOpen] = useState(true);
    const t = translations[lang];

    return (
        <div className="fixed bottom-7 left-6 z-30 select-none">
            {isOpen ? (
                <div className="w-72 rounded-2xl border border-white/15 bg-black/75 p-4 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in duration-200">
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/90">
                            <HelpCircle size={14} className="text-emerald-400" />
                            {lang === "ru" ? "Управление" : "Boshqaruv"}
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className="space-y-2 text-xs text-white/80">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 font-mono text-[11px] font-bold text-white shrink-0">
                                <Move size={13} />
                            </div>
                            <span>
                                <strong className="text-white">W, A, S, D</strong> {lang === "ru" ? "— ходить по залу" : "— do'konda yurish"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 font-mono text-[11px] font-bold text-white shrink-0">
                                <Eye size={13} />
                            </div>
                            <span>
                                <strong className="text-white">{lang === "ru" ? "Мышь" : "Sichqoncha"}</strong> {lang === "ru" ? "— обзор 360°" : "— 360° atrofga qarash"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 font-mono text-[11px] font-bold text-white shrink-0">
                                <MousePointerClick size={13} />
                            </div>
                            <span>
                                <strong className="text-white">{lang === "ru" ? "Клик" : "Bosish"}</strong> {lang === "ru" ? "— осмотр и покупка" : "— tovar va xarid"}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/75 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur-2xl transition-all hover:bg-white/10 hover:text-white active:scale-95 shadow-xl"
                >
                    <HelpCircle size={15} className="text-emerald-400" />
                    <span>{lang === "ru" ? "Управление" : "Boshqaruv"}</span>
                </button>
            )}
        </div>
    );
}
