"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Product } from "@/types";

// Three.js dinamik import (SSR: false)
const ShowroomCanvas = dynamic(
    () => import("@/components/showroom/ShowroomCanvas"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F5F5F7] text-[#1d1d1f]">
                <Loader2 size={36} className="text-emerald-600 animate-spin mb-4" />
                <span className="text-sm font-semibold tracking-wider text-[#86868b]">
                    Showroom yuklanmoqda...
                </span>
            </div>
        )
    }
);

interface ShowroomClientProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

export default function ShowroomClient({ initialProducts, lang }: ShowroomClientProps) {
    return <ShowroomCanvas initialProducts={initialProducts} lang={lang} />;
}
