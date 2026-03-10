"use client";

import { X } from "lucide-react";

interface ProductDescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    language: "uz" | "ru";
}

export const ProductDescriptionModal = ({
    isOpen, onClose, product, language
}: ProductDescriptionModalProps) => {
    if (!isOpen) return null;

    const allImages = product?.images && product.images.length > 0 ? product.images : [product?.image || ""];

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col h-full">
                <div className="p-6 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 mx-auto">
                        {language === 'uz' ? 'Mahsulot tavsifi' : 'Описание товара'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="absolute right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {product[`name_${language}`] || product.name}
                        </h3>
                        <div className="text-gray-600 text-sm leading-relaxed font-medium space-y-4">
                            {(product[`description_${language}`] || product.description || "").split('\n').map((line: string, i: number) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pb-20">
                        {allImages.map((img: string, i: number) => (
                            <div key={i} className="rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                                <img src={img} alt={`Description-view-${i}`} className="w-full object-contain" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
