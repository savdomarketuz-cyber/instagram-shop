'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1593828215426388';

function MetaPixelTracker({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (typeof window !== 'undefined' && (window as any).fbq) {
      try {
        (window as any).fbq('track', 'PageView');
      } catch (err) {
        /* ignore */
      }
    }
  }, [pathname, pixelId]);

  return null;
}

export default function MetaPixel({ pixelId }: { pixelId?: string }) {
  const id = pixelId || META_PIXEL_ID;

  const scriptHtml = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${id}');
    fbq('track', 'PageView');
  `;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: scriptHtml }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <MetaPixelTracker pixelId={id} />
    </>
  );
}

// E-commerce Event Helpers for Meta Pixel
export function trackMetaPixelEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      (window as any).fbq('track', eventName, params || {});
    } catch {
      /* ignore */
    }
  }
}
