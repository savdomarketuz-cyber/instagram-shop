import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PinKeypadProps {
    onComplete: (pin: string) => void;
    onForgotPin?: () => void;
    title: string;
    error?: string;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({ onComplete, onForgotPin, title, error }) => {
    const [pin, setPin] = useState('');

    const handlePress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                onComplete(newPin);
                // We don't reset immediately to show the 4th dot for a moment
                setTimeout(() => setPin(''), 500);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-12 py-10">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-black/20">
                    <Lock className="text-white" size={28} />
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{title}</h2>
                {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>}
            </div>

            {/* Dots */}
            <div className="flex space-x-6">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 border-black transition-all duration-300 ${
                            pin.length >= i ? 'bg-black scale-110' : 'bg-transparent'
                        }`}
                    />
                ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handlePress(num.toString())}
                        className="w-20 h-20 rounded-full bg-white text-2xl font-black shadow-sm border border-gray-100 active:bg-black active:text-white active:scale-90 transition-all flex items-center justify-center"
                    >
                        {num}
                    </button>
                ))}
                <div />
                <button
                    onClick={() => handlePress('0')}
                    className="w-20 h-20 rounded-full bg-white text-2xl font-black shadow-sm border border-gray-100 active:bg-black active:text-white active:scale-90 transition-all flex items-center justify-center"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="w-20 h-20 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center active:scale-90 transition-all"
                >
                    <Delete size={24} />
                </button>
            </div>
            
            {onForgotPin && (
                <button 
                    onClick={onForgotPin}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-all"
                >
                    Esdan chiqardim / Qayta tiklash
                </button>
            )}
        </div>
    );
};
