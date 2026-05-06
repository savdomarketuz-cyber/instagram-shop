"use client";

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function ConnectivityListener() {
    const [isOnline, setIsOnline] = useState(true);
    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowStatus(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showStatus && isOnline) return null;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[10000] transition-all duration-500 transform ${showStatus ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className={`flex items-center justify-center gap-3 px-6 py-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl ${isOnline ? 'bg-green-500 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                {isOnline ? (
                    <>
                        <Wifi size={16} strokeWidth={3} />
                        Internet aloqasi tiklandi
                    </>
                ) : (
                    <>
                        <WifiOff size={16} strokeWidth={3} />
                        Internet aloqasi mavjud emas
                    </>
                )}
            </div>
        </div>
    );
}
