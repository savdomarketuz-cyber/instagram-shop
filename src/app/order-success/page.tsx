"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";

export default function OrderSuccess() {
    const { language } = useStore();
    const t = translations[language];

    return (
        <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-8">
                <CheckCircle size={48} />
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-4">
                {language === 'uz' ? 'Buyurtma qabul qilindi!' : 'Заказ принят!'}
            </h1>
            <p className="text-gray-500 mb-10 max-w-xs mx-auto font-medium text-sm">
                {language === 'uz'
                    ? 'Buyurtmangiz muvaffaqiyatli qabul qilindi. Tez orada siz bilan bog\'lanamiz.'
                    : 'Ваш заказ успешно принят. Мы свяжемся с вами в ближайшее время.'}
            </p>

            <div className="space-y-4 w-full max-w-xs">
                <Link
                    href="/"
                    className="block w-full bg-black text-white py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all"
                >
                    {language === 'uz' ? 'Xaridni davom ettirish' : 'Продолжить покупки'}
                </Link>
                <Link
                    href="/orders"
                    className="block w-full bg-gray-50 text-gray-500 py-4 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                    {language === 'uz' ? 'Buyurtmalar tarixi' : 'История заказов'}
                </Link>
            </div>
        </div>
    );
}
