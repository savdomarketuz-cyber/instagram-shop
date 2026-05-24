"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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

const SEEN_KEY = "velari_seen_stories";
const STORY_DURATION = 5000; // ms — har bir story shu vaqt ko'rsatiladi

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
    // progressKey o'zgarganda progress bar animatsiyasi qayta boshlanadi
    const [progressKey, setProgressKey] = useState(0);

    const audioRef   = useRef<HTMLAudioElement | null>(null);
    const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchX     = useRef(0);
    const touchY     = useRef(0);
    const storiesRef = useRef<Story[]>([]);
    storiesRef.current = stories;

    // — Data fetch —
    useEffect(() => {
        setSeenIds(getSeenIds());
        supabase
            .from("stories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .then(({ data }) => { if (data) setStories(data); });
    }, []);

    // — Audio helpers —
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const playAudio = useCallback((story: Story) => {
        stopAudio();
        if (story.audio) {
            const a = new Audio(story.audio);
            a.loop = true;
            a.volume = 0.7;
            a.play().catch(() => {});
            audioRef.current = a;
        }
    }, [stopAudio]);

    // — Close —
    const handleClose = useCallback(() => {
        stopAudio();
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(null);
    }, [stopAudio]);

    // — Go to specific story index —
    const goTo = useCallback((idx: number) => {
        const list = storiesRef.current;
        if (idx < 0 || idx >= list.length) {
            // Oxirgi storydan keyin yoki birinchidan oldin — yopiladi
            handleClose();
            return;
        }
        const s = list[idx];
        markSeen(s.id);
        setSeenIds(prev => new Set<string>([...Array.from(prev), s.id]));
        setOpen(s);
        setOpenIdx(idx);
        setProgressKey(k => k + 1); // progress bar qayta boshlanadi
        playAudio(s);
    }, [handleClose, playAudio]);

    // — Auto-advance timer: story 5 soniyadan keyin keyingisiga o'tadi —
    useEffect(() => {
        if (!open) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            goTo(openIdx + 1);
        }, STORY_DURATION);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progressKey, open]); // progressKey o'zgarganda timer qayta boshlanadi

    // — Body scroll lock —
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        };
    }, [open]);

    // — Keyboard navigation —
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape")      handleClose();
            if (e.key === "ArrowRight")  goTo(openIdx + 1);
            if (e.key === "ArrowLeft")   goTo(openIdx - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, openIdx, handleClose, goTo]);

    // — Unmount cleanup —
    useEffect(() => {
        return () => {
            stopAudio();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [stopAudio]);

    // — Open story —
    const handleOpen = (story: Story, idx: number) => {
        markSeen(story.id);
        setSeenIds(prev => new Set<string>([...Array.from(prev), story.id]));
        setOpen(story);
        setOpenIdx(idx);
        setProgressKey(k => k + 1);
        playAudio(story);
    };

    // — Swipe gestures (left/right navigate, down closes) —
    const onTouchStart = (e: React.TouchEvent) => {
        touchX.current = e.touches[0].clientX;
        touchY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        const dy = e.changedTouches[0].clientY - touchY.current;
        if (Math.abs(dy) > Math.abs(dx)) {
            if (dy > 60) handleClose(); // swipe down → yopiladi
        } else if (Math.abs(dx) > 40) {
            goTo(openIdx + (dx < 0 ? 1 : -1)); // swipe left → keyingi, right → oldingi
        }
    };

    if (stories.length === 0) return null;

    return (
        <>
            {/* — Story bubbles row — */}
            <div className="md:hidden mt-4 mb-0">
                <div
                    style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 20px 8px", scrollbarWidth: "none" }}
                    className="no-scrollbar"
                >
                    {stories.map((s, idx) => {
                        const seen = seenIds.has(s.id);
                        const name = language === "uz" ? s.title_uz : s.title_ru;
                        const hasVideo = !!s.video;
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
                                {/* Gradient ring: ko'rilmagan → yashil, ko'rilgan → kulrang */}
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    padding: 2.5,
                                    background: seen
                                        ? "rgba(15,20,16,0.08)"
                                        : `conic-gradient(${GREEN} 0%, #7DC492 50%, ${GREEN} 100%)`,
                                    boxSizing: "border-box",
                                    position: "relative",
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
                                        {s.image ? (
                                            <Image
                                                src={s.image}
                                                alt={name}
                                                fill
                                                sizes="64px"
                                                style={{ objectFit: "cover" }}
                                            />
                                        ) : hasVideo ? (
                                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
                                                <span style={{ fontSize: 20, color: "#fff" }}>▶</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    {hasVideo && (
                                        <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <span style={{ color: "#fff", fontSize: 8, lineHeight: 1 }}>▶</span>
                                        </div>
                                    )}
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

            {/* — Story viewer — */}
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
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Progress bars */}
                    <div
                        style={{ display: "flex", gap: 4, padding: "16px 16px 0", position: "relative", zIndex: 2 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {stories.map((s, i) => (
                            <div key={s.id} style={{
                                flex: 1, height: 2.5, borderRadius: 2,
                                background: i < openIdx ? "#fff" : "rgba(255,255,255,0.25)",
                                overflow: "hidden",
                                cursor: "pointer",
                            }}
                                onClick={() => goTo(i)}
                            >
                                {i === openIdx && (
                                    // key={progressKey} — har safar yangi key → animatsiya qayta boshlanadi
                                    <div
                                        key={progressKey}
                                        style={{
                                            height: "100%",
                                            background: "#fff",
                                            borderRadius: 2,
                                            animation: `velari-story-progress ${STORY_DURATION}ms linear forwards`,
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Header — stopPropagation bor, yopilmaydi */}
                    <div
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", position: "relative", zIndex: 2 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.4)", position: "relative", flexShrink: 0 }}>
                            {open.image ? (
                                <Image src={open.image} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ color: "#fff", fontSize: 14 }}>▶</span>
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: -0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {language === "uz" ? open.title_uz : open.title_ru}
                            </span>
                            {open.audio && (
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: 0.5 }}>
                                    ♪ {language === "uz" ? "Musiqa ijroyoda" : "Музыка играет"}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            style={{
                                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
                                width: 32, height: 32, color: "#fff", fontSize: 20, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, lineHeight: 1,
                            }}
                        >×</button>
                    </div>

                    {/* Media area — tap left 40% / right 40% to navigate */}
                    <div style={{ flex: 1, position: "relative" }}>
                        {open.video ? (
                            <video
                                key={open.id + "-video"}
                                src={open.video}
                                autoPlay
                                playsInline
                                loop
                                muted={!!open.audio}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        ) : (
                            <Image
                                key={open.id + "-img"}
                                src={open.image || "/placeholder.png"}
                                alt={language === "uz" ? open.title_uz : open.title_ru}
                                fill
                                sizes="100vw"
                                priority
                                style={{ objectFit: "contain" }}
                            />
                        )}

                        {/* Oldingi story — chap 40% */}
                        <button
                            onClick={e => { e.stopPropagation(); goTo(openIdx - 1); }}
                            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "40%", background: "none", border: "none", cursor: "pointer" }}
                            aria-label="Oldingi story"
                        />
                        {/* Keyingi story — o'ng 40% */}
                        <button
                            onClick={e => { e.stopPropagation(); goTo(openIdx + 1); }}
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", background: "none", border: "none", cursor: "pointer" }}
                            aria-label="Keyingi story"
                        />
                    </div>

                    {/* Link button */}
                    {open.link && (
                        <div
                            style={{ padding: "16px 24px 40px", position: "relative", zIndex: 2 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <a
                                href={open.link}
                                onClick={handleClose}
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
