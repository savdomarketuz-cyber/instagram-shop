import fs from 'fs';
import path from 'path';

export function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
    if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL.trim();

    // Check .env.local
    try {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
            const content = fs.readFileSync(envLocalPath, 'utf8');
            const match = content.match(/^DATABASE_URL=(.+)$/m);
            if (match) return match[1].trim().replace(/^["']|["']$/g, '');
        }
    } catch {}

    throw new Error('DATABASE_URL is not defined in environment variables or .env.local.');
}
