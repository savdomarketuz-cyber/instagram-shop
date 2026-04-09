"use client";

import Link from "next/link";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { Instagram, Send, Facebook, Youtube } from "lucide-react";

export default function Footer() {
    const { language } = useStore();
    const t = translations[language];

    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-32 md:pb-12 px-4 md:px-10 mt-20">
            <div className="max-w-[1440px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-16">
                    {/* Column 1: Biz haqimizda */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{t.footer.about}</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/about" className="text-gray-500 hover:text-black text-xs transition-colors">
                                    {t.footer.about}
                                </Link>
                            </li>
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.deliveryPoints}
                                </span>
                            </li>
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.vacancies}
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 2: Foydalanuvchilarga */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{t.footer.forUsers}</h4>
                        <ul className="space-y-3">
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.contactUs}
                                </span>
                            </li>
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.faq}
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Tadbirkorlarga */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{t.footer.forEntrepreneurs}</h4>
                        <ul className="space-y-3">
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.sellOnVelari}
                                </span>
                            </li>
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.sellerCabinet}
                                </span>
                            </li>
                            <li>
                                <span className="text-gray-400 text-xs cursor-default">
                                    {t.footer.openDeliveryPoint}
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: App Download & Socials */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                            <h4 className="font-bold text-gray-900 text-xs mb-2">{t.footer.downloadApp}</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                {t.footer.scanToDownload}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1">
                                    {/* Placeholder for QR */}
                                    <div className="w-full h-full bg-gray-100 rounded-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-900 text-xs">{t.footer.socials}</h4>
                            <div className="flex gap-4">
                                <a href="https://instagram.com/velari_uz_" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-black hover:text-white transition-all scale-95 hover:scale-105">
                                    <Instagram size={20} />
                                </a>
                                <a href="https://t.me/velariuz" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-black hover:text-white transition-all scale-95 hover:scale-105">
                                    <Send size={20} />
                                </a>
                                <a href="https://facebook.com/velari.uz" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-black hover:text-white transition-all scale-95 hover:scale-105">
                                    <Facebook size={20} />
                                </a>
                                <a href="https://youtube.com/@velariuz" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-black hover:text-white transition-all scale-95 hover:scale-105">
                                    <Youtube size={20} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Legal Section */}
                <div className="pt-10 border-t border-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-default hover:text-gray-600 transition-colors">
                                {t.footer.privacy}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-default hover:text-gray-600 transition-colors">
                                {t.footer.userAgreement}
                            </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium max-w-sm md:text-right">
                            <p className="mb-1">{t.footer.personalData}</p>
                            <p>{t.footer.copyright}</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
