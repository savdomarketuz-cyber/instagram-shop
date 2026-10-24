'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ymHit } from '@/lib/metrika';
import { runAfterFirstInteraction, injectScript } from '@/lib/third-party-gate';

// SPA pageview: route o'zgarganda 'hit'.
function MetrikaPageTracker() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    // Birinchi yuklanishni init o'zi sanaydi — ikki marta sanamaslik uchun o'tkazamiz.
    if (firstRender.current) { firstRender.current = false; return; }
    ymHit();
  }, [pathname]);

  return null;
}

/**
 * Yandex Metrika — birinchi yuklanish va ilk klik/scroll'ni qotirmaydigan holda (TASK P1 + PC Input Lag Fix).
 *
 * O'lchov (scripts/perf/measure.mjs, headless Chrome, keshsiz): init paytida tag.js dagi `Zz` funksiyasi
 * `new RTCPeerConnection()` yaratadi (lokal IP'ni WebRTC orqali aniqlash, "pp" parametri; iOS/Safari'da
 * o'tkaziladi) — bu asosiy oqimni ~2 s bloklardi.
 * Sayt WebRTC ishlatmaydi — shuning uchun tag.js yuklanishidan oldin WebRTC konstruktori yashiriladi:
 * eng uzun qotish 2.2 s → ~0.1 s. Ko'rishlar, maqsadlar va e-commerce odatdagidek yoziladi.
 *
 * `ym` navbati darhol yaratiladi (init va SPA hit'lar yo'qolmaydi, 1-sahifa ko'rishi sanaladi),
 * tag.js esa `runAfterFirstInteraction` global staggered navbati orqali (birinchi harakatdan >= 1.5s
 * o'tgach yoki load + 8s da, boshqa skriptlar bilan 900ms oraliqda) `requestIdleCallback` da yuklanadi.
 */
export default function YandexMetrika({ ymid }: { ymid?: string }) {
  const id = ymid || process.env.NEXT_PUBLIC_YM_ID || '107383008';

  useEffect(() => {
    const w = window as any;

    // 1) ym navbati (stub) + init — darhol, faqat bir marta
    if (!w.__velariYmInit) {
      w.__velariYmInit = true;
      w.ym = w.ym || function (...args: any[]) { (w.ym.a = w.ym.a || []).push(args); };
      w.ym.l = 1 * (new Date() as any);
      w.dataLayer = w.dataLayer || [];
      w.ym(Number(id), 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false,
        ecommerce: 'dataLayer',
      });
    }

    // 2) tag.js — global staggered idle queue orqali (ilk klik/scroll kadrini muzlatmaydi)
    return runAfterFirstInteraction(() => {
      try {
        // WebRTC orqali lokal IP aniqlash (2 s bloklash) — o'chiriladi; sayt WebRTC ishlatmaydi
        w.RTCPeerConnection = undefined;
        w.webkitRTCPeerConnection = undefined;
        w.mozRTCPeerConnection = undefined;
      } catch { /* jim */ }
      injectScript('https://mc.yandex.ru/metrika/tag.js');
    });
  }, [id]);

  return (
    <>
      <MetrikaPageTracker />
      {/* Xom HTML: React <img> uchun <link rel="preload"> qo'shib, JS'li foydalanuvchilarda ham so'rov yuborardi */}
      <noscript dangerouslySetInnerHTML={{ __html: `<div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute;left:-9999px" alt="" /></div>` }} />
    </>
  );
}
