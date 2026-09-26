import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '@/lib/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * Secure JWT Verification for Edge
 */
import { verifyJwt } from '@/lib/jwt-utils';
import { getProductIdFromSlug, getProductSlug } from '@/lib/slugify';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function redirectLegacyProductUrl(request: NextRequest): Promise<NextResponse | null> {
    const match = request.nextUrl.pathname.match(/^\/(uz|ru)\/products\/([^/]+)$/);
    if (!match) return null;

    const [, lang, rawSlug] = match;
    let slug: string;
    try {
        slug = decodeURIComponent(rawSlug);
    } catch {
        return null;
    }

    const identifier = getProductIdFromSlug(slug);
    const isLegacy = UUID_RE.test(identifier) || !slug.includes('--');
    if (!isLegacy || !/^[A-Za-z0-9_-]+$/.test(identifier)) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    try {
        const query = new URLSearchParams({
            select: 'id,article,name,name_uz,name_ru',
            is_deleted: 'eq.false',
            or: `(id.eq."${identifier}",article.eq."${identifier}")`,
            limit: '1',
        });
        const res = await fetch(`${supabaseUrl}/rest/v1/products?${query}`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        });
        if (!res.ok) return null;
        const [product] = await res.json();
        if (!product) return null;

        const canonicalSlug = getProductSlug(product, lang);
        if (canonicalSlug === slug) return null;

        const url = request.nextUrl.clone();
        url.pathname = `/${lang}/products/${canonicalSlug}`;
        return NextResponse.redirect(url, 308);
    } catch {
        // Baza javob bermasa — sahifaning o'zi (meta refresh) ishlayveradi
        return null;
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

    // 2.5. Eski mahsulot URL'lari (…--<uuid>, yalang'och uuid yoki artikul) → 308 canonical slug'ga.
    // Sahifa ichidagi permanentRedirect [lang]/loading.tsx tufayli faqat <meta refresh> (200) beradi,
    // shuning uchun haqiqiy 308 shu yerda. Oddiy "nom--ART-XXX" URL'lar bazaga so'rovsiz o'tadi.
    const legacyRedirect = await redirectLegacyProductUrl(request);
    if (legacyRedirect) return legacyRedirect;

    // 3. Admin Protection
    let localePart: string = i18n.defaultLocale;
    for (const locale of i18n.locales) {
        if (pathname.startsWith(`/${locale}/`)) {
            localePart = locale;
            break;
        }
    }

    const pathWithoutLocale = pathname.replace(`/${localePart}`, '');
    const privateRoutes = [
        '/login',
        '/account',
        '/cart',
        '/wishlist',
        '/messages',
        '/checkout',
        '/orders',
        '/wallet',
        '/payment',
        '/order-success',
        '/auth',
        '/ref',
        '/admin',
    ];
    const isPrivateRoute = privateRoutes.some(
        (route) => pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
    );

    const applyRobotsPolicy = (response: NextResponse) => {
        if (isPrivateRoute) {
            response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        return response;
    };

    // 3. Admin Protection (Pages & API)
    // /api/admin/bot Telegram Webhook orqali chaqiriladi va o'zining chatId tekshiruviga ega
    if ((pathWithoutLocale.startsWith('/admin') || pathname.startsWith('/api/admin')) && pathname !== '/api/admin/bot') {
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();
        const headerSecret = request.headers.get('x-admin-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

        // Xizmatlararo (Service-to-Service) to'g'ri ADMIN_SECRET orqali chaqiruvlar
        const isSecretAuthorized = Boolean(ADMIN_SECRET && headerSecret && headerSecret === ADMIN_SECRET);

        const adminToken = request.cookies.get('admin_token')?.value;
        const payload = adminToken && ADMIN_SECRET ? await verifyJwt(adminToken, ADMIN_SECRET) : null;
        const isAdmin = isSecretAuthorized || Boolean(payload && payload.role === 'admin');

        if (!isAdmin) {
            // IF it's an API request, return 401
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
            
            // If it's a page request, redirect to login
            const loginUrl = new URL(`/${localePart}/login`, request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return applyRobotsPolicy(NextResponse.redirect(loginUrl));
        }

        return applyRobotsPolicy(NextResponse.next());
    }

    return applyRobotsPolicy(NextResponse.next());
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|image-sitemap.xml|yandex_).*)',
    ],
};
