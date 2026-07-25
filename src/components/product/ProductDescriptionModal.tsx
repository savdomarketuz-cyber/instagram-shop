"use client";

import { X, Image as ImageIcon } from "lucide-react";
import { useEffect } from "react";

interface ProductDescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    language: "uz" | "ru";
}

export const ProductDescriptionModal = ({
    isOpen, onClose, product, language
}: ProductDescriptionModalProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !product) return null;

    const allImages = product?.images && product.images.length > 0 ? product.images : [product?.image || ""];
    const allMedia = [
        ...allImages.map((img: string) => ({ type: 'image' as const, url: img })),
        ...(product?.videoUrl ? [{ type: 'video' as const, url: product.videoUrl }] : [])
    ];

    return (
        <div className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] md:rounded-[44px] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                            {language === 'uz' ? 'Mahsulot haqida' : 'О товаре'}
                        </span>
                        <h2 className="text-base md:text-xl font-black text-gray-900 tracking-tight line-clamp-1">
                            {product[`name_${language}`] || product.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-100 hover:bg-black hover:text-white rounded-full text-gray-600 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 no-scrollbar">
                    {/* Description Text */}
                    <div className="space-y-6">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 italic uppercase tracking-tight">
                            {language === 'uz' ? "Batafsil tavsif" : "Подробное описание"}
                        </h3>
                        <div className="text-gray-700 text-sm md:text-base leading-relaxed font-medium bg-gray-50/70 p-6 md:p-8 rounded-[32px] border border-gray-100">
                            {(() => {
                                const desc = product[`description_${language}`] || product.description || '';
                                const hasHtml = /<[a-z][\s\S]*>/i.test(desc);
                                if (hasHtml) {
                                    return <div dangerouslySetInnerHTML={{ __html: desc }} className="prose max-w-none text-gray-700 font-medium" />;
                                }
                                return (
                                    <div className="space-y-4">
                                        {desc.split('\n').map((line: string, i: number) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Media Gallery Section */}
                    {allMedia.length > 0 && (
                        <div className="space-y-6 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-green-50 text-[#2D6E3E] rounded-2xl">
                                    <ImageIcon size={20} />
                                </div>
                                <h3 className="text-lg md:text-xl font-black text-gray-900 italic uppercase tracking-tight">
                                    {language === 'uz' ? "Mahsulot fotolavhalari" : "Галерея изображений"}
                                </h3>
                            </div>
                            <div className="space-y-6">
                                {allMedia.map((m, i) => (
                                    <div key={i} className="rounded-[32px] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm flex items-center justify-center p-4">
                                        {m.type === 'video' ? (
                                            <video src={m.url} controls className="w-full max-h-[600px] object-contain rounded-2xl" />
                                        ) : (
                                            <img src={m.url} alt={`Gallery-${i}`} className="w-full max-h-[700px] object-contain rounded-2xl" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
