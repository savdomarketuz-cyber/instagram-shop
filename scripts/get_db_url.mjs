import fs from 'fs';
import path from 'path';

export function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
    if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL.trim();

    const v = readEnvFileKey('DATABASE_URL');
    if (v) return v;

    throw new Error('DATABASE_URL is not defined in environment variables or .env.local.');
}

/** Kalitni .env.local / ../.env.local / .env fayllaridan o'qiydi (qiymat hech qayerda chop etilmaydi). */
export function readEnvFileKey(name) {
    if (process.env[name]) return process.env[name].trim();
    for (const f of ['.env.local', '../.env.local', '.env']) {
        try {
            const p = path.resolve(process.cwd(), f);
            if (!fs.existsSync(p)) continue;
            const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'));
            if (m) return m[1].trim().replace(/^["']|["']$/g, '');
        } catch {}
    }
    return null;
}
