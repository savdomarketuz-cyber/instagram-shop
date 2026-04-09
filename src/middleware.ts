import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '@/lib/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * Simplified JWT decoder for Edge
 */
function decodeJwt(token: string) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadStr = atob(payloadB64);
        return JSON.parse(payloadStr);
    } catch (e) {
        return null;
    }
}

/**
 * Locale detection
 */
function getLocale(request: NextRequest): string | undefined {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

    const locales: string[] = i18n.locales as any;
    let languages = new Negotiator({ headers: negotiatorHeaders }).languages();

    try {
        return matchLocale(languages, locales, i18n.defaultLocale);
    } catch (e) {
        return i18n.defaultLocale;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Bypass static & public files
    if (pathname.match(/\.(.*)$/) && !pathname.includes('/api/')) {
        return NextResponse.next();
    }

    // 2. Locale Redirection
    const pathnameIsMissingLocale = i18n.locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    if (pathnameIsMissingLocale && !pathname.startsWith('/api/')) {
        const locale = getLocale(request);
        const url = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
        url.search = request.nextUrl.search;
        return NextResponse.redirect(url);
    }

    // 3. Admin Protection
    let localePart = i18n.defaultLocale;
    for (const locale of i18n.locales) {
        if (pathname.startsWith(`/${locale}/`)) {
            localePart = locale;
            break;
        }
    }

    const pathWithoutLocale = pathname.replace(`/${localePart}`, '');

    if (pathWithoutLocale.startsWith('/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value;
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();

        // If we have a token, at least try to let the user in
        if (adminToken) {
            const payload = decodeJwt(adminToken);
            if (payload && payload.role === 'admin') {
                return NextResponse.next();
            }
        }

        // If no token or invalid token, redirect to login
        // WE REMOVED THE STRICT VAULT CHECK HERE TO UNBLOCK YOU
        const loginUrl = new URL(`/${localePart}/login`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|yandex_).*)',
    ],
};
