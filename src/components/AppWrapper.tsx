"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Link from "next/link";
import { MessageSquare, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
// NotificationHandler removed after Firebase cleanup
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";


import { Language } from "@/types";

export default function AppWrapper({ children, lang }: { children: React.ReactNode, lang?: string }) {
    const cart = useStore(state => state.cart);
    const user = useStore(state => state.user);
    const toast = useStore(state => state.toast);
    const setLanguage = useStore(state => state.setLanguage);

    const pathname = usePathname();

    // Sync language from URL to Store
    useEffect(() => {
        if (lang && (lang === 'uz' || lang === 'ru')) {
            setLanguage(lang as Language);
        }
    }, [lang, setLanguage]);

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
            if (path === "/catalog") return "Katalogni ko'rmoqda";
            if (path === "/checkout") return "Buyurtma bermoqda";
            if (path === "/account") return "Profilida";
            if (path === "/login") return "Kirish sahifasida";
            if (path.startsWith("/admin")) return "Admin Panelda";
            if (path.startsWith("/messages")) return "Xabarlarda";
            return path;
        };

        const updateActivity = async (action: string = "Ko'rmoqda") => {
            // Completely silent IP tracking - no toasts shown if this fails
            try {
                let currentIp = sessionStorage.getItem("tracked_ip") || "Unknown";
                if (currentIp === "Unknown") {
                    const ipRes = await fetch("https://api.ipify.org?format=json").catch(() => null);
                    if (ipRes && ipRes.ok) {
                        const ipData = await ipRes.json();
                        currentIp = ipData.ip;
                        sessionStorage.setItem("tracked_ip", currentIp);
                    }
                }

                // Skip tracking for Admin users (prevents 406 Not Acceptable)
                if (user?.phone === 'ADMIN') return;

                await supabase.from("user_status").upsert({
                    id: sessionId,
                    user_phone: user?.phone || null,
                    name: user?.name || "Mehmon",
                    ip_address: currentIp,
                    last_seen: new Date().toISOString(),
                    is_online: true,
                    current_path: getFriendlyPath(pathname),
                    last_action: action,
                    type: user?.phone ? "user" : "visitor"
                }, { onConflict: 'id' });
            } catch (error) {
                // Activity tracking xatosi — production-da yashirish, dev-da log qilish
                if (process.env.NODE_ENV === 'development') {
                    console.warn("[Activity Tracking]", error);
                }
            }
        };

        // Click tracking — debounce bilan optimallashtirilgan
        let clickTimeout: ReturnType<typeof setTimeout>;
        const handleGlobalClick = (e: MouseEvent) => {
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                const target = e.target as HTMLElement;
                let actionText = "Klikladi";

                if (target.closest('button')) {
                    const btn = target.closest('button');
                    actionText = btn?.innerText || btn?.ariaLabel || "Tugma bosildi";
                } else if (target.closest('a')) {
                    actionText = "Havolaga o'tdi";
                }

                updateActivity(actionText.substring(0, 30));
            }, 10000); 
        };

        document.addEventListener('click', handleGlobalClick);

        updateActivity();
        intervalId = setInterval(() => updateActivity(), 300000);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                updateActivity("Sahifaga qaytdi");
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('click', handleGlobalClick);
            document.removeEventListener("visibilitychange", handleVisibility);
            supabase.from("user_status").update({ is_online: false, updated_at: new Date().toISOString() }).eq("id", sessionId);
        };
    }, [user?.phone, pathname]);

    // Sync cart to Supabase
    useEffect(() => {
        if (!user?.phone) return;

        const syncCart = async () => {
            if (cart.length === 0) {
                await supabase.from("active_carts").delete().eq("user_phone", user.phone);
            } else {
                await supabase.from("active_carts").upsert({
                    user_phone: user.phone,
                    items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
                    updated_at: new Date().toISOString()
                });
            }
        };

        const timer = setTimeout(syncCart, 2000);
        return () => clearTimeout(timer);
    }, [cart, user?.phone]);



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

    const showNav = !isCheckout && !isPayment && !isChat;

    return (
        <div className={`
            mx-auto bg-white min-h-screen relative w-full max-w-full lg:max-w-[1440px] overflow-x-clip
            ${showNav ? (pathname === '/' ? 'pt-16 md:pt-28' : 'md:pt-28') : ''}
        `}>
            {showNav && (
                <Suspense fallback={<div className="h-16 md:h-28 bg-white" />}>
                    <Navigation />
                </Suspense>
            )}

            <ErrorBoundary>
                <PWAInstallPrompt />

                {children}
            </ErrorBoundary>

            {showNav && <Footer />}

            {/* Animated Toast Notification — to'g'ri subscribe qilingan */}
            {toast && !toast.message.toLowerCase().includes('failed to fetch') && (
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
