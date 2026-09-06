'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ymHit } from '@/lib/metrika';

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

export default function YandexMetrika({ ymid }: { ymid?: string }) {
  const id = ymid || process.env.NEXT_PUBLIC_YM_ID || '107383008';

  return (
    <>
      <Script id="yandex-metrika" strategy="lazyOnload">
        {`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          window.dataLayer = window.dataLayer || [];
          ym(${id}, "init", {
               clickmap:true,
               trackLinks:true,
               accurateTrackBounce:true,
               webvisor:true,
               ecommerce:"dataLayer"
          });
        `}
      </Script>
      <MetrikaPageTracker />
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${id}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
    </>
  );
}
