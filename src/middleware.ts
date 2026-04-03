import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Runtime mos JWT verification
 * Web Crypto API orqali HMAC-SHA256 tekshirish
 */
/**
 * Standard-compliant Base64url Decoder for Edge Runtime
 */
function base64urlDecode(str: string): Uint8Array {
    const pad = (str.length % 4 === 0) ? '' : '='.repeat(4 - (str.length % 4));
    const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
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
        return JSON.parse(bodyStr);
    } catch (e) {
        return null;
    }
}

/**
 * Next.js Middleware — Admin sahifalarni JWT bilan himoyalash
 * Edge Runtime compatible (Web Crypto API)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // --- IRON BANK VAULT PROTECTION ---
    if (pathname.startsWith('/admin')) {
        const adminVaultToken = request.cookies.get('admin_vault_token')?.value;
        const vaultSecret = request.nextUrl.searchParams.get('vault');
        // Default to USER's admin password if not set in ENV
        const GLOBAL_VAULT_KEY = process.env.ADMIN_VAULT_KEY || 'Abdulaziz2244';

        let hasVaultAccess = !!adminVaultToken;

        // 1. Secret Entry check
        if (vaultSecret === GLOBAL_VAULT_KEY) {
            hasVaultAccess = true;
        }

        // 2. Secret Session check - Reject if no vault access
        if (!hasVaultAccess) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // 3. Original Admin JWT check
        const adminToken = request.cookies.get('admin_token')?.value;
        if (!adminToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            const res = NextResponse.redirect(loginUrl);
            // If entering with vault key, set the session cookie even on redirect
            if (vaultSecret === GLOBAL_VAULT_KEY) {
                res.cookies.set('admin_vault_token', 'VAULT_OPEN_SESS_' + Date.now(), { 
                    httpOnly: true, secure: true, sameSite: 'strict', maxAge: 86400, path: '/'
                });
            }
            return res;
        }

        const ADMIN_SECRET = 'IRON_BANK_MASTER_VAULT_2026';
        const payload = await verifyTokenEdge(adminToken, ADMIN_SECRET);

        if (!payload || payload.role !== 'admin') {
            const res = NextResponse.redirect(new URL('/login', request.url));
            res.cookies.delete('admin_token');
            return res;
        }

        // We are authorized! If we have a vault query, save it and proceed
        const response = NextResponse.next();
        if (vaultSecret === GLOBAL_VAULT_KEY) {
            response.cookies.set('admin_vault_token', 'VAULT_OPEN_SESS_' + Date.now(), { 
                httpOnly: true, secure: true, sameSite: 'strict', maxAge: 86400, path: '/'
            });
        }
        
        // Add security headers
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
        return response;
    }

    // Security headers for all routes
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

    return response;

    return response;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|firebase-messaging-sw.js|yandex_).*)',
    ],
};
