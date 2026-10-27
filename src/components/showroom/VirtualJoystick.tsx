"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface VirtualJoystickProps {
    onMove: (vector: { x: number; y: number }) => void;
    onJump: () => void;
    onTap?: (clientX: number, clientY: number) => void;
}

const JOYSTICK_RADIUS = 50;

export default function VirtualJoystick({ onMove, onJump, onTap }: VirtualJoystickProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [basePos, setBasePos] = useState({ x: 0, y: 0 });
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    const touchIdRef = useRef<number | null>(null);
    const originRef = useRef({ x: 0, y: 0 });
    const touchStartPosRef = useRef({ x: 0, y: 0 });
    const touchStartTimeRef = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Faqat ekranning chap yarmidagi (`clientX < window.innerWidth / 2`) teginishlar
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = touch.target as HTMLElement;

            // Agar tugma yoki havola ustiga bosilgan bo'lsa o'tkazib yuboramiz
            if (target.closest("button") || target.closest("a") || target.closest(".no-joystick")) {
                continue;
            }

            if (touch.clientX < window.innerWidth / 2 && touchIdRef.current === null) {
                touchIdRef.current = touch.identifier;
                originRef.current = { x: touch.clientX, y: touch.clientY };
                touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
                touchStartTimeRef.current = Date.now();

                setBasePos({ x: touch.clientX, y: touch.clientY });
                setKnobPos({ x: 0, y: 0 });
                setIsVisible(true);
                break;
            }
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (touchIdRef.current === null) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchIdRef.current) {
                const deltaX = touch.clientX - originRef.current.x;
                const deltaY = touch.clientY - originRef.current.y;
                const dist = Math.hypot(deltaX, deltaY);
                const clamped = Math.min(dist, JOYSTICK_RADIUS);
                const angle = Math.atan2(deltaY, deltaX);

                const kx = Math.cos(angle) * clamped;
                const ky = Math.sin(angle) * clamped;
                setKnobPos({ x: kx, y: ky });

                // Normalizatsiya (-1..1), Y yuqoriga musbat
                const normX = kx / JOYSTICK_RADIUS;
                const normY = -(ky / JOYSTICK_RADIUS);
                onMove({ x: normX, y: normY });
                break;
            }
        }
    }, [onMove]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (touchIdRef.current === null) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchIdRef.current) {
                const moveDist = Math.hypot(
                    touch.clientX - touchStartPosRef.current.x,
                    touch.clientY - touchStartPosRef.current.y
                );
                const elapsed = Date.now() - touchStartTimeRef.current;

                // Agar foydalanuvchi barmoqni siljitmasdan shunchaki bosgan bo'lsa (Tap):
                // Mahsulotga bosilgan bo'lishi mumkinligini tekshirish uchun onTap'ga uzatamiz!
                if (moveDist < 8 && elapsed < 280 && onTap) {
                    onTap(touch.clientX, touch.clientY);
                }

                touchIdRef.current = null;
                setIsVisible(false);
                setKnobPos({ x: 0, y: 0 });
                onMove({ x: 0, y: 0 });
                break;
            }
        }
    }, [onMove, onTap]);

    useEffect(() => {
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
        <>
            {/* FOYDALANUVCHI BARMOQ BOSGAN JOYDA PAYDO BO'LUVCHI SUZUVCHI JOYSTIK */}
            {isVisible && (
                <div
                    className="pointer-events-none fixed z-40 flex items-center justify-center rounded-full border border-emerald-400/50 bg-black/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)] -translate-x-1/2 -translate-y-1/2 animate-in fade-in duration-100"
                    style={{
                        left: `${basePos.x}px`,
                        top: `${basePos.y}px`,
                        width: `${JOYSTICK_RADIUS * 2 + 20}px`,
                        height: `${JOYSTICK_RADIUS * 2 + 20}px`
                    }}
                >
                    {/* Markaziy doira yo'naltiruvchisi */}
                    <div className="absolute h-10 w-10 rounded-full border border-white/20" />

                    {/* Silliq boshqaruv thumbstick tugmasi */}
                    <div
                        className="h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white"
                        style={{
                            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                            transition: "transform 16ms linear"
                        }}
                    >
                        <div className="h-4 w-4 rounded-full border-2 border-white bg-white/40" />
                    </div>
                </div>
            )}

            {/* SAKRASH (JUMP) TUGMASI — O'ng pastki tomonda qulay joylashgan */}
            <div className="fixed bottom-6 right-6 z-40 select-none pointer-events-auto touch-none no-joystick">
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onJump();
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-black/45 text-white shadow-2xl backdrop-blur-xl active:bg-emerald-600 active:scale-90 transition-all ring-1 ring-white/10"
                    title="Sakrash"
                >
                    <ArrowUp size={24} className="stroke-[2.5]" />
                </button>
            </div>
        </>
    );
}
