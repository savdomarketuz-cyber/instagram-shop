"use client";

import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { ChevronLeft, Rocket, ShieldCheck, Banknote, PackageCheck, RotateCcw, MessageCircle, Send, Instagram, Phone } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    const { language } = useStore();
    const t = translations[language];

    const icons = [
        <Rocket className="text-blue-500" size={24} />,
        <ShieldCheck className="text-green-500" size={24} />,
        <Banknote className="text-yellow-600" size={24} />,
        <PackageCheck className="text-purple-500" size={24} />,
        <RotateCcw className="text-red-500" size={24} />,
        <MessageCircle className="text-blue-400" size={24} />
    ];

    const contactIcons = {
        "Telegram": <Send size={20} />,
        "Instagram": <Instagram size={20} />,
        "Call center": <Phone size={20} />
    };

    return (
        <div className="bg-white min-h-screen text-black w-full overflow-x-hidden">
            <div className="w-full px-4 md:px-10 pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-12 pt-8 md:pt-0 w-full border-b border-gray-50 pb-6">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <Link href="/" className="p-3 bg-gray-50 rounded-[20px] hover:bg-gray-100 transition-all active:scale-90">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic uppercase truncate">
                                {t.aboutUs.title}
                            </h1>
                            <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 max-w-xs md:max-w-none line-clamp-1">
                                {t.aboutUs.subtitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Container */}
                <div className="max-w-4xl mx-auto space-y-16 md:space-y-24 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    
                    {/* 1. Brand Story */}
                    <section className="space-y-6">
                        <div className="inline-block px-4 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                             {t.aboutUs.mainTitle}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic leading-tight max-w-2xl">
                             Electronic Marketplace for Uzbekistan
                        </h2>
                        <div className="space-y-6">
                            {t.aboutUs.mainText.split('\n').map((line: string, i: number) => (
                                <p key={i} className="text-lg md:text-xl text-gray-600 leading-relaxed font-medium">
                                    {line}
                                </p>
                            ))}
                        </div>
                    </section>

                    {/* 2. Mission Section */}
                    <section className="bg-gray-50 rounded-[48px] p-8 md:p-16 border border-gray-100">
                        <h3 className="text-2xl font-black italic mb-6 uppercase tracking-tighter">{t.aboutUs.missionTitle}</h3>
                        <div className="space-y-6">
                            {t.aboutUs.missionText.split('\n').map((line: string, i: number) => (
                                <p key={i} className="text-base md:text-lg text-gray-500 leading-relaxed">
                                    {line}
                                </p>
                            ))}
                        </div>
                    </section>

                    {/* 3. Why Us Grid */}
                    <section className="space-y-12">
                        <div className="text-center space-y-4">
                            <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t.aboutUs.whyTitle}</h3>
                            <div className="h-1.5 w-20 bg-black mx-auto rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {t.aboutUs.whyItems.map((item: any, i: number) => (
                                <div key={i} className="p-8 bg-white border border-gray-100 rounded-[32px] hover:shadow-2xl transition-all duration-500 group">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        {icons[i] || <Rocket size={24} />}
                                    </div>
                                    <h4 className="text-xl font-black italic mb-3 tracking-tighter">{item.title}</h4>
                                    <p className="text-sm md:text-base text-gray-500 leading-relaxed">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. Stats Grid */}
                    <section className="space-y-10">
                         <h3 className="text-2xl font-black italic text-center md:text-left uppercase tracking-tighter">{t.aboutUs.statsTitle}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {t.aboutUs.stats.map((stat: string, i: number) => (
                                <div key={i} className="p-6 bg-black text-white rounded-3xl flex flex-col justify-center items-center text-center group hover:bg-neutral-900 transition-colors">
                                    <span className="text-2xl font-black italic tracking-tighter mb-2 group-hover:scale-105 transition-transform">
                                        {stat.split(' ')[0]}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                        {stat.substring(stat.indexOf(' ') + 1)}
                                    </span>
                                </div>
                            ))}
                         </div>
                    </section>

                    {/* 5. Promise */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-black text-white rounded-[48px] p-10 md:p-20">
                         <div className="relative z-10 space-y-8">
                            <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t.aboutUs.promiseTitle}</h3>
                            <div className="space-y-6">
                                {t.aboutUs.promiseText.split('\n').map((line: string, i: number) => (
                                    <p key={i} className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed">
                                        {line}
                                    </p>
                                ))}
                            </div>
                         </div>
                         {/* Abstract background element */}
                         <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                         <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    </section>

                    {/* 6. Contacts */}
                    <section className="space-y-12 pb-10">
                        <div className="text-center md:text-left space-y-4">
                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">{t.aboutUs.contactTitle}</h3>
                            <p className="text-gray-500 font-medium text-lg">{t.aboutUs.contactSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {t.aboutUs.contacts.map((contact: any, i: number) => (
                                <a 
                                    key={i} 
                                    href={contact.link}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="p-8 bg-gray-50 hover:bg-white border border-gray-100 hover:border-black rounded-[32px] transition-all hover:shadow-2xl group flex flex-col items-center md:items-start text-center md:text-left gap-4"
                                >
                                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/10">
                                        {(contactIcons as any)[contact.label] || <MessageCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{contact.label}</p>
                                        <p className="text-base font-black italic group-hover:text-black transition-colors">{contact.value}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
