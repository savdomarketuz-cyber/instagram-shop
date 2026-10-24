/**
 * Uchinchi tomon skriptlarini (Yandex Metrika, GA, FB Pixel) foydalanuvchi buyruqlariga
 * xalaqit bermaydigan global navbat (staggered idle queue) orqali yuklash.
 *
 * Qoida:
 * 1) Birinchi foydalanuvchi harakati (`pointerdown`, `keydown`, `touchstart`, `scroll`) bo'lganda
 *    skriptlar SHU KADRNING O'ZIDA darhol tiqilmaydi — klik/scroll/navigatsiya animatsiyasi
 *    0ms kechikish bilan tugashi uchun kamida 1500ms kutiladi.
 * 2) Agar foydalanuvchi hech qanday harakat qilmasa, `load` + `delayMs` (standart 8000ms) dan so'ng
 *    navbat ochiladi.
 * 3) Navbatdagi har bir skript `requestIdleCallback` ichida va o'zaro kamida 900ms interval bilan
 *    ketma-ket yuklanadi (`tag.js`, `gtag.js`, `fbevents.js` bitta kadrda to'qnashmaydi).
 * 4) Hodisalar yo'qolmaydi: `ym` / `gtag` / `fbq` stub navbatlari darhol yaratiladi.
 */

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
const POST_INTERACTION_DELAY_MS = 1500;
const DEFAULT_FALLBACK_DELAY_MS = 8000;
const STAGGER_INTERVAL_MS = 900;

interface QueuedTask {
    cb: () => void;
    cancelled: boolean;
}

const taskQueue: QueuedTask[] = [];
let gateOpened = false;
let gateInitialized = false;
let interacted = false;
let gateTimer: ReturnType<typeof setTimeout> | null = null;
let processingQueue = false;
let lastRunTime = 0;

function runInIdle(fn: () => void): void {
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(() => fn(), { timeout: 2500 });
    } else {
        setTimeout(fn, 50);
    }
}

function processQueue(): void {
    if (processingQueue || !gateOpened) return;

    while (taskQueue.length > 0 && taskQueue[0].cancelled) {
        taskQueue.shift();
    }
    if (taskQueue.length === 0) return;

    processingQueue = true;
    const now = Date.now();
    const waitMs = lastRunTime === 0 ? 0 : Math.max(0, STAGGER_INTERVAL_MS - (now - lastRunTime));

    setTimeout(() => {
        runInIdle(() => {
            processingQueue = false;
            while (taskQueue.length > 0 && taskQueue[0].cancelled) {
                taskQueue.shift();
            }
            const next = taskQueue.shift();
            if (!next) return;
            lastRunTime = Date.now();
            try {
                next.cb();
            } catch {
                /* uchinchi tomon skript xatosi asosiy oqimni buzmasin */
            }
            if (taskQueue.length > 0) {
                processQueue();
            }
        });
    }, waitMs);
}

function openGate(): void {
    if (gateOpened) return;
    gateOpened = true;
    if (gateTimer) {
        clearTimeout(gateTimer);
        gateTimer = null;
    }
    processQueue();
}

function initGate(fallbackDelayMs: number): void {
    if (gateInitialized || typeof window === "undefined") return;
    gateInitialized = true;

    const onInteract = () => {
        if (interacted || gateOpened) return;
        interacted = true;
        INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, onInteract));
        window.removeEventListener("load", armFallback);
        if (gateTimer) clearTimeout(gateTimer);
        gateTimer = setTimeout(openGate, POST_INTERACTION_DELAY_MS);
    };

    const armFallback = () => {
        if (interacted || gateOpened) return;
        if (gateTimer) clearTimeout(gateTimer);
        gateTimer = setTimeout(() => {
            INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, onInteract));
            openGate();
        }, fallbackDelayMs);
    };

    INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, onInteract, { once: true, passive: true }));
    if (document.readyState === "complete") {
        armFallback();
    } else {
        window.addEventListener("load", armFallback, { once: true });
    }
}

export function runAfterFirstInteraction(cb: () => void, delayMs = DEFAULT_FALLBACK_DELAY_MS): () => void {
    if (typeof window === "undefined") return () => {};
    initGate(delayMs);

    const task: QueuedTask = { cb, cancelled: false };
    taskQueue.push(task);

    if (gateOpened) {
        processQueue();
    }

    return () => {
        task.cancelled = true;
    };
}

/** Tashqi skriptni bir marta qo'shadi. */
export function injectScript(src: string): void {
    if (Array.from(document.scripts).some(s => s.src === src)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
}
