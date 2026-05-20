"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, GripVertical, Save, Loader2, CheckCircle2, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface Story {
    id: string;
    title_uz: string;
    title_ru: string;
    image: string;
    link: string;
    is_active: boolean;
    sort_order: number;
}

const EMPTY: Omit<Story, "id" | "sort_order"> = {
    title_uz: "",
    title_ru: "",
    image: "",
    link: "",
    is_active: true,
};

export default function AdminStoriesPage() {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newStory, setNewStory] = useState({ ...EMPTY });
    const [uploading, setUploading] = useState<string | null>(null);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        setLoading(true);
        const { data } = await supabase.from("stories").select("*").order("sort_order", { ascending: true });
        if (data) setStories(data);
        setLoading(false);
    };

    const handleUpdate = async (story: Story) => {
        setSaving(story.id);
        await supabase.from("stories").update({
            title_uz: story.title_uz,
            title_ru: story.title_ru,
            image: story.image,
            link: story.link,
            is_active: story.is_active,
            sort_order: story.sort_order,
        }).eq("id", story.id);
        setSaving(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirilsinmi?")) return;
        setDeleting(id);
        await supabase.from("stories").delete().eq("id", id);
        setStories(prev => prev.filter(s => s.id !== id));
        setDeleting(null);
    };

    const handleAdd = async () => {
        if (!newStory.title_uz || !newStory.image) { alert("Sarlavha va rasm majburiy!"); return; }
        setAdding(true);
        const maxOrder = Math.max(0, ...stories.map(s => s.sort_order));
        const { data } = await supabase.from("stories").insert({ ...newStory, sort_order: maxOrder + 1 }).select().single();
        if (data) setStories(prev => [...prev, data]);
        setNewStory({ ...EMPTY });
        setAdding(false);
    };

    const handleToggle = (id: string) => {
        setStories(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
    };

    const handleField = (id: string, key: keyof Story, value: string | boolean | number) => {
        setStories(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
    };

    const handleUpload = async (file: File, targetId: string | "new") => {
        setUploading(targetId);
        try {
            const ext = file.name.split(".").pop();
            const path = `stories/${Date.now()}.${ext}`;
            const res = await fetch(`/api/admin/upload?path=${encodeURIComponent(path)}&contentType=${encodeURIComponent(file.type)}`, {
                method: "POST",
                body: file,
            });
            const json = await res.json();
            const url = json.url || json.publicUrl;
            if (!url) throw new Error("URL olishda xatolik");
            if (targetId === "new") {
                setNewStory(prev => ({ ...prev, image: url }));
            } else {
                setStories(prev => prev.map(s => s.id === targetId ? { ...s, image: url } : s));
            }
        } catch (e: any) {
            alert("Yuklashda xatolik: " + e.message);
        } finally {
            setUploading(null);
        }
    };

    const moveStory = async (idx: number, dir: -1 | 1) => {
        const next = idx + dir;
        if (next < 0 || next >= stories.length) return;
        const updated = [...stories];
        [updated[idx], updated[next]] = [updated[next], updated[idx]];
        updated[idx].sort_order = idx;
        updated[next].sort_order = next;
        setStories(updated);
        await supabase.from("stories").update({ sort_order: idx }).eq("id", updated[idx].id);
        await supabase.from("stories").update({ sort_order: next }).eq("id", updated[next].id);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-10 pb-20 max-w-5xl">
            {saved && (
                <div className="fixed top-10 right-10 z-[100] bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl">
                    <CheckCircle2 size={16} /> Saqlandi!
                </div>
            )}

            <div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">Stories</h1>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Bosh sahifadagi stories qatorini boshqarish</p>
            </div>

            {/* Story list */}
            <div className="space-y-4">
                {stories.map((s, idx) => (
                    <div key={s.id} className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm">
                        <div className="flex gap-4 items-start">
                            {/* Image */}
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 relative">
                                    {s.image
                                        ? <Image src={s.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
                                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                                    }
                                </div>
                                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], s.id)} />
                                    {uploading === s.id ? <Loader2 size={10} className="animate-spin text-white" /> : <span className="text-white text-xs">+</span>}
                                </label>
                            </div>

                            {/* Fields */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    value={s.title_uz} placeholder="Sarlavha (UZ)"
                                    onChange={e => handleField(s.id, "title_uz", e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors"
                                />
                                <input
                                    value={s.title_ru} placeholder="Sarlavha (RU)"
                                    onChange={e => handleField(s.id, "title_ru", e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors"
                                />
                                <input
                                    value={s.image} placeholder="Rasm URL"
                                    onChange={e => handleField(s.id, "image", e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2"
                                />
                                <input
                                    value={s.link} placeholder="Havola (ixtiyoriy)"
                                    onChange={e => handleField(s.id, "link", e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 items-center shrink-0">
                                <button onClick={() => handleToggle(s.id)}
                                    className={`p-2 rounded-xl transition-colors ${s.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                                    {s.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button onClick={() => handleUpdate(s)} disabled={saving === s.id}
                                    className="p-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
                                    {saving === s.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                </button>
                                <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                                    className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                                    {deleting === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => moveStory(idx, -1)} disabled={idx === 0}
                                        className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-200 transition-colors font-bold">↑</button>
                                    <button onClick={() => moveStory(idx, 1)} disabled={idx === stories.length - 1}
                                        className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-200 transition-colors font-bold">↓</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add new */}
            <div className="bg-white rounded-[28px] p-6 border-2 border-dashed border-gray-200">
                <div className="font-black text-sm uppercase tracking-widest text-gray-400 mb-5">Yangi story qo'shish</div>
                <div className="flex gap-4 items-start">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 relative">
                            {newStory.image
                                ? <Image src={newStory.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
                                : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                            }
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                            <input type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "new")} />
                            {uploading === "new" ? <Loader2 size={10} className="animate-spin text-white" /> : <span className="text-white text-xs">+</span>}
                        </label>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={newStory.title_uz} placeholder="Sarlavha (UZ) *"
                            onChange={e => setNewStory(p => ({ ...p, title_uz: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors" />
                        <input value={newStory.title_ru} placeholder="Sarlavha (RU)"
                            onChange={e => setNewStory(p => ({ ...p, title_ru: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors" />
                        <input value={newStory.image} placeholder="Rasm URL *"
                            onChange={e => setNewStory(p => ({ ...p, image: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2" />
                        <input value={newStory.link} placeholder="Havola (ixtiyoriy)"
                            onChange={e => setNewStory(p => ({ ...p, link: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2" />
                    </div>
                    <button onClick={handleAdd} disabled={adding}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0">
                        {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Qo'shish
                    </button>
                </div>
            </div>
        </div>
    );
}
