"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";

interface WatchedProductProps {
    product: Product;
    userPhone?: string | null;
    children: React.ReactNode;
}

// ── 1) Umumiy (singleton) IntersectionObserver — 20+ alohida observer o'rniga bitta ──
type IntersectionHandler = (isIntersecting: boolean) => void;
const observedHandlers = new Map<Element, IntersectionHandler>();
let sharedObserver: IntersectionObserver | null = null;

function observeProductCard(el: Element, handler: IntersectionHandler): () => void {
    observedHandlers.set(el, handler);
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const cb = observedHandlers.get(entry.target);
                    if (cb) cb(entry.isIntersecting);
                }
            },
            { threshold: 0.8 }
        );
    }
    sharedObserver.observe(el);

    return () => {
        observedHandlers.delete(el);
        sharedObserver?.unobserve(el);
        if (observedHandlers.size === 0 && sharedObserver) {
            sharedObserver.disconnect();
            sharedObserver = null;
        }
    };
}

// ── 2) Global throttled navbat — har 800ms da ko'pi bilan 1 ta so'rov `requestIdleCallback` orqali ──
const TRACK_INTERVAL_MS = 800;

interface TrackTask {
    key: string;
    execute: () => Promise<void>;
}

const trackQueue: TrackTask[] = [];
const queuedKeys = new Set<string>();
let isProcessingTrackQueue = false;
let lastTrackTime = 0;

function runInIdle(fn: () => void): void {
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(() => fn(), { timeout: 2500 });
    } else {
        setTimeout(fn, 50);
    }
}

function drainTrackQueue(): void {
    if (isProcessingTrackQueue || trackQueue.length === 0) return;
    isProcessingTrackQueue = true;

    const now = Date.now();
    const waitMs = lastTrackTime === 0 ? 0 : Math.max(0, TRACK_INTERVAL_MS - (now - lastTrackTime));

    setTimeout(() => {
        runInIdle(async () => {
            const task = trackQueue.shift();
            if (!task) {
                isProcessingTrackQueue = false;
                return;
            }
            queuedKeys.delete(task.key);
            lastTrackTime = Date.now();

            if (!document.hidden) {
                try {
                    await task.execute();
                } catch {
                    /* sokin */
                }
            }

            isProcessingTrackQueue = false;
            if (trackQueue.length > 0) {
                drainTrackQueue();
            }
        });
    }, waitMs);
}

function enqueueTracking(key: string, execute: () => Promise<void>): void {
    if (queuedKeys.has(key)) return;
    queuedKeys.add(key);
    trackQueue.push({ key, execute });
    drainTrackQueue();
}

export const WatchedProduct = ({ product, userPhone, children }: WatchedProductProps) => {
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const elementRef = useRef<HTMLDivElement>(null);
    const hasTrackedStageRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (!userPhone || !elementRef.current) return;

        const clearTimers = () => {
            timersRef.current.forEach(clearTimeout);
            timersRef.current = [];
        };

        const scheduleTrack = (weight: number, stage: number) => {
            if (document.hidden || hasTrackedStageRef.current.has(stage)) return;
            const key = `${userPhone}:${product.id}:${stage}`;

            enqueueTracking(key, async () => {
                if (document.hidden || hasTrackedStageRef.current.has(stage)) return;
                try {
                    const { error } = await supabase.rpc("track_product_view", {
                        p_user_phone: userPhone,
                        p_product_id: product.id,
                        p_category_id: product.category,
                        p_weight: weight,
                    });

                    if (error) throw error;

                    await fetch("/api/ai/recommendations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "log_activity",
                            logData: {
                                userPhone,
                                action: `Interest Tracked (Stage ${stage})`,
                                input: { categories: { [product.category]: weight } },
                                output: [product.id],
                            },
                        }),
                    });

                    hasTrackedStageRef.current.add(stage);
                } catch (e) {
                    console.error("Interest tracking failed:", e);
                }
            });
        };

        const unobserve = observeProductCard(elementRef.current, (isIntersecting) => {
            if (isIntersecting) {
                clearTimers();
                timersRef.current.push(setTimeout(() => scheduleTrack(1, 1), 4000));
                timersRef.current.push(setTimeout(() => scheduleTrack(2, 2), 8000));
                timersRef.current.push(setTimeout(() => scheduleTrack(3, 3), 15000));
            } else {
                clearTimers();
            }
        });

        return () => {
            clearTimers();
            unobserve();
        };
    }, [product.id, userPhone, product.category]);

    return <div ref={elementRef} className="h-full">{children}</div>;
};
