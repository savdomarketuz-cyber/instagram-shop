"use client";

import Link from "next/link";
import { LayoutDashboard, ShoppingCart, Package, Layers, LogOut, Menu, X, Users, Image as ImageIcon, Database, Settings, Sparkles, Activity, Zap, MessageSquare, ShieldAlert, Truck, Warehouse, RotateCcw, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import { AdminNotificationListener } from "@/components/AdminNotificationListener";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useStore();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Admin autentifikatsiya tekshiruvi
    useEffect(() => {
        if (!isMounted) return;

        // Zustand persist LocalStorage'dan malumotni o'qiydigan vaqtgacha kutish
        const timer = setTimeout(() => {
            if (!user || user.phone !== "ADMIN") {
                router.push("/login");
            } else {
                setIsAuthorized(true);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [user, router, isMounted]);

    const menuItems = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Live", href: "/admin/live", icon: Zap },
        { name: "Buyurtmalar", href: "/admin/orders", icon: ShoppingCart },
        { name: "Qaytarishlar", href: "/admin/returns", icon: RotateCcw },
        { name: "Promo Kodlar", href: "/admin/promo-codes", icon: Tag },
        { name: "Mahsulotlar", href: "/admin/products", icon: Package },
        { name: "Kategoriyalar", href: "/admin/categories", icon: Layers },
        { name: "Brendlar", href: "/admin/brands", icon: Activity },
        { name: "Mijozlar", href: "/admin/customers", icon: Users },
        { name: "Bannerlar", href: "/admin/banners", icon: ImageIcon },
        { name: "Qoldiqlar", href: "/admin/inventory", icon: Database },
        { name: "Omborlar", href: "/admin/warehouses", icon: Warehouse },
        { name: "Chat", href: "/admin/chats", icon: MessageSquare },
        { name: "Sozlamalar", href: "/admin/settings", icon: Settings },
    ];

    // Agar avtorizatsiya tekshirilmagan bo'lsa, loading ko'rsatish
    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
                <ShieldAlert className="text-gray-300" size={48} />
                <p className="text-gray-400 font-bold text-sm">Tekshirilmoqda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex">
            <AdminNotificationListener />
            {/* Sidebar for Desktop */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-black text-white transform transition-transform duration-500 ease-in-out lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-10 flex-1 overflow-y-auto scrollbar-hide">
                    <h2 className="text-3xl font-black tracking-tighter mb-12 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5">
                            <div className="w-5 h-5 bg-black rounded-lg"></div>
                        </div>
                        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent italic">ADMIN</span>
                    </h2>

                    <nav className="space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-[24px] transition-all duration-300 group ${isActive
                                        ? 'bg-white text-black font-black shadow-2xl shadow-white/10'
                                        : 'text-gray-500 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-black' : 'group-hover:scale-110 transition-transform'} />
                                    <span className="text-sm tracking-tight">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-10 border-t border-white/10 bg-black/50 backdrop-blur-md">
                    <Link href="/" className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-all font-bold group">
                        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-red-500/10 transition-colors">
                            <LogOut size={20} />
                        </div>
                        <span className="text-sm text-gray-400 group-hover:text-red-400 transition-colors">Tizimdan chiqish</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 min-h-screen">
                {/* Header for Mobile */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-40 lg:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-xl">
                        <Menu size={24} />
                    </button>
                    <h1 className="font-black tracking-tighter italic">ADMIN PANEL</h1>
                    <div className="w-10"></div>
                </header>

                <div className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-500"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}
