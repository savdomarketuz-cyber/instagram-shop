const fs = require('fs');
const path = require('path');

const baseDir = 'd:/Desktop/aaa';
const jsonPath = 'd:/Desktop/aaa/grills.json';

function main() {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const localDirs = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

    let totalImages = 0;
    let foldersCount = 0;

    for (const id of Object.keys(data)) {
        const matchDir = localDirs.find(d => d.endsWith(`- ${id}`));
        if (matchDir) {
            const imgPath = path.join(baseDir, matchDir);
            const images = fs.readdirSync(imgPath).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.webp'));
            totalImages += images.length;
            foldersCount++;
        }
    }

    console.log(`Jami papkalar soni: ${foldersCount}`);
    console.log(`Jami rasmlar soni: ${totalImages}`);
}

main();
