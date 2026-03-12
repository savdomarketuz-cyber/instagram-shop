"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";
import Link from "next/link";
import { MessageSquare, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffect, useState } from "react";
import { db, doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from "@/lib/firebase";
import NotificationHandler from "@/components/NotificationHandler";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";


export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const { cart, user } = useStore();
    const [isSplashActive, setIsSplashActive] = useState(true);
    const toast = useStore(state => state.toast);
    const pathname = usePathname();

    // Real-time Activity & Action Tracking
    useEffect(() => {
        let intervalId: any;
        const sessionId = user?.phone || (() => {
            const stored = localStorage.getItem("shop_visitor_id");
            if (stored) return stored;
            const newId = "visitor_" + Math.random().toString(36).substring(2, 11);
            localStorage.setItem("shop_visitor_id", newId);
            return newId;
        })();

        const getFriendlyPath = (path: string) => {
            if (path === "/") return "Asosiy sahifa";
            if (path.startsWith("/products/")) return "Mahsulot ko'rmoqda";
            if (path === "/cart") return "Savatda";
            if (path === "/wishlist") return "Saralanganlarda";
            if (path === "/checkout") return "Buyurtma bermoqda";
            if (path === "/account") return "Profilida";
            if (path.startsWith("/admin")) return "Admin Panelda";
            return path;
        };

        const updateActivity = async (action: string = "Ko'rmoqda") => {
            try {
                let currentIp = sessionStorage.getItem("tracked_ip") || "Unknown";
                // IP-ni faqat birinchi marta olish
                if (currentIp === "Unknown") {
                    try {
                        const ipRes = await fetch("https://api.ipify.org?format=json");
                        const ipData = await ipRes.json();
                        currentIp = ipData.ip;
                        sessionStorage.setItem("tracked_ip", currentIp);
                    } catch { }
                }

                await setDoc(doc(db, "user_status", sessionId), {
                    id: sessionId,
                    phone: user?.phone || null,
                    name: user?.name || "Mehmon",
                    ipAddress: currentIp,
                    lastSeen: serverTimestamp(),
                    isOnline: true,
                    currentPath: getFriendlyPath(pathname),
                    lastAction: action,
                    type: user?.phone ? "user" : "visitor"
                }, { merge: true });
            } catch (e) {
                // Silent fail for tracking
            }
        };

        // Click tracking
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            let actionText = "Klikladi";

            if (target.closest('button')) {
                const btn = target.closest('button');
                actionText = btn?.innerText || btn?.ariaLabel || "Tugma bosildi";
            } else if (target.closest('a')) {
                actionText = "Havolaga o'tdi";
            }

            updateActivity(actionText.substring(0, 30));
        };

        // addEventListener qo'shish — leak bo'lmasin
        document.addEventListener('click', handleGlobalClick);

        updateActivity();
        // Heartbeat-ni 60 soniyaga oshirish (15 o'rniga) — Firestore xarajatini kamaytirish
        intervalId = setInterval(() => updateActivity(), 60000);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                updateActivity("Sahifaga qaytdi");
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(intervalId);
            // To'g'ri cleanup — qo'shilganini olib tashlash
            document.removeEventListener('click', handleGlobalClick);
            document.removeEventListener("visibilitychange", handleVisibility);
            updateDoc(doc(db, "user_status", sessionId), { isOnline: false }).catch(() => { });
        };
    }, [user?.phone, pathname]);

    // Sync cart to Firestore
    useEffect(() => {
        if (!user?.phone) return;

        const syncCart = async () => {
            const userCartRef = doc(db, "active_carts", user.phone);
            if (cart.length === 0) {
                await deleteDoc(userCartRef).catch(() => { });
            } else {
                await setDoc(userCartRef, {
                    items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        };

        const timer = setTimeout(syncCart, 2000);
        return () => clearTimeout(timer);
    }, [cart, user?.phone]);

    // Cleanup Native PWA Splash
    useEffect(() => {
        const splash = document.getElementById('pwa-splash');
        if (splash) {
            // Wait for our cinematic animation to finish (approx 3.5s - 4s)
            const timer = setTimeout(() => {
                splash.style.transition = 'opacity 1s ease, visibility 1s';
                splash.style.opacity = '0';
                splash.style.visibility = 'hidden';
                setIsSplashActive(false);
                setTimeout(() => splash.remove(), 1000);
            }, 4000);
            return () => clearTimeout(timer);
        } else {
            setIsSplashActive(false);
        }
    }, []);

    const isAdmin = pathname?.startsWith("/admin");
    const isProductDetail = pathname?.startsWith("/products/") && pathname.split("/").length > 2;
    // Show navigation on main messages list, but hide inside actual chat rooms
    const isChat = pathname === "/chat" || (pathname?.startsWith("/messages/") && pathname !== "/messages");
    const isCheckout = pathname === "/checkout";
    const isPayment = pathname === "/payment";
    const isMessages = pathname === "/messages";

    // Manual Scroll Restoration Logic
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem(`scroll_${pathname}`, window.scrollY.toString());
        };

        const savedScroll = sessionStorage.getItem(`scroll_${pathname}`);
        if (savedScroll) {
            setTimeout(() => {
                window.scrollTo({
                    top: parseInt(savedScroll),
                    behavior: 'instant'
                });
            }, 50);
        }

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [pathname]);

    if (isAdmin) {
        return <>{children}</>;
    }

    const showNav = !isProductDetail && !isCheckout && !isPayment && !isChat;

    return (
        <div className={`
            mx-auto bg-white min-h-screen relative shadow-2xl 
            ${showNav ? 'md:pl-64' : ''}
            ${isSplashActive ? 'opacity-0 overflow-hidden h-screen' : 'opacity-100 transition-opacity duration-1000'}
        `}>
            <PWAInstallPrompt />
            <NotificationHandler />
            {children}

            {showNav && <Navigation />}


            {/* Animated Toast Notification — to'g'ri subscribe qilingan */}
            {toast && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-full duration-500">
                    <div className={`
                        flex items-center gap-3 p-4 rounded-3xl shadow-2xl backdrop-blur-xl border
                        ${toast.type === 'success' ? 'bg-black/90 text-white border-white/10' :
                            toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400/20' :
                                'bg-white/90 text-black border-gray-100'}
                    `}>
                        <div className="shrink-0">
                            {toast.type === 'success' && <CheckCircle size={20} className="text-green-400" />}
                            {toast.type === 'error' && <AlertCircle size={20} className="text-white" />}
                            {toast.type === 'info' && <Info size={20} className="text-blue-400" />}
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                            {toast.message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
