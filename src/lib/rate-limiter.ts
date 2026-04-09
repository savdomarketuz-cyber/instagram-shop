/**
 * Simple In-Memory Rate Limiter for Edge/Serverless
 * Note: Since this is in-memory, it will reset on cold starts.
 * For production-grade global limiting, use Upstash Redis or similar.
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a request from a specific IP should be allowed.
 * @param ip Client IP address
 * @param limit Max requests allowed
 * @param windowSeconds Time window in seconds
 * @returns boolean True if allowed, False if limited
 */
export function checkRateLimit(ip: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    // Clear expired entries periodically (optional, but good for memory)
    if (rateLimitMap.size > 1000) {
        Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
            if (now > value.resetTime) rateLimitMap.delete(key);
        });
    }

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    const data = rateLimitMap.get(ip)!;
    
    // If the reset time has passed, start a new window
    if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + windowMs;
        return true;
    }

    // If limit reached
    if (data.count >= limit) {
        return false;
    }

    // Increment count
    data.count++;
    return true;
}
