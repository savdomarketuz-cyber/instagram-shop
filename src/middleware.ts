import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '@/lib/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * Secure JWT Verification for Edge
 */
import { verifyJwt } from '@/lib/jwt-utils';

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
    let localePart: string = i18n.defaultLocale;
    for (const locale of i18n.locales) {
        if (pathname.startsWith(`/${locale}/`)) {
            localePart = locale;
            break;
        }
    }

    const pathWithoutLocale = pathname.replace(`/${localePart}`, '');

    // 3. Admin Protection (Pages & API)
    if (pathWithoutLocale.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value;
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || "default-secret";

        const payload = adminToken ? await verifyJwt(adminToken, ADMIN_SECRET) : null;
        const isAdmin = payload && payload.role === 'admin';

        if (!isAdmin) {
            // IF it's an API request, return 401
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
            
            // If it's a page request, redirect to login
            const loginUrl = new URL(`/${localePart}/login`, request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|yandex_).*)',
    ],
};
