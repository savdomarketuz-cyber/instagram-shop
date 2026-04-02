"use client";

import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    const { language } = useStore();
    const t = translations[language];

    return (
        <div className="bg-white min-h-screen text-black w-full overflow-x-hidden">
            <div className="w-full px-4 md:px-10 pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-16 pt-8 md:pt-0 w-full">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <Link href="/" className="p-3 bg-gray-50 rounded-[20px] hover:bg-gray-100 transition-all active:scale-90">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic uppercase truncate">
                            {t.aboutUs.title}
                        </h1>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="aspect-[21/9] bg-gray-100 rounded-[40px] overflow-hidden shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl font-black italic tracking-tighter uppercase text-white/40 group-hover:scale-110 transition-transform duration-700">Velari</span>
                        </div>
                    </div>

                    <div className="space-y-6 text-center md:text-left">
                        <p className="text-lg md:text-xl font-bold leading-relaxed text-gray-800">
                            {t.aboutUs.p1}
                        </p>
                        <p className="text-base md:text-lg text-gray-500 leading-relaxed font-medium">
                            {t.aboutUs.p2}
                        </p>
                        <div className="pt-6 border-t border-gray-100">
                             <p className="text-xl font-black italic uppercase tracking-widest text-black">
                                {t.aboutUs.p3}
                            </p>
                        </div>
                    </div>

                    {/* Features/Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                        <div className="p-8 bg-gray-100/50 rounded-[32px] border border-gray-100 transition-all hover:bg-white hover:shadow-xl hover:scale-105 duration-500">
                            <h3 className="text-3xl font-black italic mb-2 tracking-tighter">10k+</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Xaridorlar' : 'Покупателей'}</p>
                        </div>
                        <div className="p-8 bg-gray-100/50 rounded-[32px] border border-gray-100 transition-all hover:bg-white hover:shadow-xl hover:scale-105 duration-500">
                            <h3 className="text-3xl font-black italic mb-2 tracking-tighter">24/7</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Qo\'llab-quvvatlash' : 'Поддержка'}</p>
                        </div>
                        <div className="p-8 bg-gray-100/50 rounded-[32px] border border-gray-100 transition-all hover:bg-white hover:shadow-xl hover:scale-105 duration-500">
                            <h3 className="text-3xl font-black italic mb-2 tracking-tighter">100%</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Kafolat' : 'Гарантия'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
