"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Zap, ArrowUp } from "lucide-react";

interface VirtualJoystickProps {
    onMove: (vector: { x: number; y: number }) => void;
    onJump: () => void;
    onSprintToggle: (sprint: boolean) => void;
    isSprinting: boolean;
}

const JOYSTICK_RADIUS = 52; // Max distance knob can travel from center

export default function VirtualJoystick({
    onMove,
    onJump,
    onSprintToggle,
    isSprinting
}: VirtualJoystickProps) {
    const baseRef = useRef<HTMLDivElement>(null);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isActive, setIsActive] = useState(false);
    const activePointerIdRef = useRef<number | null>(null);
    const centerRef = useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (activePointerIdRef.current !== null) return;
        activePointerIdRef.current = e.pointerId;

        const base = baseRef.current;
        if (!base) return;

        base.setPointerCapture(e.pointerId);
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        centerRef.current = { x: centerX, y: centerY };

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);
        const clampedDist = Math.min(distance, JOYSTICK_RADIUS);
        const angle = Math.atan2(deltaY, deltaX);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        setKnobPos({ x: knobX, y: knobY });
        setIsActive(true);

        // Normalize to -1.0 .. 1.0 (Y inverted so UP is positive forward)
        const normX = knobX / JOYSTICK_RADIUS;
        const normY = -(knobY / JOYSTICK_RADIUS);
        onMove({ x: normX, y: normY });
    }, [onMove]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activePointerIdRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const deltaX = e.clientX - centerRef.current.x;
        const deltaY = e.clientY - centerRef.current.y;
        const distance = Math.hypot(deltaX, deltaY);
        const clampedDist = Math.min(distance, JOYSTICK_RADIUS);
        const angle = Math.atan2(deltaY, deltaX);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        setKnobPos({ x: knobX, y: knobY });

        // Normalize: X (-1 left, +1 right), Y (+1 forward, -1 backward)
        const normX = knobX / JOYSTICK_RADIUS;
        const normY = -(knobY / JOYSTICK_RADIUS);
        onMove({ x: normX, y: normY });
    }, [onMove]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activePointerIdRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        activePointerIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        setIsActive(false);
        onMove({ x: 0, y: 0 });
    }, [onMove]);

    // Safety release on unmount or blur
    useEffect(() => {
        return () => {
            onMove({ x: 0, y: 0 });
        };
    }, [onMove]);

    return (
        <div className="fixed bottom-6 left-5 z-40 flex items-end gap-3 select-none pointer-events-auto touch-none no-drag">
            {/* ANALOG TOUCH JOYSTICK BASE */}
            <div
                ref={baseRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`relative flex h-32 w-32 items-center justify-center rounded-full border border-white/40 backdrop-blur-2xl transition-all shadow-[0_10px_35px_rgba(0,0,0,0.22)] ${
                    isActive
                        ? "bg-black/45 border-emerald-500/60 ring-2 ring-emerald-500/30 scale-105"
                        : "bg-black/30 border-white/30"
                }`}
                style={{ touchAction: "none" }}
            >
                {/* Visual Directional Guides (Crosshair ticks) */}
                <div className="absolute h-full w-[1.5px] bg-white/15" />
                <div className="absolute w-full h-[1.5px] bg-white/15" />
                <div className="absolute h-16 w-16 rounded-full border border-white/10" />

                {/* THUMB KNOB */}
                <div
                    className={`absolute flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform ease-out ${
                        isActive
                            ? "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/50 scale-110"
                            : "bg-white/80 text-emerald-950 backdrop-blur-md"
                    }`}
                    style={{
                        transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                        transitionDuration: isActive ? "0ms" : "180ms"
                    }}
                >
                    <div
                        className={`h-4 w-4 rounded-full border-2 ${
                            isActive ? "border-white bg-white/40" : "border-emerald-600 bg-emerald-600/30"
                        }`}
                    />
                </div>
            </div>

            {/* ACTION BUTTONS: SPRINT & JUMP */}
            <div className="flex flex-col gap-2.5 pb-2">
                {/* JUMP BUTTON (Minecraft Jump) */}
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onJump();
                    }}
                    className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-emerald-950 shadow-xl backdrop-blur-2xl active:bg-emerald-600 active:text-white active:scale-90 transition-all ring-1 ring-black/5"
                    title="Sakrash (Jump)"
                >
                    <ArrowUp size={22} className="stroke-[2.5]" />
                </button>

                {/* SPRINT BUTTON */}
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSprintToggle(!isSprinting);
                    }}
                    className={`flex h-13 w-13 items-center justify-center rounded-2xl border text-xs font-black shadow-xl backdrop-blur-2xl transition-all active:scale-90 ${
                        isSprinting
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/40"
                            : "bg-white/90 text-emerald-950 border-white/40 ring-1 ring-black/5"
                    }`}
                    title="Tez yugurish (Sprint)"
                >
                    <Zap size={20} className={isSprinting ? "fill-white" : "text-emerald-700"} />
                </button>
            </div>
        </div>
    );
}
