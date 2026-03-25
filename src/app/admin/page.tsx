import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Users, ShoppingBag, DollarSign, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { mapOrder } from "@/lib/mappers";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalUsers: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch all orders for stats (can be optimized with RPC later)
            const { data: allOrders } = await supabase.from("orders").select("total, status");
            
            const revenue = allOrders?.reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0;
            const pending = allOrders?.filter(order =>
                ["Kutilmoqda", "To'lov kutilmoqda", "Ожидание", "Ожидание оплаты"].some(s => order.status?.includes(s))
            ).length || 0;

            // Fetch user count
            const { count: userCount } = await supabase.from("users").select("*", { count: "exact", head: true });

            setStats({
                totalOrders: allOrders?.length || 0,
                totalRevenue: revenue,
                totalUsers: userCount || 0,
                pendingOrders: pending
            });

            // Get 5 most recent orders
            const { data: recent } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);
            
            if (recent) setRecentOrders(recent.map(mapOrder));

        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        { name: "Jami Buyurtmalar", value: stats.totalOrders, icon: ShoppingBag, color: "bg-blue-500" },
        { name: "Jami Savdo", value: `${stats.totalRevenue.toLocaleString()} so'm`, icon: DollarSign, color: "bg-green-500" },
        { name: "Mijozlar", value: stats.totalUsers, icon: Users, color: "bg-purple-500" },
        { name: "Kutilmoqda", value: stats.pendingOrders, icon: Clock, color: "bg-orange-500" },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-4xl font-black tracking-tighter mb-2">Dashboard</h1>
                <p className="text-gray-500 font-medium">Do'koningizdagi bugungi holat bilan tanishing.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.name} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`w-12 h-12 ${card.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-${card.color.split('-')[1]}-200`}>
                                <Icon size={24} />
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{card.name}</p>
                            <h3 className="text-2xl font-black">{card.value}</h3>
                        </div>
                    );
                })}
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-black tracking-tight">Oxirgi Buyurtmalar</h2>
                    <Link href="/admin/orders" className="text-sm font-bold text-gray-400 hover:text-black flex items-center gap-2 group">
                        Barchasini ko'rish <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Mijoz</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Miqdor</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Vaqt</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td className="p-6">
                                        <div className="font-bold text-gray-900">{order.userPhone}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">#{order.id}</div>
                                    </td>
                                    <td className="p-6 font-black text-lg">{order.total?.toLocaleString()} so'm</td>
                                    <td className="p-6 text-sm text-gray-500 font-medium">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ') : ""}
                                     </td>
                                    <td className="p-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${order.status === 'Kutilmoqda' ? 'bg-orange-100 text-orange-600' :
                                            order.status === 'Yetkazildi' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
