"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, X, Tag, Package, Percent } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/push-notifications";
import { useStore } from "@/store/store";

const DISMISS_KEY = "push-cta-dismissed-at";
const DISMISS_DAYS = 7;

export default function PushNotificationCTA() {
    const user = useStore(state => state.user);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        // Only show for logged-in users
        if (!user?.phone) return;
        if (!("Notification" in window)) return;

        // Don't show if already granted or denied
        if (Notification.permission !== "default") return;

        // Don't show if dismissed recently
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        // Show after 8 seconds to let user settle
        const timer = setTimeout(() => setVisible(true), 8000);
        return () => clearTimeout(timer);
    }, [user?.phone]);

    const handleEnable = async () => {
        setLoading(true);
        try {
            await subscribeToPushNotifications(user?.phone);
            setDone(true);
            setTimeout(() => setVisible(false), 2000);
        } catch {
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl shadow-black/15 border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1a4428] to-[#2d6e3e] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            {done
                                ? <BellRing size={20} className="text-white animate-bounce" />
                                : <Bell size={20} className="text-white" />
                            }
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-white/70">
                                Velari bildirishnomalar
                            </p>
                            <p className="text-sm font-black text-white leading-tight">
                                {done ? "Ulandi! Rahmat 🎉" : "Birinchi bo'lib biling"}
                            </p>
                        </div>
                    </div>
                    {!done && (
                        <button onClick={handleDismiss} className="p-1.5 text-white/50 hover:text-white">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Benefits */}
                {!done && (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                                <Percent size={14} className="text-red-500" />
                            </div>
                            <p className="text-[12px] font-semibold text-gray-700">Chegirma va aksiyalar haqida birinchi xabar</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                <Package size={14} className="text-blue-500" />
                            </div>
                            <p className="text-[12px] font-semibold text-gray-700">Buyurtma holati o'zgarganda bildirishnoma</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                <Tag size={14} className="text-amber-500" />
                            </div>
                            <p className="text-[12px] font-semibold text-gray-700">Saqlaganlarimdagi narx tushishi xabari</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-3 text-[11px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 rounded-2xl active:scale-95 transition-all"
                            >
                                Keyinroq
                            </button>
                            <button
                                onClick={handleEnable}
                                disabled={loading}
                                className="flex-[2] py-3 text-[11px] font-black uppercase tracking-wider text-white bg-[#2d6e3e] rounded-2xl shadow-lg shadow-green-900/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                <Bell size={14} />
                                {loading ? "Ulanmoqda..." : "Yoqish"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
