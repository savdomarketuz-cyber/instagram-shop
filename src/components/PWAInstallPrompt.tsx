"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare, ArrowBigDown } from "lucide-react";
import Logo from "./Logo";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showIosInstructions, setShowIosInstructions] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Device Detection
        const isIosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        setIsIos(isIosDevice);

        // 1. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone;

        if (isStandalone) {
            setIsAppInstalled(true);
            return;
        }

        // 2. Browser Install Prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            const isDismissed = localStorage.getItem('pwa-banner-dismissed');
            if (!isDismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Force visibility for mobile trial
        const isDismissed = localStorage.getItem('pwa-banner-dismissed');
        if (!isDismissed && !isStandalone) {
            const isMobile = isIosDevice || /Android/i.test(navigator.userAgent);
            if (isMobile) {
                setIsVisible(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (isIos) {
            setShowIosInstructions(true);
            return;
        }

        if (!deferredPrompt) return;

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

    if (isAppInstalled) return null;

    return (
        <>
            {/* Top Banner (Always Visible if not installed) */}
            {isVisible && (
                <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-[100] shadow-sm animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleDismiss}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                                <Logo size="sm" showSmile={false} />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-gray-900 leading-none">Velari Market</p>
                                <p className="text-[11px] text-gray-500 mt-1 font-medium">Tez va qulay ilovamizni o&apos;rnating</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleInstallClick}
                        className="bg-[#2d6e3e] hover:bg-[#1f5430] text-white text-[11px] font-bold px-5 py-2.5 rounded-lg active:scale-95 transition-all"
                    >
                        O&apos;rnatish
                    </button>
                </div>
            )}

            {/* iOS Smart Instructions Modal */}
            {showIosInstructions && (
                <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Ilovani o&apos;rnatish</h3>
                                <button onClick={() => setShowIosInstructions(false)} className="p-2 bg-gray-50 rounded-full">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-6 text-left">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                        <Share size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 leading-tight">1. Ulashish tugmasini bosing</p>
                                        <p className="text-xs text-gray-500 mt-1">Brauzerning pastki panelidagi ulashish belgisini toping</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                        <PlusSquare size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 leading-tight">2. Asosiy ekranga qo&apos;shish</p>
                                        <p className="text-xs text-gray-500 mt-1">Menyudan &quot;Add to Home Screen&quot; bandini tanlang</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col items-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4">Pastga qarang</p>
                                <ArrowBigDown className="text-blue-500 animate-bounce" size={32} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

