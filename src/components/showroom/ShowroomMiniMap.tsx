"use client";

import React, { useState } from "react";
import { Compass, Maximize2, Minimize2, Navigation } from "lucide-react";
import { ShowroomZone } from "./showroom-data";

interface ShowroomMiniMapProps {
    playerPos: { x: number; z: number };
    playerYaw: number;
    viewMode: "3D" | "2D";
    onToggleViewMode: () => void;
    onTeleportZone: (zone: ShowroomZone) => void;
    lang: "uz" | "ru";
}

export default function ShowroomMiniMap({
    playerPos,
    playerYaw,
    viewMode,
    onToggleViewMode,
    onTeleportZone,
    lang
}: ShowroomMiniMapProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Map bounds: X: -26 .. +30, Z: -16 .. +16
    // SVG viewbox: width 560, height 320
    const mapWidth = 560;
    const mapHeight = 320;

    const toSvgX = (x: number) => ((x + 26) / 56) * mapWidth;
    const toSvgY = (z: number) => ((z + 16) / 32) * mapHeight;

    const px = toSvgX(playerPos.x);
    const py = toSvgY(playerPos.z);
    const rotationDeg = ((-playerYaw + Math.PI / 2) * 180) / Math.PI;

    const departments: {
        id: ShowroomZone;
        nameUz: string;
        nameRu: string;
        x: number;
        y: number;
        w: number;
        h: number;
        color: string;
        icon: string;
    }[] = [
        {
            id: "exterior",
            nameUz: "KIRISH",
            nameRu: "ВХОД",
            x: toSvgX(-24),
            y: toSvgY(-1),
            w: 40,
            h: 70,
            color: "rgba(56, 189, 248, 0.15)",
            icon: "🚪"
        },
        {
            id: "trimmers",
            nameUz: "KATTA MAISHIY",
            nameRu: "КР. БЫТОВАЯ",
            x: toSvgX(-18),
            y: toSvgY(-14),
            w: 120,
            h: 80,
            color: "rgba(99, 102, 241, 0.15)",
            icon: "❄️"
        },
        {
            id: "shavers",
            nameUz: "OSHXONA & MAYDA",
            nameRu: "КУХНЯ И УХОД",
            x: toSvgX(-18),
            y: toSvgY(6),
            w: 120,
            h: 80,
            color: "rgba(16, 185, 129, 0.15)",
            icon: "🍳"
        },
        {
            id: "gadgets",
            nameUz: "MOBILE & TABLETS",
            nameRu: "СМАРТФОНЫ",
            x: toSvgX(-5),
            y: toSvgY(-5),
            w: 100,
            h: 100,
            color: "rgba(6, 182, 212, 0.22)",
            icon: "📱"
        },
        {
            id: "hair_care",
            nameUz: "TV & SOUND",
            nameRu: "ТВ И ЗВУК",
            x: toSvgX(3),
            y: toSvgY(-14),
            w: 120,
            h: 80,
            color: "rgba(236, 72, 153, 0.15)",
            icon: "📺"
        },
        {
            id: "gadgets",
            nameUz: "AKSESSUARLAR",
            nameRu: "АКСЕССУАРЫ",
            x: toSvgX(3),
            y: toSvgY(6),
            w: 120,
            h: 80,
            color: "rgba(168, 85, 247, 0.15)",
            icon: "🎧"
        },
        {
            id: "all",
            nameUz: "CHECKOUT KASSA",
            nameRu: "КАССА",
            x: toSvgX(16),
            y: toSvgY(-5),
            w: 110,
            h: 100,
            color: "rgba(245, 158, 11, 0.22)",
            icon: "💳"
        },
        {
            id: "all",
            nameUz: "SKLAD",
            nameRu: "СКЛАД",
            x: toSvgX(16),
            y: toSvgY(-14),
            w: 110,
            h: 80,
            color: "rgba(100, 116, 139, 0.18)",
            icon: "📦"
        },
        {
            id: "all",
            nameUz: "SERVIS & KAFOLAT",
            nameRu: "СЕРВИС",
            x: toSvgX(16),
            y: toSvgY(6),
            w: 110,
            h: 80,
            color: "rgba(20, 184, 166, 0.18)",
            icon: "🛠️"
        }
    ];

    return (
        <div
            className={`fixed z-30 transition-all duration-300 pointer-events-auto ${
                isExpanded
                    ? "inset-4 sm:inset-10 bg-slate-950/95 border border-cyan-500/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col p-4 sm:p-6"
                    : "top-20 left-6 w-56 sm:w-64 bg-slate-950/85 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-2.5"
            }`}
        >
            {/* MINI-MAP HEADER */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 text-white text-xs font-bold">
                <div className="flex items-center gap-1.5 text-cyan-400">
                    <Compass size={15} className="animate-spin-slow" />
                    <span>{lang === "ru" ? "ПЛАН МАГАЗИНА (2D)" : "DO'KON REJASI (2D)"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onToggleViewMode}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            viewMode === "2D"
                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/40"
                                : "bg-white/10 text-neutral-300 hover:bg-white/20"
                        }`}
                        title={viewMode === "2D" ? "3D Sayrga o'tish" : "Tepadan 2D xaritani ko'rish"}
                    >
                        {viewMode === "2D" ? (lang === "ru" ? "🚶 3D" : "🚶 3D") : (lang === "ru" ? "🗺️ 2D" : "🗺️ 2D")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
                        title={isExpanded ? "Kichiklashtirish" : "Kattalashtirish"}
                    >
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* SVG FLOOR PLAN */}
            <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
                <svg
                    viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                    className="w-full h-auto max-h-full select-none"
                    style={{ filter: "drop-shadow(0 0 10px rgba(6,182,212,0.15))" }}
                >
                    {/* Bino tashqi perimetr devorlari */}
                    <path
                        d={`
                            M ${toSvgX(-22)} ${toSvgY(-2)}
                            L ${toSvgX(-22)} ${toSvgY(6)}
                            L ${toSvgX(-20)} ${toSvgY(7)}
                            L ${toSvgX(-18)} ${toSvgY(7)}
                            L ${toSvgX(-18)} ${toSvgY(14)}
                            L ${toSvgX(-5)} ${toSvgY(14)}
                            L ${toSvgX(-4)} ${toSvgY(11)}
                            L ${toSvgX(0)} ${toSvgY(11)}
                            L ${toSvgX(0)} ${toSvgY(14)}
                            L ${toSvgX(15)} ${toSvgY(14)}
                            L ${toSvgX(16)} ${toSvgY(11)}
                            L ${toSvgX(17)} ${toSvgY(14)}
                            L ${toSvgX(27)} ${toSvgY(14)}
                            L ${toSvgX(28)} ${toSvgY(11)}
                            L ${toSvgX(28)} ${toSvgY(-14)}
                            L ${toSvgX(16)} ${toSvgY(-14)}
                            L ${toSvgX(15)} ${toSvgY(-11)}
                            L ${toSvgX(14)} ${toSvgY(-14)}
                            L ${toSvgX(-2)} ${toSvgY(-14)}
                            L ${toSvgX(-3)} ${toSvgY(-11)}
                            L ${toSvgX(-5)} ${toSvgY(-14)}
                            L ${toSvgX(-18)} ${toSvgY(-14)}
                            L ${toSvgX(-20)} ${toSvgY(-10)}
                            L ${toSvgX(-20)} ${toSvgY(-2)}
                            Z
                        `}
                        fill="#0b0f19"
                        stroke="#00f0ff"
                        strokeWidth="3.5"
                    />

                    {/* Checkout alohida bo'lim devori (Partition Wall) */}
                    <path
                        d={`
                            M ${toSvgX(16)} ${toSvgY(-5.5)}
                            L ${toSvgX(16)} ${toSvgY(-0.8)}
                            M ${toSvgX(16)} ${toSvgY(2.2)}
                            L ${toSvgX(16)} ${toSvgY(5.0)}
                            M ${toSvgX(16)} ${toSvgY(-5.5)}
                            L ${toSvgX(28)} ${toSvgY(-5.5)}
                            M ${toSvgX(16)} ${toSvgY(5.0)}
                            L ${toSvgX(28)} ${toSvgY(5.0)}
                        `}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                    />

                    {/* Navigatsiya chiziqlari (Circuit navigation lines) */}
                    <path
                        d={`
                            M ${toSvgX(-20)} ${toSvgY(3)}
                            L ${toSvgX(0)} ${toSvgY(3)}
                            L ${toSvgX(16)} ${toSvgY(1)}
                        `}
                        fill="none"
                        stroke="#00f0ff"
                        strokeWidth="2"
                        strokeOpacity="0.7"
                    />

                    {/* Bo'lim zonalari & Bosiladigan hududlar */}
                    {departments.map((dept, i) => (
                        <g
                            key={i}
                            className="cursor-pointer transition-opacity hover:opacity-100 opacity-85"
                            onClick={() => onTeleportZone(dept.id)}
                        >
                            <rect
                                x={dept.x}
                                y={dept.y}
                                width={dept.w}
                                height={dept.h}
                                rx="8"
                                fill={dept.color}
                                stroke="rgba(255,255,255,0.12)"
                                strokeWidth="1"
                            />
                            <text
                                x={dept.x + dept.w / 2}
                                y={dept.y + dept.h / 2 + 1}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#ffffff"
                                fontSize={isExpanded ? 11 : 8.5}
                                fontWeight="800"
                                className="pointer-events-none select-none font-sans"
                            >
                                {dept.icon} {lang === "ru" ? dept.nameRu : dept.nameUz}
                            </text>
                        </g>
                    ))}

                    {/* O'yinchi pozitsiyasi va ko'rish yo'nalishi (Player Marker) */}
                    <g transform={`translate(${px}, ${py})`}>
                        {/* Ko'rish yo'nalishi nuri (Cone of vision) */}
                        <path
                            d="M 0 0 L -14 -28 L 14 -28 Z"
                            fill="rgba(16, 185, 129, 0.35)"
                            transform={`rotate(${rotationDeg})`}
                        />
                        {/* Pulsatsiyalanuvchi yashil doira */}
                        <circle r="7" fill="#10b981" className="animate-ping opacity-60" />
                        <circle r="4.5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Kichik o'q */}
                        <g transform={`rotate(${rotationDeg})`}>
                            <polygon points="0,-7 -3,1 0,-1 3,1" fill="#ffffff" />
                        </g>
                    </g>
                </svg>
            </div>

            {/* QUICK TELEPORT TOOLBAR (Agar kengaytirilgan bo'lsa) */}
            {isExpanded && (
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-neutral-400">
                        {lang === "ru"
                            ? "Нажмите на любой отдел для быстрого перемещения:"
                            : "Istalgan bo'limga tezkor o'tish uchun ustiga bosing:"}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => {
                                onTeleportZone("exterior");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                            🚪 {lang === "ru" ? "Вход" : "Kirish"}
                        </button>
                        <button
                            onClick={() => {
                                onTeleportZone("trimmers");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                            ❄️ {lang === "ru" ? "Кр. Бытовая" : "Katta Maishiy"}
                        </button>
                        <button
                            onClick={() => {
                                onTeleportZone("gadgets");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                            📱 Mobile & Tablets
                        </button>
                        <button
                            onClick={() => {
                                onTeleportZone("hair_care");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                            📺 TV & Sound
                        </button>
                        <button
                            onClick={() => {
                                onTeleportZone("shavers");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                            🍳 {lang === "ru" ? "Кухня" : "Oshxona"}
                        </button>
                        <button
                            onClick={() => {
                                onTeleportZone("all");
                                setIsExpanded(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium"
                        >
                            💳 {lang === "ru" ? "Касса" : "Kassa"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
