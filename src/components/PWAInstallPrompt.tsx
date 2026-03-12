"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // 1. Check if already running as standalone (PWA installed and opened)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone || 
                           document.referrer.includes('android-app://');

        if (isStandalone) {
            setIsAppInstalled(true);
            return;
        }

        // 2. Listen for the install prompt event
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Show prompt only if not dismissed in this session
            const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
            if (!isDismissed) {
                // Delay showing to not annoy immediately
                setTimeout(() => setIsVisible(true), 3000);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Detect when app is installed
        window.addEventListener('appinstalled', () => {
            setIsAppInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!isVisible || isAppInstalled) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Smartphone className="text-black" size={24} />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white text-sm font-black italic tracking-tight uppercase leading-none mb-1">Velari App</p>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest leading-none">Ilovani o'rnating</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleInstallClick}
                        className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Download size={14} strokeWidth={3} />
                        O'rnatish
                    </button>
                    <button 
                        onClick={handleDismiss}
                        className="p-3 text-white/30 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
