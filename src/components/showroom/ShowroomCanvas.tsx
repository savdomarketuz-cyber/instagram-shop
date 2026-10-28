"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, MousePointer, Sparkles } from "lucide-react";
import { Product } from "@/types";
import {
    buildShowroomStands,
    DOCK_TARGETS,
    ShowroomZone,
    ShowroomShowcaseStand
} from "./showroom-data";
import { ShowroomWorld } from "./ShowroomWorld";
import { ShowroomControls } from "./ShowroomControls";
import { ShowroomAudio } from "./ShowroomAudio";
import VirtualJoystick from "./VirtualJoystick";
import ProductDetailOverlay from "./ProductDetailOverlay";
import NavigationDock from "./NavigationDock";
import ShowroomControlsHelp from "./ShowroomControlsHelp";
import ShowroomMiniMap from "./ShowroomMiniMap";
import { translations } from "@/lib/translations";

interface ShowroomCanvasProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

export default function ShowroomCanvas({ initialProducts, lang }: ShowroomCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<ShowroomWorld | null>(null);
    const controlsRef = useRef<ShowroomControls | null>(null);
    const audioRef = useRef<ShowroomAudio | null>(null);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeZone, setActiveZone] = useState<ShowroomZone>("all");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const [invertY, setInvertY] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [viewMode, setViewMode] = useState<"3D" | "2D">("3D");
    const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number }>({ x: -19, z: 3 });
    const [playerYaw, setPlayerYaw] = useState<number>(Math.PI / 2);

    const t = translations[lang];

    // Sensorli qurilmani aniqlash
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            setIsTouchDevice(hasTouch);
        };
        checkTouch();
    }, []);

    // Ambient Lofi / Lounge fon musiqasini yoqish/o'chirish
    const toggleSound = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new ShowroomAudio();
        }
        const state = audioRef.current.toggle();
        setSoundEnabled(state);
    }, []);

    const toggleInvertY = useCallback(() => {
        setInvertY((prev) => {
            const next = !prev;
            if (controlsRef.current) {
                controlsRef.current.invertY = next;
            }
            return next;
        });
    }, []);

    const toggleViewMode = useCallback(() => {
        if (controlsRef.current && worldRef.current) {
            const nextMode = controlsRef.current.toggleViewMode();
            const is2D = nextMode === "TOP_DOWN_2D";
            worldRef.current.setCeilingVisible(!is2D);
            setViewMode(is2D ? "2D" : "3D");
        }
    }, []);

    const handleSelectZone = useCallback((zone: ShowroomZone) => {
        setActiveZone(zone);
        const target = DOCK_TARGETS[zone];
        if (target && controlsRef.current) {
            if (controlsRef.current.mode === "TOP_DOWN_2D") {
                controlsRef.current.setViewMode("FREE_ROAM");
                worldRef.current?.setCeilingVisible(true);
                setViewMode("3D");
            }
            controlsRef.current.teleportTo(target.cameraPos, target.lookAt);
        }
    }, []);

    const handleSelectProduct = useCallback((item: { stand: ShowroomShowcaseStand; product: Product }) => {
        setSelectedProduct(item.product);
        if (controlsRef.current) {
            controlsRef.current.inspectStand(item);
        }
    }, []);

    const handleCloseOverlay = useCallback(() => {
        setSelectedProduct(null);
        if (controlsRef.current) {
            controlsRef.current.exitInspect();
        }
    }, []);

    // Suzuvchi Dinamik Joystik harakatlari
    const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
        if (controlsRef.current) {
            controlsRef.current.setJoystickMove(vector);
        }
    }, []);

    const handleJoystickJump = useCallback(() => {
        if (controlsRef.current) {
            controlsRef.current.jump();
        }
    }, []);

    const handleJoystickTap = useCallback((clientX: number, clientY: number) => {
        if (controlsRef.current) {
            controlsRef.current.checkTapOnProduct(clientX, clientY);
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. 48 TA VITRINA STENDLARINI QURISH (8 ta stol x 2 tomon x 3 tadan)
        const stands = buildShowroomStands(initialProducts);

        // 2. 3D VR OLAMINI ISHGA TUSHIRISH (World Engine)
        const world = new ShowroomWorld(container, stands, lang, initialProducts);
        worldRef.current = world;

        // 3. MINECRAFT FIZIKASI VA FAQAT TO'G'RIDAN-TO'G'RI BOSILGANDA OCHILUVCHI BOSHQARUV TIZIMI
        const controls = new ShowroomControls(
            container,
            world.camera,
            world.interactiveMeshes,
            {
                onSelectProduct: (item) => {
                    setSelectedProduct(item.product);
                },
                onCloseOverlay: () => {
                    setSelectedProduct(null);
                },
                onPointerLockChange: (locked) => {
                    setIsPointerLocked(locked);
                },
                onViewModeChange: (mode) => {
                    const is2D = mode === "TOP_DOWN_2D";
                    world.setCeilingVisible(!is2D);
                    setViewMode(is2D ? "2D" : "3D");
                }
            }
        );
        controls.invertY = invertY;
        controlsRef.current = controls;

        // 4. ANIMATSIYA VA RENDER HALQASI (60 FPS OPTIMALLASHGAN)
        let animationFrameId: number;
        let frameCount = 0;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1);

            // Fizika va kamera yangilanishi
            controls.update(delta);

            // Stendlardagi rasmlar har 3 soniyada avtomatik navbatlanishi
            world.update(delta);

            // Render
            world.render();

            // Har 6-kadrda Mini-Map pozitsiyasini sinxronlash (60 FPS ga ta'sir qilmaydi)
            frameCount++;
            if (frameCount % 6 === 0) {
                setPlayerCoords({ x: controls.playerPos.x, z: controls.playerPos.z });
                setPlayerYaw(controls.yaw);
            }
        };

        animate();
        setIsLoading(false);

        // 5. RESPONSIVE RESIZE HODISASI
        const onResize = () => {
            world.handleResize();
        };
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", onResize);
            controls.dispose();
            world.dispose();
            if (audioRef.current) {
                audioRef.current.dispose();
                audioRef.current = null;
            }
            controlsRef.current = null;
            worldRef.current = null;
        };
    }, [initialProducts, lang, invertY]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0c0e12] select-none font-sans">
            {/* 3D WebGL Canvas Conteyneri */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

            {/* MOBIL QURILMALAR UCHUN SUZUVCHI DINAMIK JOYSTIK (Ekranning chap yarmida qayerga bosilsa o'sha yerda paydo bo'ladi) */}
            {!selectedProduct && !isLoading && (isTouchDevice || true) && (
                <div className="sm:hidden">
                    <VirtualJoystick
                        onMove={handleJoystickMove}
                        onJump={handleJoystickJump}
                        onTap={handleJoystickTap}
                    />
                </div>
            )}

            {/* POINTER LOCK ISHORASI (Faqat kompyuterda) */}
            {!isPointerLocked && !selectedProduct && !isLoading && (
                <div className="pointer-events-none fixed top-6 left-1/2 z-30 -translate-x-1/2 animate-in fade-in duration-300 hidden sm:block">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                        <MousePointer size={14} className="text-emerald-400 animate-bounce" />
                        <span>{lang === "ru" ? "Кликните для управления WASD + мышь (клик по товару для просмотра)" : "Simulyator boshqaruviga kirish uchun ekranni bosing"}</span>
                    </div>
                </div>
            )}

            {/* YUKLANISH KO'RSATKICHI */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0e12] text-white">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                        <div className="absolute h-full w-full rounded-full border-2 border-emerald-500/20 animate-ping" />
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <Sparkles size={20} className="absolute text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
                        Velari Showroom yuklanmoqda...
                    </span>
                </div>
            )}

            {/* YUQORI CHAP MENYU: CHIQISH TUGMASI */}
            <div className="fixed top-6 left-6 z-30 flex items-center gap-3">
                <Link
                    href={`/${lang}`}
                    className="flex h-11 items-center gap-2.5 rounded-full border border-white/10 bg-black/60 px-4 text-xs font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:bg-black/80 hover:scale-105 active:scale-95 ring-1 ring-white/10"
                >
                    <ArrowLeft size={16} />
                    <span>{t.showroom.backToShop}</span>
                </Link>
            </div>

            {/* YUQORI O'NG BOSHQARUV: 2D XARITA, OVOZ VA Y-O'QI SOZLAMASI */}
            <div className="fixed top-6 right-6 z-30 flex items-center gap-2">
                <button
                    onClick={toggleViewMode}
                    className={`flex h-11 px-3.5 sm:px-4 items-center gap-1.5 sm:gap-2 rounded-full border text-xs font-bold transition-all shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl ring-1 ring-white/10 ${
                        viewMode === "2D"
                            ? "bg-cyan-500 text-black border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)] scale-105"
                            : "bg-black/60 border-white/10 text-white hover:bg-black/80 hover:scale-105"
                    }`}
                    title={viewMode === "2D" ? (lang === "ru" ? "Вернуться в 3D" : "3D Sayrga qaytish") : (lang === "ru" ? "2D План магазина" : "2D Do'kon xaritasi")}
                >
                    <span className="text-sm">{viewMode === "2D" ? "🚶" : "🗺️"}</span>
                    <span>{viewMode === "2D" ? (t.showroom as any).view3d || "3D Sayr" : (t.showroom as any).view2d || "2D Xarita"}</span>
                </button>

                <button
                    onClick={toggleInvertY}
                    className={`flex h-11 px-3.5 items-center justify-center rounded-full border text-xs font-bold transition-all shadow-sm backdrop-blur-xl ring-1 ring-white/10 ${
                        invertY
                            ? "bg-emerald-600 text-white border-emerald-400"
                            : "bg-black/60 border-white/10 text-neutral-300 hover:bg-black/80"
                    }`}
                    title={invertY ? "Invert Y: Yoqilgan (Yuqori/Past teskari)" : "Invert Y: O'chiq (Standart)"}
                >
                    Y: {invertY ? "REV" : "NORM"}
                </button>

                <button
                    onClick={toggleSound}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all shadow-sm backdrop-blur-xl ring-1 ring-white/10 ${
                        soundEnabled
                            ? "bg-emerald-600/90 text-white border-emerald-400 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                            : "bg-black/60 border-white/10 text-neutral-400 hover:bg-black/80 hover:text-white"
                    }`}
                    title={soundEnabled ? "Fon musiqasini o'chirish" : "Do'kon fon musiqasini yoqish"}
                >
                    {soundEnabled ? <Volume2 size={18} className="text-white animate-pulse" /> : <VolumeX size={18} />}
                </button>
            </div>

            {/* 2D DO'KON XARITASI VA RADAR (HUD) */}
            {!isLoading && (
                <ShowroomMiniMap
                    playerPos={playerCoords}
                    playerYaw={playerYaw}
                    viewMode={viewMode}
                    onToggleViewMode={toggleViewMode}
                    onTeleportZone={handleSelectZone}
                    lang={lang}
                />
            )}

            {/* O'YIN QO'LLANMASI (Faqat kompyuter ekranida) */}
            <ShowroomControlsHelp lang={lang} invertY={invertY} onToggleInvertY={toggleInvertY} />

            {/* PASTKI TOIFA DOCK'I */}
            <NavigationDock
                activeZone={activeZone}
                lang={lang}
                onSelectZone={handleSelectZone}
            />

            {/* MAHSULOT TAFSILOTLARI KARTASI */}
            <ProductDetailOverlay
                product={selectedProduct}
                lang={lang}
                onClose={handleCloseOverlay}
            />
        </div>
    );
}
