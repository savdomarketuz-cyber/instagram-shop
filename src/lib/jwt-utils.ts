/**
 * Cryptographically verify JWT signature (Edge compatible)
 * Uses Web Crypto API instead of Node.js crypto module
 */
export async function verifyJwt(token: string, secret: string) {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        if (!headerB64 || !payloadB64 || !signatureB64) return null;

        const encoder = new TextEncoder();
        const data = encoder.encode(`${headerB64}.${payloadB64}`);
        
        // Import the secret key
        const cryptoObj = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
        if (!cryptoObj || !cryptoObj.subtle) return null;

        const secretKey = await cryptoObj.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        // Convert base64url signature back to bytes
        const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        
        const isValid = await cryptoObj.subtle.verify('HMAC', secretKey, signature, data);
        
        if (!isValid) return null;
        return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        return null;
    }
}
