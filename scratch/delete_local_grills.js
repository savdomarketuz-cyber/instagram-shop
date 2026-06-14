const fs = require('fs');
const path = require('path');

const baseDir = 'd:/Desktop/aaa';
const jsonPath = 'd:/Desktop/aaa/grills.json';

function main() {
    console.log("=== DELETING LOCAL GRILL DIRECTORIES ===");

    if (!fs.existsSync(jsonPath)) {
        console.error("Error: grills.json not found!");
        return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const localDirs = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

    let deletedCount = 0;

    for (const id of Object.keys(data)) {
        const matchDir = localDirs.find(d => d.endsWith(`- ${id}`) || d.includes(`-${id}`) || d.endsWith(`-${id}`));
        if (matchDir) {
            const fullPath = path.join(baseDir, matchDir);
            
            // Delete folder recursively
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`  Deleted: ${matchDir}`);
            deletedCount++;
        }
    }

    console.log(`\nSuccessfully deleted ${deletedCount} local grill directories.`);
}

main();
