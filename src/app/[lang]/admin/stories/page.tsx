"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, Loader2, CheckCircle2, Eye, EyeOff, Image as ImageIcon, Music, Video } from "lucide-react";
import Image from "next/image";

interface Story {
    id: string;
    title_uz: string;
    title_ru: string;
    image: string;
    link: string;
    audio?: string;
    video?: string;
    is_active: boolean;
    sort_order: number;
}

const EMPTY: Omit<Story, "id" | "sort_order"> = {
    title_uz: "",
    title_ru: "",
    image: "",
    link: "",
    audio: "",
    video: "",
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

    useEffect(() => { fetchStories(); }, []);

    const fetchStories = async () => {
        setLoading(true);
        const { data } = await supabase.from("stories").select("*").order("sort_order", { ascending: true });
        if (data) setStories(data);
        setLoading(false);
    };

    // supabaseAdmin (RLS bypass) uchun /api/admin/crud orqali
    const adminCrud = async (action: string, payload: any, matchConfig?: any) => {
        const res = await fetch("/api/admin/crud", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table: "stories", action, payload, matchConfig }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Xatolik");
        return json;
    };

    const handleUpdate = async (story: Story) => {
        setSaving(story.id);
        try {
            await adminCrud("update", {
                title_uz: story.title_uz,
                title_ru: story.title_ru,
                image: story.image,
                link: story.link,
                audio: story.audio || null,
                video: story.video || null,
                is_active: story.is_active,
                sort_order: story.sort_order,
            }, { column: "id", value: story.id });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) { alert("Xatolik: " + e.message); }
        setSaving(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirilsinmi?")) return;
        setDeleting(id);
        try {
            await adminCrud("delete", {}, { column: "id", value: id });
            setStories(prev => prev.filter(s => s.id !== id));
        } catch (e: any) { alert("Xatolik: " + e.message); }
        setDeleting(null);
    };

    const handleAdd = async () => {
        if (!newStory.title_uz || (!newStory.image && !newStory.video)) {
            alert("Sarlavha va rasm yoki video majburiy!"); return;
        }
        setAdding(true);
        try {
            const maxOrder = Math.max(0, ...stories.map(s => s.sort_order));
            const result = await adminCrud("insert", { ...newStory, sort_order: maxOrder + 1 });
            if (result.data?.[0]) setStories(prev => [...prev, result.data[0]]);
            setNewStory({ ...EMPTY });
        } catch (e: any) { alert("Xatolik: " + e.message); }
        setAdding(false);
    };

    const handleToggle = (id: string) => {
        setStories(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
    };

    const handleField = (id: string, key: keyof Story, value: string | boolean | number) => {
        setStories(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
    };

    // field = "image" | "audio" | "video"
    const handleUpload = async (file: File, targetId: string | "new", field: "image" | "audio" | "video" = "image") => {
        const key = `${targetId}-${field}`;
        setUploading(key);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("fileName", `story_${field}_${Date.now()}.${file.name.split(".").pop()}`);
            const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
            const json = await res.json();
            const url = json.url;
            if (!url) throw new Error(json.error || "URL olishda xatolik");
            if (targetId === "new") {
                setNewStory(prev => ({ ...prev, [field]: url }));
            } else {
                setStories(prev => prev.map(s => s.id === targetId ? { ...s, [field]: url } : s));
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
        await Promise.all([
            adminCrud("update", { sort_order: idx },  { column: "id", value: updated[idx].id }),
            adminCrud("update", { sort_order: next }, { column: "id", value: updated[next].id }),
        ]);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    // Reusable media upload row
    const MediaRow = ({
        label, icon, accept, value, uploadKey,
        onUrlChange, onFileChange,
    }: {
        label: string;
        icon: React.ReactNode;
        accept: string;
        value: string;
        uploadKey: string;
        onUrlChange: (url: string) => void;
        onFileChange: (file: File) => void;
    }) => (
        <div className="flex items-center gap-2 md:col-span-2">
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-black transition-colors shrink-0 text-xs font-bold text-gray-500 hover:text-black">
                <input type="file" accept={accept} className="hidden"
                    onChange={e => e.target.files?.[0] && onFileChange(e.target.files[0])} />
                {uploading === uploadKey ? <Loader2 size={14} className="animate-spin" /> : icon}
                {label}
            </label>
            <input
                value={value}
                onChange={e => onUrlChange(e.target.value)}
                placeholder={`${label} URL`}
                className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-100 text-xs font-mono focus:outline-none focus:border-black transition-colors min-w-0"
            />
            {value && label === "Audio" && (
                <audio controls src={value} className="h-8 shrink-0" style={{ maxWidth: 160 }} />
            )}
            {value && label === "Video" && (
                <video src={value} className="h-8 w-14 rounded-lg object-cover shrink-0" />
            )}
        </div>
    );

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
                            {/* Thumbnail */}
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 relative">
                                    {s.image
                                        ? <Image src={s.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
                                        : s.video
                                        ? <div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={24} className="text-white" /></div>
                                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                                    }
                                </div>
                                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], s.id, "image")} />
                                    {uploading === `${s.id}-image` ? <Loader2 size={10} className="animate-spin text-white" /> : <span className="text-white text-xs font-bold">+</span>}
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
                                {/* Audio upload */}
                                <MediaRow
                                    label="Audio"
                                    icon={<Music size={14} />}
                                    accept="audio/*"
                                    value={s.audio || ""}
                                    uploadKey={`${s.id}-audio`}
                                    onUrlChange={url => handleField(s.id, "audio", url)}
                                    onFileChange={file => handleUpload(file, s.id, "audio")}
                                />
                                {/* Video upload */}
                                <MediaRow
                                    label="Video"
                                    icon={<Video size={14} />}
                                    accept="video/*"
                                    value={s.video || ""}
                                    uploadKey={`${s.id}-video`}
                                    onUrlChange={url => handleField(s.id, "video", url)}
                                    onFileChange={file => handleUpload(file, s.id, "video")}
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
                                : newStory.video
                                ? <div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={24} className="text-white" /></div>
                                : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                            }
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                            <input type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "new", "image")} />
                            {uploading === "new-image" ? <Loader2 size={10} className="animate-spin text-white" /> : <span className="text-white text-xs font-bold">+</span>}
                        </label>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={newStory.title_uz} placeholder="Sarlavha (UZ) *"
                            onChange={e => setNewStory(p => ({ ...p, title_uz: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors" />
                        <input value={newStory.title_ru} placeholder="Sarlavha (RU)"
                            onChange={e => setNewStory(p => ({ ...p, title_ru: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-semibold focus:outline-none focus:border-black transition-colors" />
                        <input value={newStory.image} placeholder="Rasm URL"
                            onChange={e => setNewStory(p => ({ ...p, image: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2" />
                        <input value={newStory.link} placeholder="Havola (ixtiyoriy)"
                            onChange={e => setNewStory(p => ({ ...p, link: e.target.value }))}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm font-mono focus:outline-none focus:border-black transition-colors md:col-span-2" />
                        {/* Audio upload */}
                        <MediaRow
                            label="Audio"
                            icon={<Music size={14} />}
                            accept="audio/*"
                            value={newStory.audio || ""}
                            uploadKey="new-audio"
                            onUrlChange={url => setNewStory(p => ({ ...p, audio: url }))}
                            onFileChange={file => handleUpload(file, "new", "audio")}
                        />
                        {/* Video upload */}
                        <MediaRow
                            label="Video"
                            icon={<Video size={14} />}
                            accept="video/*"
                            value={newStory.video || ""}
                            uploadKey="new-video"
                            onUrlChange={url => setNewStory(p => ({ ...p, video: url }))}
                            onFileChange={file => handleUpload(file, "new", "video")}
                        />
                    </div>
                    <button onClick={handleAdd} disabled={adding}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0">
                        {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Qo'shish
                    </button>
                </div>
            </div>

            {/* DB note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 font-semibold">
                <strong>Eslatma:</strong> Audio va video maydonlari ishlashi uchun Supabase&apos;da <code className="bg-amber-100 px-1 rounded">stories</code> jadvaliga <code className="bg-amber-100 px-1 rounded">audio text</code> va <code className="bg-amber-100 px-1 rounded">video text</code> ustunlarini qo&apos;shing (Table Editor → Add column, nullable = true).
            </div>
        </div>
    );
}
