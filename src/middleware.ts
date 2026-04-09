import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '@/lib/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * Edge Runtime compatible JWT Header/Payload decoder
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
 * Simple signature verification for Edge (HMAC-SHA256)
 */
async function verifySignature(token: string, secret: string): Promise<boolean> {
    try {
        const [headerB64, bodyB64, sigB64] = token.split('.');
        if (!headerB64 || !bodyB64 || !sigB64) return false;

        const encoder = new TextEncoder();
        const data = encoder.encode(`${headerB64}.${bodyB64}`);
        const keyData = encoder.encode(secret);
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Standard Base64Url to Base64
        const sig = sigB64.replace(/-/g, '+').replace(/_/g, '/');
        const pad = sig.length % 4 === 0 ? '' : '='.repeat(4 - (sig.length % 4));
        const sigArray = Uint8Array.from(atob(sig + pad), c => c.charCodeAt(0));

        return await crypto.subtle.verify('HMAC', key, sigArray, data);
    } catch (e) {
        return false;
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
    const isPublicFile = pathname.match(/\.(.*)$/) && !pathname.includes('/api/');
    if (isPublicFile) return NextResponse.next();

    // 2. Check if the pathname is missing a locale
    const pathnameIsMissingLocale = i18n.locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    if (pathnameIsMissingLocale && !pathname.startsWith('/api/')) {
        const locale = getLocale(request);
        const url = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
        url.search = request.nextUrl.search; // Preserve query params (IMPORTANT for vault key)
        return NextResponse.redirect(url);
    }

    // 3. Admin Route Protection
    let localePart: string = i18n.defaultLocale;
    let pathWithoutLocale = pathname;
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
        const vaultKey = request.nextUrl.searchParams.get('vault')?.trim();
        const vaultCookie = request.cookies.get('admin_vault_token')?.value;
        
        const ADMIN_VAULT_KEY = process.env.ADMIN_VAULT_KEY?.trim();
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();

        // Security check for environment
        if (!ADMIN_VAULT_KEY || !ADMIN_SECRET) {
            return NextResponse.redirect(new URL(`/${localePart}`, request.url));
        }

        // A. If already authenticated via JWT
        if (adminToken) {
            const isValid = await verifySignature(adminToken, ADMIN_SECRET);
            if (isValid) {
                const payload = decodeJwt(adminToken);
                if (payload && payload.role === 'admin') {
                    const response = NextResponse.next();
                    response.headers.set('X-Iron-Bank-Status', 'AUTHENTICATED');
                    return response;
                }
            }
        }

        // B. If not authenticated, check Vault Access
        const hasVaultAccess = vaultKey === ADMIN_VAULT_KEY || vaultCookie === 'VAULT_ACTIVE';
        
        if (hasVaultAccess) {
            // If they have vault key but no valid token, they MUST be on the login page or we redirect them there
            // But we must NOT loop. If they are already in /[lang]/admin, and have vault access, 
            // but token is missing, redirect to login.
            const loginUrl = new URL(`/${localePart}/login`, request.url);
            loginUrl.searchParams.set('redirect', pathname);
            
            const response = NextResponse.redirect(loginUrl);
            
            // Set vault cookie to remember access
            if (vaultKey === ADMIN_VAULT_KEY) {
                response.cookies.set('admin_vault_token', 'VAULT_ACTIVE', {
                    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400, path: '/'
                });
            }
            return response;
        }

        // C. No access at all
        return NextResponse.redirect(new URL(`/${localePart}`, request.url));
    }

    // Default response
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|yandex_).*)',
    ],
};
