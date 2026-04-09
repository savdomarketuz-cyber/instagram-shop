import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '@/lib/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * Edge Runtime mos JWT verification
 * Web Crypto API orqali HMAC-SHA256 tekshirish
 */
/**
 * Standard-compliant Base64url Decoder for Edge Runtime
 */
function base64urlDecode(str: string): Uint8Array {
    // Remove padding if present
    str = str.split('=')[0];
    const pad = (str.length % 4 === 0) ? '' : '='.repeat(4 - (str.length % 4));
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function verifyTokenEdge(token: string, secret: string): Promise<Record<string, unknown> | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const [headerB64, bodyB64, sigB64] = parts;

        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const data = encoder.encode(`${headerB64}.${bodyB64}`);
        const sigArray = base64urlDecode(sigB64);

        const isValid = await crypto.subtle.verify('HMAC', key, sigArray as any, data as any);
        if (!isValid) return null;

        const bodyBytes = base64urlDecode(bodyB64);
        const bodyStr = new TextDecoder().decode(bodyBytes);
        const payload = JSON.parse(bodyStr);

        // Expiry check
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;

        return payload;
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

/**
 * Next.js Middleware — Admin protection & i18n redirection
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Check if the pathname is missing a locale
    const pathnameIsMissingLocale = i18n.locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // 2. Bypass API routes from locale redirection
    if (pathname.startsWith('/api')) {
        const response = NextResponse.next();
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        return response;
    }

    // 3. Redirect to locale if missing (skip API and public files)
    if (pathnameIsMissingLocale) {
        const locale = getLocale(request);
        return NextResponse.redirect(
            new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url)
        );
    }

    // 3. i18n aware Admin protection
    let pathWithoutLocale = pathname;
    let localePart = 'uz'; // Default
    for (const locale of i18n.locales) {
        if (pathname.startsWith(`/${locale}/`)) {
            pathWithoutLocale = pathname.replace(`/${locale}`, '');
            localePart = locale;
            break;
        } else if (pathname === `/${locale}`) {
            pathWithoutLocale = '/';
            localePart = locale;
            break;
        }
    }

    if (pathWithoutLocale.startsWith('/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value;
        const adminVaultToken = request.cookies.get('admin_vault_token')?.value;
        const vaultSecret = request.nextUrl.searchParams.get('vault')?.trim();
        
        const GLOBAL_VAULT_KEY = process.env.ADMIN_VAULT_KEY?.trim();
        const LEGACY_VAULT_KEY = process.env.ADMIN_LEGACY_VAULT_KEY?.trim();
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();

        // Agar env variable lar o'rnatilmagan bo'lsa, admin panelga ruxsat bermang
        if (!GLOBAL_VAULT_KEY || !ADMIN_SECRET) {
            return NextResponse.redirect(new URL(`/${localePart}`, request.url));
        }

        if (adminToken) {
            const payload = await verifyTokenEdge(adminToken, ADMIN_SECRET);
            if (payload && payload.role === 'admin') {
                const response = NextResponse.next();
                response.headers.set('X-Iron-Bank-Status', 'AUTHENTICATED');
                return response;
            }
        }

        let hasVaultAccess = !!adminVaultToken;
        if (vaultSecret === GLOBAL_VAULT_KEY || vaultSecret === LEGACY_VAULT_KEY) {
            hasVaultAccess = true;
        }

        if (!hasVaultAccess) {
            return NextResponse.redirect(new URL(`/${localePart}`, request.url));
        }

        const loginUrl = new URL(`/${localePart}/login`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const res = NextResponse.redirect(loginUrl);
        
        if (vaultSecret === GLOBAL_VAULT_KEY || vaultSecret === LEGACY_VAULT_KEY) {
            res.cookies.set('admin_vault_token', 'VAULT_ACTIVE', { 
                httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400, path: '/'
            });
        }
        
        res.headers.set('X-Iron-Bank-Status', 'VAULT_ONLY');
        return res;
    }

    // Default: Add security headers
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

    return response;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|firebase-messaging-sw.js|yandex_).*)',
    ],
};
