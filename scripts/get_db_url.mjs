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

    // Check local scratch path fallback
    const scratchPath = 'C:/Users/user/.gemini/antigravity/brain/132d8379-3723-45a6-a02d-bb9203322573/scratch/db_url.txt';
    try {
        if (fs.existsSync(scratchPath)) {
            return fs.readFileSync(scratchPath, 'utf8').trim();
        }
    } catch {}

    throw new Error('DATABASE_URL is not defined in environment variables, .env.local, or local fallback.');
}
