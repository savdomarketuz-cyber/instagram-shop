"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Image from "next/image";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // 1. Ilova ichidan kirilganini tekshirish
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone;

        if (isStandalone) {
            setIsAppInstalled(true);
            return;
        }

        // 2. O'rnatish hodisasini tutib olish
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            const isDismissed = localStorage.getItem('pwa-banner-dismissed');
            if (!isDismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Agar brauzer qo'llab-quvvatlamasa ham, foydalanuvchiga ko'rsatib turish uchun
        // (Uzum Market stilida)
        const isDismissed = localStorage.getItem('pwa-banner-dismissed');
        if (!isDismissed && !isStandalone) {
            // Android/iOS ekanligini tekshirish (faqat mobilda chiqishi uchun)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                setIsVisible(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // Agar brauzerda prompt hali yo'q bo'lsa (masalan iOS), tushuntirish berish mumkin
            alert("Ilovani o'rnatish uchun brauzer menyusidan 'Add to Home Screen' tugmasini bosing.");
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-banner-dismissed', 'true');
    };

    if (!isVisible || isAppInstalled) return null;

    return (
        <div className="bg-[#F2F4F7] border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-[100] animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleDismiss}
                    className="p-1 text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-gray-50 flex-shrink-0">
                        <Image src="/logo.png" alt="Velari" width={32} height={32} className="object-contain" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-gray-900 leading-none">Velari Market</p>
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">Ilovani yuklab olish</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleInstallClick}
                className="bg-[#7000FF] hover:bg-[#5e00d6] text-white text-[11px] font-bold px-5 py-2.5 rounded-lg active:scale-95 transition-all shadow-lg shadow-purple-500/20"
            >
                Yuklab olish
            </button>
        </div>
    );
}
