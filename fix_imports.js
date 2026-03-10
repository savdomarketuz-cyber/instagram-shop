const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            if (fullPath.includes('firebase.ts')) return;

            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // Pattern 1: firebase/firestore followed by @/lib/firebase
            const pattern1 = /import\s*{([^}]+)}\s*from\s*"firebase\/firestore";\s*import\s*{\s*db\s*}\s*from\s*"@\/lib\/firebase";/g;
            if (pattern1.test(content)) {
                content = content.replace(pattern1, (match, p1) => {
                    return `import { db, ${p1.trim()} } from "@/lib/firebase";`;
                });
                changed = true;
            }

            // Pattern 2: @/lib/firebase followed by firebase/firestore
            const pattern2 = /import\s*{\s*db\s*}\s*from\s*"@\/lib\/firebase";\s*import\s*{([^}]+)}\s*from\s*"firebase\/firestore";/g;
            if (pattern2.test(content)) {
                content = content.replace(pattern2, (match, p1) => {
                    return `import { db, ${p1.trim()} } from "@/lib/firebase";`;
                });
                changed = true;
            }

            // Pattern 3: Relative path ./firebase
            const pattern3 = /import\s*{([^}]+)}\s*from\s*"firebase\/firestore";\s*import\s*{\s*db\s*}\s*from\s*"\.\/firebase";/g;
            if (pattern3.test(content)) {
                content = content.replace(pattern3, (match, p1) => {
                    return `import { db, ${p1.trim()} } from "./firebase";`;
                });
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed imports in:', fullPath);
            }
        }
    });
};

walk('src');
console.log('Cleanup finished.');
