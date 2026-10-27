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
import VirtualJoystick from "./VirtualJoystick";
import ProductDetailOverlay from "./ProductDetailOverlay";
import NavigationDock from "./NavigationDock";
import ShowroomControlsHelp from "./ShowroomControlsHelp";
import { translations } from "@/lib/translations";

interface ShowroomCanvasProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

export default function ShowroomCanvas({ initialProducts, lang }: ShowroomCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<ShowroomWorld | null>(null);
    const controlsRef = useRef<ShowroomControls | null>(null);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeZone, setActiveZone] = useState<ShowroomZone>("all");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const [nearbyItem, setNearbyItem] = useState<{ stand: ShowroomShowcaseStand; product: Product } | null>(null);
    const [isAimedAtItem, setIsAimedAtItem] = useState(false);
    const [invertY, setInvertY] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isSprinting, setIsSprinting] = useState(false);

    const t = translations[lang];

    // Sensorli qurilmani aniqlash
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            setIsTouchDevice(hasTouch);
        };
        checkTouch();
    }, []);

    const toggleSound = useCallback(() => {
        setSoundEnabled((prev) => !prev);
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

    const handleSelectZone = useCallback((zone: ShowroomZone) => {
        setActiveZone(zone);
        const target = DOCK_TARGETS[zone];
        if (target && controlsRef.current) {
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

    // Virtual Joystick hodisalari
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

    const handleJoystickSprintToggle = useCallback((sprint: boolean) => {
        setIsSprinting(sprint);
        if (controlsRef.current) {
            controlsRef.current.isSprinting = sprint;
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. 24 TA VITRINA STENDLARINI QURISH (4 ta stol x 2 tomon x 3 tadan)
        const stands = buildShowroomStands(initialProducts);

        // 2. 3D VR OLAMINI ISHGA TUSHIRISH (World Engine)
        const world = new ShowroomWorld(container, stands, lang, {
            trimmers: t.showroom.trimmers,
            hairCare: t.showroom.hairCare,
            shavers: t.showroom.shavers,
            gadgets: t.showroom.gadgets
        });
        worldRef.current = world;

        // 3. MINECRAFT FIZIKASI VA BOSHQARUV TIZIMINI ISHGA TUSHIRISH (Controls Engine)
        const controls = new ShowroomControls(
            container,
            world.camera,
            stands,
            world.interactiveMeshes,
            {
                onSelectProduct: (item) => {
                    setSelectedProduct(item.product);
                },
                onCloseOverlay: () => {
                    setSelectedProduct(null);
                },
                onNearbyChange: (item, isAiming) => {
                    setNearbyItem(item);
                    setIsAimedAtItem(isAiming);
                },
                onPointerLockChange: (locked) => {
                    setIsPointerLocked(locked);
                }
            }
        );
        controls.invertY = invertY;
        controlsRef.current = controls;

        // 4. ANIMATSIYA VA RENDER HALQASI
        let animationFrameId: number;
        const clock = new THREE.Clock();
        let frameCount = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            frameCount++;
            const delta = Math.min(clock.getDelta(), 0.1);
            const elapsed = clock.getElapsedTime();

            // Fizika va boshqaruv yangilanishi
            controls.update(delta, frameCount);

            // 3D VR Olam yangilanishi (hotspotlar, animatsiyalar)
            world.update(elapsed, controls.nearbyItemData?.stand.id);

            // Render
            world.render();
        };

        animate();
        setIsLoading(false);

        // 5. RESPONSIVE RESIZE HODISASI (Telefon o'girilganda yoki ekran o'zgarganda)
        const onResize = () => {
            world.handleResize();
        };
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", onResize);
            controls.dispose();
            world.dispose();
            controlsRef.current = null;
            worldRef.current = null;
        };
    }, [initialProducts, lang, t, invertY]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#F5F5F7] select-none font-sans">
            {/* 3D WebGL Canvas Conteyneri */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

            {/* O'YIN MARKAZIY CROSSHAIR (GTA / MINECRAFT RETICLE) */}
            {!selectedProduct && (
                <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
                    <div
                        className={`flex items-center justify-center rounded-full transition-all duration-150 ${
                            isAimedAtItem
                                ? "h-6 w-6 border-2 border-emerald-500 bg-emerald-500/20 scale-125"
                                : "h-2.5 w-2.5 bg-black/40 border border-white/60"
                        }`}
                    >
                        {isAimedAtItem && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                    </div>
                </div>
            )}

            {/* GTA-USLUBIDAGI INTERAKTIV KO'RISH TUGMASI (PROMPT BANNER) */}
            {nearbyItem && !selectedProduct && (
                <div className="fixed bottom-20 sm:bottom-24 left-1/2 z-30 -translate-x-1/2 max-w-[calc(100vw-2rem)] w-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                        onClick={() => handleSelectProduct(nearbyItem)}
                        className="flex items-center gap-2.5 sm:gap-3 rounded-2xl border border-black/10 bg-white/95 px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_12px_35px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 ring-1 ring-black/5"
                    >
                        <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black uppercase text-white shadow-sm tracking-wider">
                            E
                        </span>
                        <div className="flex flex-col text-left overflow-hidden">
                            <span className="line-clamp-1 text-xs font-extrabold text-[#1d1d1f]">
                                {lang === "ru"
                                    ? nearbyItem.product.name_ru || nearbyItem.product.name
                                    : nearbyItem.product.name_uz || nearbyItem.product.name}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">
                                {nearbyItem.product.price?.toLocaleString("uz-UZ")} so&apos;m • {lang === "ru" ? "Осмотреть" : "Ko'rish"}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {/* MOBIL QURILMALAR UCHUN VIRTUAL ANALOG JOYSTIK */}
            {!selectedProduct && !isLoading && (isTouchDevice || true) && (
                <div className="sm:hidden">
                    <VirtualJoystick
                        onMove={handleJoystickMove}
                        onJump={handleJoystickJump}
                        onSprintToggle={handleJoystickSprintToggle}
                        isSprinting={isSprinting}
                    />
                </div>
            )}

            {/* POINTER LOCK ISHORASI (Faqat kompyuterda) */}
            {!isPointerLocked && !selectedProduct && !isLoading && (
                <div className="pointer-events-none fixed top-6 left-1/2 z-30 -translate-x-1/2 animate-in fade-in duration-300 hidden sm:block">
                    <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white/90 px-4 py-2 text-xs font-semibold text-[#1d1d1f] shadow-lg backdrop-blur-xl ring-1 ring-black/5">
                        <MousePointer size={14} className="text-emerald-600 animate-bounce" />
                        <span>{lang === "ru" ? "Кликните для управления WASD + мышь" : "Simulyator boshqaruviga kirish uchun ekranni bosing"}</span>
                    </div>
                </div>
            )}

            {/* YUKLANISH KO'RSATKICHI */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F5F7] text-[#1d1d1f]">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                        <div className="absolute h-full w-full rounded-full border-2 border-emerald-500/20 animate-ping" />
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                        <Sparkles size={20} className="absolute text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold tracking-wider uppercase text-[#86868b]">
                        Showroom yuklanmoqda...
                    </span>
                </div>
            )}

            {/* YUQORI CHAP MENYU: CHIQISH TUGMASI */}
            <div className="fixed top-6 left-6 z-30 flex items-center gap-3">
                <Link
                    href={`/${lang}`}
                    className="flex h-11 items-center gap-2.5 rounded-full border border-black/8 bg-white/90 px-4 text-xs font-semibold text-[#1d1d1f] shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:bg-white hover:scale-105 active:scale-95 ring-1 ring-black/5"
                >
                    <ArrowLeft size={16} />
                    <span>{t.showroom.backToShop}</span>
                </Link>
            </div>

            {/* YUQORI O'NG BOSHQARUV: OVOZ VA Y-O'QI SOZLAMASI */}
            <div className="fixed top-6 right-6 z-30 flex items-center gap-2">
                <button
                    onClick={toggleInvertY}
                    className={`flex h-11 px-3.5 items-center justify-center rounded-full border text-xs font-bold transition-all shadow-sm backdrop-blur-xl ring-1 ring-black/5 ${
                        invertY
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-white/90 border-black/8 text-[#1d1d1f] hover:bg-white"
                    }`}
                    title={invertY ? "Invert Y: Yoqilgan (Yuqori/Past teskari)" : "Invert Y: O'chiq (Standart)"}
                >
                    Y: {invertY ? "REV" : "NORM"}
                </button>

                <button
                    onClick={toggleSound}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white/90 text-[#1d1d1f] shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:bg-white hover:scale-105 active:scale-95 ring-1 ring-black/5"
                    title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
                >
                    {soundEnabled ? <Volume2 size={18} className="text-emerald-600" /> : <VolumeX size={18} className="text-[#86868b]" />}
                </button>
            </div>

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
