import Link from 'next/link';

export const metadata = {
    title: "404 - Sahifa topilmadi | Velari",
    robots: {
        index: false,
        follow: false,
    },
};

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 bg-white">
            <h1 className="text-8xl font-black text-gray-900 tracking-tight mb-2">404</h1>
            <h2 className="text-2xl font-bold text-[#2D6E3E] mb-4">Sahifa topilmadi</h2>
            <p className="text-gray-600 max-w-md mb-8 text-sm">
                Kechirasiz, siz qidirayotgan sahifa yoki mahsulot mavjud emas yoxud o&apos;chirilgan.
            </p>
            <Link 
                href="/uz"
                className="bg-[#2D6E3E] hover:bg-[#235831] text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[#2D6E3E]/20"
            >
                Bosh sahifaga qaytish
            </Link>
        </div>
    );
}
