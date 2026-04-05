import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-8">
                <div className="text-[120px] md:text-[180px] font-black italic tracking-tighter leading-none text-gray-100 select-none">
                    404
                </div>
                <div className="-mt-8 md:-mt-12">
                    <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-3">
                        Sahifa topilmadi
                    </h1>
                    <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                        Siz qidirayotgan sahifa o'chirilgan, nomi o'zgartirilgan yoki hozircha mavjud emas.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Link
                    href="/"
                    className="flex-1 bg-[#2d6e3e] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center active:scale-95 transition-all shadow-lg shadow-emerald-800/10"
                >
                    Bosh sahifa
                </Link>
                <Link
                    href="/catalog"
                    className="flex-1 bg-gray-100 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center active:scale-95 transition-all"
                >
                    Katalog
                </Link>
            </div>
        </div>
    );
}
