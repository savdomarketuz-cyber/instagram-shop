"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface Story {
    id: string;
    title_uz: string;
    title_ru: string;
    image: string;
    link: string;
    is_active: boolean;
    sort_order: number;
}

const SEEN_KEY = "velari_seen_stories";

function getSeenIds(): Set<string> {
    try { return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
    catch { return new Set<string>(); }
}

function markSeen(id: string) {
    try {
        const ids = getSeenIds();
        ids.add(id);
        localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const GREEN = "#2D6E3E";

export default function StoriesRow({ language }: { language: "uz" | "ru" }) {
    const [stories, setStories] = useState<Story[]>([]);
    const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
    const [open, setOpen] = useState<Story | null>(null);
    const [openIdx, setOpenIdx] = useState(0);

    useEffect(() => {
        setSeenIds(getSeenIds());
        supabase
            .from("stories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .then(({ data }) => { if (data) setStories(data); });
    }, []);

    if (stories.length === 0) return null;

    const handleOpen = (story: Story, idx: number) => {
        setOpen(story);
        setOpenIdx(idx);
        markSeen(story.id);
        setSeenIds(prev => new Set<string>([...Array.from(prev), story.id]));
    };

    const handleClose = () => setOpen(null);

    const handleNav = (dir: 1 | -1) => {
        const next = openIdx + dir;
        if (next < 0 || next >= stories.length) { handleClose(); return; }
        const s = stories[next];
        setOpen(s);
        setOpenIdx(next);
        markSeen(s.id);
        setSeenIds(prev => new Set<string>([...Array.from(prev), s.id]));
    };

    return (
        <>
            <div className="md:hidden mt-4 mb-0">
                <div
                    style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 20px 8px", scrollbarWidth: "none" }}
                    className="no-scrollbar"
                >
                    {stories.map((s, idx) => {
                        const seen = seenIds.has(s.id);
                        const name = language === "uz" ? s.title_uz : s.title_ru;
                        return (
                            <button
                                key={s.id}
                                onClick={() => handleOpen(s, idx)}
                                style={{
                                    flexShrink: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    WebkitTapHighlightColor: "transparent",
                                    animation: `velari-cart-in ${200 + idx * 50}ms ${EASE} both`,
                                }}
                            >
                                {/* Ring */}
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    padding: 2.5,
                                    background: seen
                                        ? "rgba(15,20,16,0.08)"
                                        : `conic-gradient(${GREEN} 0%, #7DC492 50%, ${GREEN} 100%)`,
                                    boxSizing: "border-box",
                                }}>
                                    <div style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "50%",
                                        border: "2.5px solid #FAFAF6",
                                        overflow: "hidden",
                                        position: "relative",
                                        background: "#F0F0EC",
                                    }}>
                                        <Image
                                            src={s.image || "/placeholder.png"}
                                            alt={name}
                                            fill
                                            sizes="64px"
                                            style={{ objectFit: "cover" }}
                                        />
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: seen ? 500 : 700,
                                    color: seen ? "#9AA29C" : "#0F1410",
                                    letterSpacing: -0.1,
                                    maxWidth: 64,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}>
                                    {name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Story viewer */}
            {open && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "#000",
                        display: "flex",
                        flexDirection: "column",
                        animation: "velari-fade-in 180ms ease both",
                    }}
                    onClick={handleClose}
                >
                    {/* Progress bars */}
                    <div style={{ display: "flex", gap: 4, padding: "16px 16px 0", position: "relative", zIndex: 2 }}>
                        {stories.map((s, i) => (
                            <div key={s.id} style={{ flex: 1, height: 2.5, borderRadius: 2, background: i < openIdx ? "#fff" : i === openIdx ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                                {i === openIdx && (
                                    <div style={{ height: "100%", background: "#fff", borderRadius: 2, animation: "velari-story-progress 5s linear forwards" }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", position: "relative", zIndex: 2 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.4)", position: "relative", flexShrink: 0 }}>
                            <Image src={open.image || "/placeholder.png"} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>
                            {language === "uz" ? open.title_uz : open.title_ru}
                        </span>
                        <button
                            onClick={handleClose}
                            style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >×</button>
                    </div>

                    {/* Image */}
                    <div style={{ flex: 1, position: "relative" }} onClick={e => e.stopPropagation()}>
                        <Image src={open.image || "/placeholder.png"} alt="" fill sizes="100vw" style={{ objectFit: "contain" }} />

                        {/* Tap left / right */}
                        <button onClick={e => { e.stopPropagation(); handleNav(-1); }}
                            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "40%", background: "none", border: "none", cursor: "pointer" }} />
                        <button onClick={e => { e.stopPropagation(); handleNav(1); }}
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", background: "none", border: "none", cursor: "pointer" }} />
                    </div>

                    {/* Link button */}
                    {open.link && (
                        <div style={{ padding: "16px 24px 40px", position: "relative", zIndex: 2 }} onClick={e => e.stopPropagation()}>
                            <a
                                href={open.link}
                                style={{
                                    display: "block",
                                    textAlign: "center",
                                    padding: "14px",
                                    background: "#fff",
                                    borderRadius: 16,
                                    color: "#0F1410",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    textDecoration: "none",
                                    letterSpacing: -0.2,
                                }}
                            >
                                {language === "uz" ? "Ko'rish →" : "Смотреть →"}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
