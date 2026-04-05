"use client";

import { useState, useEffect } from "react";
import { 
    Settings, 
    ToggleLeft, 
    ToggleRight, 
    Plus, 
    Minus, 
    History, 
    Edit2, 
    Loader2, 
    X,
    Calculator,
    Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminCashbackPage() {
    const [globalSettings, setGlobalSettings] = useState({ rate: 0.02, enabled: true });
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Exception Modal
    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: settingsData } = await supabase.from("site_settings").select("*").eq("key", "cashback_settings").single();
            if (settingsData) setGlobalSettings(settingsData.value);

            const { data: prodData } = await supabase.from("products").select("*").neq("cashback_type", "global").eq("is_deleted", false);
            if (prodData) setExceptions(prodData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        setIsSavingSettings(true);
        try {
            const { error } = await supabase.from("site_settings").update({ value: globalSettings }).eq("key", "cashback_settings");
            if (error) throw error;
            alert("Global sozlamalar saqlandi!");
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleUpdateProductCashback = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from("products").update({
                cashback_type: selectedProduct.cashback_type,
                cashback_value: selectedProduct.cashback_value
            }).eq("id", selectedProduct.id);

            if (error) throw error;
            setIsExceptionModalOpen(false);
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-black" size={40} />
        </div>
    );

    return (
        <div className="p-4 md:p-10 space-y-12 max-w-[1200px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4 text-emerald-600">MUKOFOTLAR TIZIMI</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Cashback va maxsus mukofotlash qoidalarini boshqaring</p>
            </div>

            {/* Global Settings */}
            <div className="bg-white p-10 rounded-[60px] shadow-2xl border-2 border-gray-50 flex flex-col md:flex-row items-center gap-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[35px] flex items-center justify-center shrink-0">
                    <Settings className="w-10 h-10" />
                </div>
                <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Global Sozlama</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                        Sayt bo'ylab barcha normal buyurtmalar uchun amaldagi cashback foizi.
                    </p>
                </div>
                <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-[40px]">
                    <div className="relative">
                        <input 
                            type="number" 
                            step="0.5"
                            value={globalSettings.rate * 100}
                            onChange={(e) => setGlobalSettings({ ...globalSettings, rate: Number(e.target.value) / 100 })}
                            className="w-24 bg-white border-2 border-transparent focus:border-black rounded-2xl p-4 text-xl font-black italic outline-none transition-all pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black italic text-emerald-500">%</span>
                    </div>
                    
                    <button 
                        onClick={() => setGlobalSettings({ ...globalSettings, enabled: !globalSettings.enabled })}
                        className={`p-4 rounded-2xl transition-all ${globalSettings.enabled ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                    >
                        {globalSettings.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>

                    <button 
                        onClick={handleUpdateSettings}
                        disabled={isSavingSettings}
                        className="px-8 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : 'SAQLASH'}
                    </button>
                </div>
            </div>

            {/* Product Exceptions */}
            <div className="bg-white p-10 rounded-[60px] shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2">MAHSULOT ISTISNOLARI</h3>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest italic leading-relaxed">
                            Maxsus cashback belgilangan mahsulotlar ro'yxati (Global foiz amal qilmaydi)
                        </p>
                    </div>
                    <p className="text-[10px] font-black italic text-gray-400 uppercase tracking-widest underline decoration-orange-500 underline-offset-4">{exceptions.length} TA MAHSULOT</p>
                </div>

                {exceptions.length === 0 ? (
                    <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest italic">Hozircha maxsus istisnolar yo'q</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {exceptions.map(prod => (
                            <div key={prod.id} className="bg-white p-5 rounded-[40px] shadow-xl border border-orange-100 flex items-center gap-5 group hover:border-orange-500 transition-all duration-500 relative">
                                <button 
                                    onClick={() => { setSelectedProduct(prod); setIsExceptionModalOpen(true); }}
                                    className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <div className="w-16 h-20 bg-gray-50 rounded-[24px] overflow-hidden relative shrink-0">
                                    <img src={prod.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h4 className="text-[11px] font-black uppercase text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">{prod.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${prod.cashback_type === 'percent' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {prod.cashback_type === 'percent' ? 'Foiz' : 'Fixed'}
                                        </span>
                                        <p className="text-sm font-black italic tracking-tighter">
                                            {prod.cashback_type === 'percent' ? `${prod.cashback_value}%` : `${prod.cashback_value.toLocaleString()} so'm`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Exception Modal */}
            {isExceptionModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/50">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-orange-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-16 bg-white rounded-xl overflow-hidden shadow-sm">
                                    <img src={selectedProduct.image} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-1 line-clamp-1">{selectedProduct.name}</h2>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest italic">Maxsus Cashback Sozlamasi</p>
                                </div>
                            </div>
                            <button onClick={() => setIsExceptionModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateProductCashback} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Hisoblash Turi</label>
                                    <select 
                                        value={selectedProduct.cashback_type}
                                        onChange={(e) => setSelectedProduct({ ...selectedProduct, cashback_type: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-5 text-sm font-black outline-none transition-all"
                                    >
                                        <option value="global">Global (% )</option>
                                        <option value="percent">Maxsus % (Foiz)</option>
                                        <option value="fixed">Maxsus Summa (Fixed)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                        {selectedProduct.cashback_type === 'percent' ? 'Foiz (%)' : 'Summa (so\'m)'}
                                    </label>
                                    <input 
                                        disabled={selectedProduct.cashback_type === 'global'}
                                        required
                                        type="number"
                                        value={selectedProduct.cashback_value}
                                        onChange={(e) => setSelectedProduct({ ...selectedProduct, cashback_value: Number(e.target.value) })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-5 text-xl font-black outline-none transition-all italic tracking-tighter disabled:opacity-30"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-black text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                ISTISNONI SAQLASH
                            </button>
                            
                            <button 
                                type="button"
                                onClick={() => { 
                                    setSelectedProduct({ ...selectedProduct, cashback_type: 'global', cashback_value: 0 });
                                }}
                                className="w-full bg-red-50 text-red-500 py-4 rounded-[24px] font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                            >
                                ISTISNONI O'CHIRISH (GLOBAL QILISH)
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
