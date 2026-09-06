import type { ReactNode } from 'react';

/**
 * Root layout — i18n arxitekturasi uchun minimal ildiz layout.
 * Haqiqiy sahifa layouti [lang]/layout.tsx da.
 * Bu fayl faqat root not-found.tsx va root-level sahifalar uchun kerak.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
    return children;
}

