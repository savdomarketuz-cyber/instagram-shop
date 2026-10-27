"use client";

import React from "react";
import { Smartphone, Headphones, Gamepad2, RotateCcw } from "lucide-react";
import { ShowroomZone } from "./showroom-data";
import { translations } from "@/lib/translations";

interface NavigationDockProps {
    activeZone: ShowroomZone;
    lang: "uz" | "ru";
    onSelectZone: (zone: ShowroomZone) => void;
}

export default function NavigationDock({ activeZone, lang, onSelectZone }: NavigationDockProps) {
    const t = translations[lang];

    const dockItems: { id: ShowroomZone; label: string; icon: React.ReactNode }[] = [
        {
            id: "smartphones",
            label: t.showroom.smartphones,
            icon: <Smartphone size={17} />
        },
        {
            id: "audio_wearables",
            label: t.showroom.audioWearables,
            icon: <Headphones size={17} />
        },
        {
            id: "gaming_gadgets",
            label: t.showroom.gamingGadgets,
            icon: <Gamepad2 size={17} />
        },
        {
            id: "all",
            label: t.showroom.overview,
            icon: <RotateCcw size={16} />
        }
    ];

    return (
        <div className="fixed bottom-7 left-1/2 z-30 -translate-x-1/2 animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-black/70 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl ring-1 ring-white/10">
                {dockItems.map((item) => {
                    const isActive = activeZone === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectZone(item.id)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 select-none active:scale-95 ${
                                isActive
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <span className={isActive ? "text-black" : "text-white/60"}>
                                {item.icon}
                            </span>
                            <span className="tracking-tight">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
