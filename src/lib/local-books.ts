import fs from "fs";
import path from "path";
import { Readable } from "stream";

export const LOCAL_BOOKS_DIR = process.env.LOCAL_BOOKS_DIR || "D:\\kutubxona_kitoblar";

type LocalBookInfo = {
    filePath: string;
    fileName: string;
    mimeType: string;
    size: number;
    ext: string;
};

// Global in-memory index for O(1) instant lookups
let BOOK_INDEX = new Map<string, LocalBookInfo>();
let LAST_INDEXED_TIME = 0;
const INDEX_TTL_MS = 60 * 60 * 1000; // 1 hour TTL before auto-refresh

/**
 * Scans LOCAL_BOOKS_DIR recursively and indexes all book files.
 */
export function refreshLocalBookIndex(force = false): Map<string, LocalBookInfo> {
    const now = Date.now();
    if (!force && BOOK_INDEX.size > 0 && now - LAST_INDEXED_TIME < INDEX_TTL_MS) {
        return BOOK_INDEX;
    }

    if (!fs.existsSync(LOCAL_BOOKS_DIR)) {
        return BOOK_INDEX;
    }

    const newIndex = new Map<string, LocalBookInfo>();

    function scan(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
                const fullPath = path.join(dir, ent.name);
                if (ent.isDirectory()) {
                    scan(fullPath);
                } else if (/\.(pdf|epub|djvu|mobi|fb2)$/i.test(ent.name)) {
                    try {
                        const stat = fs.statSync(fullPath);
                        const ext = path.extname(ent.name).toLowerCase().replace(".", "");
                        const mimeType = ext === "pdf" ? "application/pdf" :
                                         ext === "epub" ? "application/epub+zip" :
                                         ext === "djvu" ? "image/vnd.djvu" : "application/octet-stream";

                        const info: LocalBookInfo = {
                            filePath: fullPath,
                            fileName: ent.name,
                            mimeType,
                            size: stat.size,
                            ext,
                        };

                        const lowerName = ent.name.toLowerCase();
                        newIndex.set(lowerName, info);

                        // Extract ID pattern: e.g. "1_Martin..." or "book-1_..." or "1.pdf"
                        const m = lowerName.match(/^(\d+)[_.\s-]/) || lowerName.match(/^book-(\d+)[_.\s-]?/);
                        if (m) {
                            const numId = m[1];
                            const bookId = `book-${numId}`;

                            // Prefer PDF over EPUB if duplicate ID exists
                            const existing = newIndex.get(numId);
                            if (!existing || (existing.ext !== "pdf" && ext === "pdf")) {
                                newIndex.set(numId, info);
                                newIndex.set(bookId, info);
                            }
                        }
                    } catch {
                        // ignore unreadable file
                    }
                }
            }
        } catch {
            // ignore unreadable directory
        }
    }

    scan(LOCAL_BOOKS_DIR);
    BOOK_INDEX = newIndex;
    LAST_INDEXED_TIME = now;
    return BOOK_INDEX;
}

/**
 * Finds a book in the local directory by ID, book-ID, or filename.
 */
export function findLocalBook(rawId: string): LocalBookInfo | null {
    if (!rawId) return null;
    const index = refreshLocalBookIndex();

    const clean = rawId.trim().toLowerCase();
    const numMatch = clean.match(/\d+/)?.[0];

    // 1. Exact match in index
    if (index.has(clean)) {
        return index.get(clean)!;
    }

    // 2. book-X match
    if (numMatch) {
        if (index.has(numMatch)) return index.get(numMatch)!;
        if (index.has(`book-${numMatch}`)) return index.get(`book-${numMatch}`)!;
    }

    // 3. Search by partial filename or slug
    const normalized = clean.replace(/[^a-z0-9]/g, "");
    for (const [key, info] of Array.from(index.entries())) {
        const keyNorm = key.replace(/[^a-z0-9]/g, "");
        if (keyNorm.includes(normalized) || normalized.includes(keyNorm)) {
            return info;
        }
    }

    return null;
}

/**
 * Streams a local file with full HTTP Range request support (206 Partial Content).
 */
export function createLocalFileResponse(book: LocalBookInfo, rangeHeader?: string | null): Response {
    const fileSize = book.size;

    if (!rangeHeader) {
        // Full file stream
        const nodeStream = fs.createReadStream(book.filePath);
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;

        return new Response(webStream, {
            status: 200,
            headers: {
                "Content-Type": book.mimeType,
                "Content-Length": String(fileSize),
                "Content-Disposition": `inline; filename="${encodeURIComponent(book.fileName)}"`,
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400, s-maxage=86400",
                "X-Content-Type-Options": "nosniff",
                "X-Local-Served": "true",
            },
        });
    }

    // Parse Range header: e.g. "bytes=0-1048575"
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
        return new Response("Range Not Satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` },
        });
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
        return new Response("Range Not Satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` },
        });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(book.filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
        status: 206,
        headers: {
            "Content-Type": book.mimeType,
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Content-Length": String(chunkSize),
            "Content-Disposition": `inline; filename="${encodeURIComponent(book.fileName)}"`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-Content-Type-Options": "nosniff",
            "X-Local-Served": "true",
        },
    });
}

/**
 * Saves an uploaded book to the local library directory.
 */
export function saveUploadedBookLocally(buffer: Buffer, fileName: string, categoryId?: string): string | null {
    try {
        if (!fs.existsSync(LOCAL_BOOKS_DIR)) {
            fs.mkdirSync(LOCAL_BOOKS_DIR, { recursive: true });
        }

        const catDir = path.join(LOCAL_BOOKS_DIR, categoryId || "badiiy-adabiyot");
        if (!fs.existsSync(catDir)) {
            fs.mkdirSync(catDir, { recursive: true });
        }

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetPath = path.join(catDir, safeName);
        fs.writeFileSync(targetPath, buffer);

        // Re-index so it's immediately readable
        refreshLocalBookIndex(true);
        return targetPath;
    } catch (err) {
        console.error("[LocalBook] Failed to save book locally:", err);
        return null;
    }
}
