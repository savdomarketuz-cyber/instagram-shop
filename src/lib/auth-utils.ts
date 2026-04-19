import crypto from "crypto";

/**
 * Parolni hash qilish (SHA-256)
 * ADMIN_SECRET-ni salt sifatida ishlatamiz
 */
export function hashPassword(password: string): string {
    const salt = process.env.ADMIN_SECRET || "velari_fallback_shared_salt_2024";
    return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/**
 * Cryptographically verify JWT signature (Edge compatible)
 */
export async function verifyJwt(token: string, secret: string) {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        if (!headerB64 || !payloadB64 || !signatureB64) return null;

        const encoder = new TextEncoder();
        const data = encoder.encode(`${headerB64}.${payloadB64}`);
        const secretKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const isValid = await crypto.subtle.verify('HMAC', secretKey, signature, data);
        
        if (!isValid) return null;
        return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        return null;
    }
}

/**
 * Xavfsiz xabarlar uchun helper (optional)
 */
export function secureDelay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
