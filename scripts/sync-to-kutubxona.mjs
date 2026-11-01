import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('.');
const DST_DIR = path.resolve('D:/asosiy dasturlar/kutubxona');

if (!fs.existsSync(DST_DIR)) {
    console.error(`Destination directory not found: ${DST_DIR}`);
    process.exit(1);
}

const SYNC_FILES = [
    'src/types/index.ts',
    'src/lib/public-product.ts',
    'src/lib/local-books.ts',
    'src/lib/product-transition.ts',
    'src/components/Logo.tsx',
    'src/components/common/DynamicFavicon.tsx',
    'src/components/common/ProductTransitionOverlay.tsx',
    'src/components/home/ProductCard.tsx',
    'src/components/home/ProductGrid.tsx',
    'src/components/product/ProductInfo.tsx',
    'src/components/product/ProductMedia.tsx',
    'src/components/AppWrapper.tsx',
    'src/components/velari/RecentlyViewed.tsx',
    'src/app/[lang]/products/[id]/ProductClient.tsx',
    'src/app/api/admin/upload/route.ts',
    'src/app/api/read/[id]/route.ts',
    'src/components/reader/BookCanvasReader.tsx'
];

console.log('🚀 Synchronizing unified codebase to Kutubxona...');

let copied = 0;
for (const file of SYNC_FILES) {
    const srcFile = path.join(SRC_DIR, file);
    const dstFile = path.join(DST_DIR, file);

    if (!fs.existsSync(srcFile)) {
        console.warn(`[SKIP] Source not found: ${file}`);
        continue;
    }

    const dstFolder = path.dirname(dstFile);
    if (!fs.existsSync(dstFolder)) {
        fs.mkdirSync(dstFolder, { recursive: true });
    }

    fs.copyFileSync(srcFile, dstFile);
    copied++;
    console.log(` ✅ Synced: ${file}`);
}

console.log(`\n🎉 Successfully synced ${copied}/${SYNC_FILES.length} files to ${DST_DIR}`);
