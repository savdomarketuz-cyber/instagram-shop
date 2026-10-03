import fs from 'fs';
import path from 'path';

function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

async function syncPickupPoints() {
    console.log('🚀 BTS va EMU punktlarini sinxronlash boshlandi...');

    // 1. EMU Fetch
    console.log('📡 EMU API dan punktlar olinmoqda...');
    const emuRes = await fetch('https://api.emu.uz/api/v1/branches', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!emuRes.ok) {
        throw new Error(`EMU API xatosi: ${emuRes.status}`);
    }
    const emuRaw = await emuRes.json();
    const emuBranches = Array.isArray(emuRaw) ? emuRaw : (emuRaw.data || []);
    console.log(`✅ EMU punktlari olindi: ${emuBranches.length} ta`);

    const emuRegionMap = {
        'Toshkent': 'tashkent_city',
        'Toshkent viloyati': 'tashkent_region',
        'Andijon viloyati': 'andijan',
        'Buxoro viloyati': 'bukhara',
        'Farg‘ona viloyati': 'fergana',
        "Farg'ona viloyati": 'fergana',
        'Jizzax viloyati': 'jizzakh',
        'Xorazm viloyati': 'khorezm',
        'Namangan viloyati': 'namangan',
        'Navoiy viloyati': 'navoiy',
        'Qashqadaryo viloyati': 'kashkadarya',
        'Samarqand viloyati': 'samarkand',
        'Sirdaryo viloyati': 'sirdaryo',
        'Surxondaryo viloyati': 'surkhandarya',
        'Qoraqalpog‘iston Respublikasi': 'karakalpakstan',
        "Qoraqalpog'iston Respublikasi": 'karakalpakstan',
    };

    const emuPoints = emuBranches.map(b => {
        const regId = emuRegionMap[b.region_name] || 'tashkent_city';
        const rawName = (b.name || '').trim();
        const name = rawName.toLowerCase().endsWith('ofisi') || rawName.toLowerCase().endsWith('ofis')
            ? rawName
            : `${rawName} ofisi`;

        let landmark = b.address_ref ? b.address_ref.replace(/\r?\n/g, ', ').trim() : undefined;
        let phone = b.phone ? b.phone.split(',')[0].trim() : '+998 71 200 96 69';
        if (phone.length === 12 && phone.startsWith('998')) {
            phone = `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10, 12)}`;
        }

        let schedule = 'Du-Sha: 09:00 - 18:00';
        if (Array.isArray(b.work_schedule) && b.work_schedule.length > 0) {
            const first = b.work_schedule[0];
            const start = (first.start_time || '09:00').slice(0, 5);
            const end = (first.end_time || '18:00').slice(0, 5);
            schedule = `Du-Sha: ${start} - ${end}`;
        }

        return {
            id: `emu-${b.id}`,
            provider: 'emu',
            name,
            region_id: regId,
            address: (b.address || '').trim(),
            landmark: landmark || undefined,
            phone,
            schedule,
            lat: Number(b.latitude),
            lng: Number(b.longitude)
        };
    });

    // 2. BTS Fetch
    console.log('📡 BTS veb-sahifasidan punktlar olinmoqda...');
    const btsRes = await fetch('https://bts.uz/uz/nashi-ofisi', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!btsRes.ok) {
        throw new Error(`BTS veb-sahifasi xatosi: ${btsRes.status}`);
    }
    const btsHtml = await btsRes.text();

    const btsRegex = /new\s+ymaps\.Placemark\(\s*\[\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*\]\s*,\s*\{([\s\S]*?)\}\s*,\s*\{/g;
    let match;
    const btsPoints = [];

    const btsRegionPrefixMap = {
        '01': 'tashkent_city',
        '03': 'tashkent_city',
        '10': 'tashkent_region',
        '20': 'sirdaryo',
        '25': 'jizzakh',
        '30': 'samarkand',
        '40': 'fergana',
        '50': 'namangan',
        '60': 'andijan',
        '70': 'kashkadarya',
        '75': 'surkhandarya',
        '80': 'bukhara',
        '85': 'navoiy',
        '90': 'khorezm',
        '95': 'karakalpakstan',
    };

    let btsIdx = 1;
    while ((match = btsRegex.exec(btsHtml)) !== null) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        const body = match[3];

        const nameMatch = body.match(/<b>([^<]+)<\/b>/i);
        let rawName = decodeHtml(nameMatch ? nameMatch[1] : `BTS #${btsIdx}`);
        let name = rawName;
        if (!name.startsWith('BTS ') && !name.startsWith('BTS')) {
            name = `BTS ${name}`;
        }

        const phoneMatch = body.match(/href="tel:([^"]+)"/i);
        const phone = phoneMatch ? phoneMatch[1].trim() : '1230';

        const addressMatch = body.match(/Manzil:<\/div>[\s\S]*?<div class="description-bts">([\s\S]*?)<\/div>/i);
        let fullAddress = decodeHtml(addressMatch ? addressMatch[1].replace(/[`+]/g, '') : '');

        let address = fullAddress;
        let landmark = '';
        const separators = ['or:', 'Or:', 'OR:', 'ml:', 'Ml:', 'ML:', "mo'ljal:", "Mo'ljal:"];
        for (const sep of separators) {
            if (address.includes(sep)) {
                const parts = address.split(sep);
                address = parts[0].trim();
                landmark = parts.slice(1).join(sep).trim();
                break;
            }
        }

        const timeMatch = body.match(/Ish vaqtlari:<\/div>[\s\S]*?<div class="work">([\s\S]*?)<\/div>/i);
        const schedule = timeMatch
            ? decodeHtml(timeMatch[1].replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' '))
            : '24 soat (Bayram kunlaridan tashqari)';

        // Region aniqlash
        let regionId = 'other';
        if (rawName.includes('#90001') || rawName.includes('#79') || rawName.includes('#82')) {
            regionId = 'other';
        } else {
            const codeMatch = rawName.match(/#(\d{2})/);
            if (codeMatch && btsRegionPrefixMap[codeMatch[1]]) {
                regionId = btsRegionPrefixMap[codeMatch[1]];
            }
        }

        const pointCode = (rawName.match(/#(\d+)/)?.[1]) || String(btsIdx);

        btsPoints.push({
            id: `bts-${pointCode}`,
            provider: 'bts',
            name,
            region_id: regionId,
            address,
            landmark: landmark || undefined,
            phone,
            schedule,
            lat,
            lng
        });
        btsIdx++;
    }

    console.log(`✅ BTS punktlari olindi: ${btsPoints.length} ta`);

    // Barcha punktlarni birlashtirish
    const allPoints = [...emuPoints, ...btsPoints];
    console.log(`📦 Jami punktlar soni: ${allPoints.length} ta (EMU: ${emuPoints.length}, BTS: ${btsPoints.length})`);

    const outDir = path.resolve('src/lib/data');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const outFile = path.join(outDir, 'pickup-points.json');
    fs.writeFileSync(outFile, JSON.stringify(allPoints, null, 2), 'utf-8');
    console.log(`💾 Fayl muvaffaqiyatli saqlandi: ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);

    // Viloyatlar bo'yicha statistika
    const stats = {};
    for (const p of allPoints) {
        if (!stats[p.region_id]) stats[p.region_id] = { total: 0, bts: 0, emu: 0 };
        stats[p.region_id].total++;
        stats[p.region_id][p.provider]++;
    }
    console.log('\n📊 14 ta hudud bo\'yicha taqsimot:');
    console.table(stats);
}

syncPickupPoints().catch(err => {
    console.error('❌ Xatolik yuz berdi:', err);
    process.exit(1);
});
