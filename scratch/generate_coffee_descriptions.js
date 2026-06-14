const fs = require('fs');

const jsonPath = 'd:/Desktop/aaa/coffee_makers.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

function getParam(params, keys) {
    for (const key of keys) {
        if (params[key] !== undefined && params[key] !== null) {
            return params[key];
        }
    }
    return null;
}

function cleanDescriptionValUz(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'bor' : 'yo\'q';
    if (Array.isArray(val)) {
        return val.map(item => cleanDescriptionValUz(item)).join(', ');
    }
    
    let str = String(val).trim();
    
    // Check if boolean / simple yes/no
    const lower = str.toLowerCase();
    if (lower === 'yes' || lower === 'true') return 'bor';
    if (lower === 'no' || lower === 'false') return 'yo\'q';

    // Translations mapping for Uzbek descriptions
    const translations = [
        { rx: /антипригарное покрытие|антипригарное|non-stick/ig, rep: "Yopishmaydigan" },
        { rx: /сенсорное управление|сенсорное|touchscreen|touch actions|sensor/ig, rep: "Sensorli" },
        { rx: /механическое|knobs|mechanical/ig, rep: "Mexanik" },
        { rx: /черный|black/ig, rep: "Qora" },
        { rx: /белый|white/ig, rep: "Oq" },
        { rx: /серебристый|silver/ig, rep: "Kumushrang" },
        { rx: /серый|grey|gray/ig, rep: "Kulrang" },
        { rx: /пластик|пластиковый|plastic/ig, rep: "Plastik" },
        { rx: /металл|металлический|metal/ig, rep: "Metall" },
        { rx: /стекло|glass/ig, rep: "Shisha" },
        { rx: /нержавеющая сталь|stainless steel/ig, rep: "Zanglamaydigan po'lat" },
        { rx: /есть/ig, rep: "Bor" },
        { rx: /нет/ig, rep: "Yo'q" },
        { rx: /гарантия/ig, rep: "Kafolat" },
        { rx: /год/ig, rep: "yil" },
        { rx: /лет/ig, rep: "yil" },
        { rx: /мес/ig, rep: "oy" },
        { rx: /от\s+/ig, rep: "dan " },
        { rx: /до\s+/ig, rep: "gacha " },
        { rx: /с\s+/ig, rep: "bilan " },
        
        // Coffee specifics
        { rx: /молотый кофе|ground coffee/ig, rep: "maydalangan qahva" },
        { rx: /кофе в чалдах|coffee pods/ig, rep: "chaldali qahva" },
        { rx: /капсул/ig, rep: "kapsula" },
        { rx: /бар|bar/ig, rep: "bar" },
        { rx: /вт|w/ig, rep: "Vt" },
        { rx: /мл|ml/ig, rep: "ml" }
    ];

    translations.forEach(t => {
        str = str.replace(t.rx, t.rep);
    });

    // Clean up indicators / switches
    if (str.toLowerCase().includes('textured surface') || str.toLowerCase().includes('ribbed surface')) {
        return 'yopishmaydigan';
    }
    if (str.toLowerCase().includes('knob') || str.toLowerCase().includes('min and max')) {
        return 'qulay sozlash tugmasi';
    }
    if (str.toLowerCase().includes('power light') || str.toLowerCase().includes('ready light')) {
        return 'maxsus yorug\'lik indikatori';
    }
    if (str.toLowerCase().includes('digital display')) {
        return 'raqamli displey';
    }

    // Strip "Yes, " / "yes, " / "True, " / "true, "
    return str
        .replace(/^(yes|true|bor),\s*/i, '')
        .replace(/^(от|до|с)\s+/i, (match) => match.toLowerCase())
        .trim();
}

function cleanDescriptionValRu(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'есть' : 'нет';
    if (Array.isArray(val)) return val.join(', ');
    
    let v = String(val).toLowerCase().trim();
    if (v === 'yes' || v === 'true') return 'есть';
    if (v === 'no' || v === 'false') return 'нет';
    
    if (v.includes('textured surface') || v.includes('ribbed surface') || v.includes('non-stick')) {
        return 'антипригарное';
    }
    if (v.includes('knob') || v.includes('min and max')) {
        return 'удобным регулятором';
    }
    if (v.includes('power light') || v.includes('ready light')) {
        return 'световым индикатором';
    }
    if (v.includes('digital display')) {
        return 'цифровым дисплеем';
    }
    
    return String(val)
        .replace(/^(yes|true),\s*/i, '')
        .replace(/^(от|до|с)\s+/i, (match) => match.toLowerCase())
        .trim();
}

let count = 0;

for (const [id, info] of Object.entries(data)) {
    const brand = info.brand || 'Noma\'lum';
    const model = info.model || '';
    const color = info.color || '';
    const params = info.parameters || {};

    const rawPower = getParam(params, ['power', 'power_rating', 'Power', 'Power Rating', 'power rating', 'power_consumption']);
    const rawCapacity = getParam(params, ['capacity', 'volume', 'Capacity', 'bowl_capacity', 'capacities', 'water_tank_capacity', 'Water Reservoir Capacity', 'water_reservoir_capacity', 'water_reservoir']);
    const rawPressure = getParam(params, ['pressure', 'Pressure', 'pump_pressure', 'pressure_system']);
    const rawTimer = getParam(params, ['timer', 'Timer', 'timer_range']);
    const rawControl = getParam(params, ['control_type', 'control', 'control panel', 'display_type', 'control_panel']);
    const rawModes = getParam(params, ['preset_modes', 'preset modes', 'preset_programs', 'preset programs', 'modes', 'programs', 'automatic_modes', 'automatic_programs', 'Coffee Compatibility', 'compatibility', 'compatible_capsules', 'compatible capsules', 'capsule compatibility', 'coffee_modes', 'coffee_making_modes']);
    const rawMaterial = getParam(params, ['material', 'carafe material', 'water container']);
    const rawTemp = getParam(params, ['temperature', 'temperature_control', 'temperature control', 'Temperature Control', 'temperature_range', 'max_temperature', 'maximum temperature']);

    const powerUz = cleanDescriptionValUz(rawPower);
    const capacityUz = cleanDescriptionValUz(rawCapacity);
    const pressureUz = cleanDescriptionValUz(rawPressure);
    const timerUz = cleanDescriptionValUz(rawTimer);
    const controlUz = cleanDescriptionValUz(rawControl);
    const modesUz = cleanDescriptionValUz(rawModes);
    const materialUz = cleanDescriptionValUz(rawMaterial);
    const tempUz = cleanDescriptionValUz(rawTemp);

    const powerRu = cleanDescriptionValRu(rawPower);
    const capacityRu = cleanDescriptionValRu(rawCapacity);
    const pressureRu = cleanDescriptionValRu(rawPressure);
    const timerRu = cleanDescriptionValRu(rawTimer);
    const controlRu = cleanDescriptionValRu(rawControl);
    const modesRu = cleanDescriptionValRu(rawModes);
    const materialRu = cleanDescriptionValRu(rawMaterial);
    const tempRu = cleanDescriptionValRu(rawTemp);

    const title = (info.title_uz || '').toLowerCase();
    
    // Determine type
    let type = 'tomchili_kofe_qaynatgich';
    if (title.includes('kapsula')) {
        type = 'kapsulali_kofe_mashinasi';
    } else if (title.includes('rojog') || title.includes('barista') || (rawPressure && !title.includes('tomchili'))) {
        type = 'rojogli_kofe_mashinasi';
    } else if (title.includes('turk') || title.includes('turka')) {
        type = 'elektr_turka';
    } else if (title.includes('tabletkalari') || title.includes('tozalash')) {
        type = 'tozalash_tabletkalari';
    } else if (title.includes('mashina') || title.includes('mashinka') || title.includes('espresso') || title.includes('cappuccino') || title.includes('latte')) {
        type = 'rojogli_kofe_mashinasi'; // Fallback for general machines
    }

    let description_uz = '';
    let description_ru = '';

    if (type === 'kapsulali_kofe_mashinasi') {
        description_uz = `${brand} ${model} kapsulali kofe mashinasi – bu har kuni ertalab mukammal espresso, kapuchino va boshqa turdagi qahvalarni oson va tezkor tayyorlash uchun ajoyib qurilmadir.`;
        if (pressureUz && pressureUz !== 'bor' && pressureUz !== 'yo\'q') {
            description_uz += ` Qurilma ${pressureUz} bosim ostida ishlaydi, bu esa qahvaning ta'mi va xushbo'yligini to'liq ochib berishini kafolatlaydi.`;
        }
        if (modesUz && modesUz !== 'bor' && modesUz !== 'yo\'q') {
            description_uz += ` Nespresso, Dolce Gusto va maydalangan qahvalar (${modesUz}) bilan mos kelishi uning universal foydalanilishini ta'minlaydi.`;
        }
        if (powerUz && powerUz !== 'bor' && powerUz !== 'yo\'q') {
            description_uz += ` ${powerUz} quvvati tufayli suvni juda tez isitadi va bir necha soniya ichida tayyor qahva taqdim etadi.`;
        }
        if (capacityUz && capacityUz !== 'bor' && capacityUz !== 'yo\'q') {
            description_uz += ` ${capacityUz} sig'imli suv idishi foydalanishda katta qulaylik yaratadi.`;
        }
        description_uz += ` Ixcham va zamonaviy dizayni oshxonangiz interyeriga juda chiroyli mos keladi.`;

        description_ru = `Капсульная кофемашина ${brand} ${model} – это идеальное устройство для быстрого и легкого приготовления эспрессо, капучино и других кофейных напитков каждый день.`;
        if (pressureRu && pressureRu !== 'есть' && pressureRu !== 'нет') {
            description_ru += ` Прибор работает под давлением ${pressureRu}, что гарантирует насыщенный вкус и глубокий аромат каждой чашки.`;
        }
        if (modesRu && modesRu !== 'есть' && modesRu !== 'нет') {
            description_ru += ` Совместимость с капсулами Nespresso, Dolce Gusto и молотым кофе (${modesRu}) делает ее универсальной в использовании.`;
        }
        if (powerRu && powerRu !== 'есть' && powerRu !== 'нет') {
            description_ru += ` Благодаря мощности ${powerRu} кофемашина быстро нагревает воду и готовит напиток за считанные секунды.`;
        }
        if (capacityRu && capacityRu !== 'есть' && capacityRu !== 'нет') {
            description_ru += ` Резервуар для воды объемом ${capacityRu} обеспечивает удобство при частом использовании.`;
        }
        description_ru += ` Компактный и эстетичный дизайн гармонично дополнит интерьер любой современной кухни.`;

    } else if (type === 'rojogli_kofe_mashinasi') {
        description_uz = `${brand} ${model} rojogli kofe mashinasi (espresso apparati) – uyingizda haqiqiy barista kabi professional va shirali qahva tayyorlash imkonini beruvchi qurilmadir.`;
        if (pressureUz && pressureUz !== 'bor' && pressureUz !== 'yo\'q') {
            description_uz += ` ${pressureUz} yuqori bosimli pompa tizimi go'shtdor qahva ko'pigi va boy ekstraksiyani ta'minlaydi.`;
        }
        if (powerUz && powerUz !== 'bor' && powerUz !== 'yo\'q') {
            description_uz += ` Qurilmaning ${powerUz} quvvati suvni tez va kerakli haroratgacha qizdirishga yordam beradi.`;
        }
        description_uz += ` O'rnatilgan kapuchinator (sut ko'pirtirgich) yordamida sevimli kapuchino, latte va makiatoni qalin va mayin ko'pik bilan tayyorlashingiz mumkin.`;
        if (capacityUz && capacityUz !== 'bor' && capacityUz !== 'yo\'q') {
            description_uz += ` ${capacityUz} hajmli suv idishi bir nechta chashka qahvani ketma-ket tayyorlashga yetarli bo'ladi.`;
        }
        if (controlUz && controlUz !== 'bor' && controlUz !== 'yo\'q') {
            description_uz += ` Qulay ${controlUz} paneli orqali barqarorlikning barcha jarayonlarini osongina boshqarish mumkin.`;
        }
        description_uz += ` Uy va ofis uchun professional darajadagi qahva tayyorlashning eng to'g'ri tanlovi!`;

        description_ru = `Рожковая кофемашина (эспрессо-кофеварка) ${brand} ${model} – отличный выбор для приготовления насыщенного и ароматного кофе эспрессо в домашних условиях.`;
        if (pressureRu && pressureRu !== 'есть' && pressureRu !== 'нет') {
            description_ru += ` Высокое давление помпы ${pressureRu} гарантирует плотную кофейную пенку (крема) и превосходную экстракцию вкуса.`;
        }
        if (powerRu && powerRu !== 'есть' && powerRu !== 'нет') {
            description_ru += ` Мощность прибора ${powerRu} обеспечивает быстрый нагрев воды до оптимальной температуры.`;
        }
        description_ru += ` Встроенный ручной или автоматический капучинатор позволяет с легкостью взбивать нежную молочную пенку для капучино, латте или макиато.`;
        if (capacityRu && capacityRu !== 'есть' && capacityRu !== 'нет') {
            description_ru += ` Резервуар для воды объемом ${capacityRu} позволяет приготовить несколько порций кофе подряд.`;
        }
        if (controlRu && controlRu !== 'есть' && controlRu !== 'нет') {
            description_ru += ` Удобная панель управления (${controlRu}) обеспечивает легкий контроль всех параметров.`;
        }
        description_ru += ` Отличный прибор для истинных ценителей кофе и домашнего комфорта.`;

    } else if (type === 'elektr_turka') {
        description_uz = `${brand} ${model} elektr turkasi (kofe qaynatgichi) – an'anaviy turkcha qahvani zamonaviy, tezkor va oson uslubda tayyorlash uchun ajoyib qurilmadir.`;
        if (powerUz && powerUz !== 'bor' && powerUz !== 'yo\'q') {
            description_uz += ` Qurilma ${powerUz} quvvatga ega bo'lib, suvning bir necha daqiqada qaynashini ta'minlaydi.`;
        }
        if (capacityUz && capacityUz !== 'bor' && capacityUz !== 'yo\'q') {
            description_uz += ` ${capacityUz} sig'imi yordamida bir vaqtning o'zida bir nechta chashka haqiqiy quyuq kofe pishira olasiz.`;
        }
        if (materialUz && materialUz !== 'bor' && materialUz !== 'yo\'q') {
            description_uz += ` Korpusi ${materialUz} materialidan tayyorlangan bo'lib, uzoq xizmat qilishini ta'minlaydi va yuvishga oson.`;
        }
        description_uz += ` Haddan tashqari qizib ketishdan va suvsiz yoqishdan himoya tizimi xavfsiz foydalanishni kafolatlaydi.`;

        description_ru = `Электрическая турка ${brand} ${model} – это современный, быстрый и удобный способ приготовления традиционного кофе по-турецки.`;
        if (powerRu && powerRu !== 'есть' && powerRu !== 'нет') {
            description_ru += ` Мощность прибора ${powerRu} обеспечивает быстрое закипание воды за считанные минуты.`;
        }
        if (capacityRu && capacityRu !== 'есть' && capacityRu !== 'нет') {
            description_ru += ` Резервуар объемом ${capacityRu} позволяет приготовить несколько чашек ароматного кофе одновременно.`;
        }
        if (materialRu && materialRu !== 'есть' && materialRu !== 'нет') {
            description_ru += ` Корпус выполнен из качественного материала (${materialRu}), что обеспечивает долговечность и гигиеничность прибора.`;
        }
        description_ru += ` Встроенная система защиты от перегрева и включения без воды делает использование устройства полностью безопасным.`;

    } else if (type === 'tozalash_tabletkalari') {
        description_uz = `${brand} ${model} tozalash tabletkalari – kofe mashinalarini kofe yog'lari, qoldiqlari va tiqilib qolishlardan samarali tozalash uchun mo'ljallangan professional vositadir.`;
        if (capacityUz && capacityUz !== 'bor' && capacityUz !== 'yo\'q') {
            description_uz += ` ${capacityUz} donadan iborat qadoq uzoq muddatli tozalik va mashinaning soz ishlashini ta'minlaydi.`;
        }
        description_uz += ` Qahvaning ta'mi doimo toza va mazali bo'lishi hamda qurilmaning ishlash muddatini uzaytirish uchun muntazam foydalanish tavsiya etiladi. Barcha turdagi avtomat kofe mashinalari uchun mos keladi.`;

        description_ru = `Таблетки для очистки кофемашин ${brand} ${model} – это профессиональное средство для эффективного удаления кофейных масел, налета и остатков кофе из внутренних блоков.`;
        if (capacityRu && capacityRu !== 'есть' && capacityRu !== 'нет') {
            description_ru += ` Упаковка на ${capacityRu} штук обеспечивает длительный уход и стабильную работу кофемашины.`;
        }
        description_ru += ` Регулярное использование продлевает срок службы прибора и сохраняет первозданный, чистый вкус кофейных напитков. Подходит для всех типов автоматических кофемашин.`;

    } else {
        description_uz = `${brand} ${model} tomchili (filtr) kofe qaynatgichi – har kuni ertalab yangi damlangan va xushbo'y filtr-qahva ichishni xush ko'ruvchilar uchun eng qulay va tejamkor yechimdir.`;
        if (capacityUz && capacityUz !== 'bor' && capacityUz !== 'yo\'q') {
            description_uz += ` ${capacityUz} hajmli shisha idishi va katta suv tanki tufayli bir vaqtning o'zida butun oila yoki jamoa uchun qahva damlaydi.`;
        }
        if (powerUz && powerUz !== 'bor' && powerUz !== 'yo\'q') {
            description_uz += ` ${powerUz} quvvati suvni optimal haroratda isitib, qahva donalarining ta'mini to'liq ochib berishini ta'minlaydi.`;
        }
        description_uz += ` Avtomatik isitish paneli (auto-heating) damlangan qahvani uzoq vaqt davomida issiq va yangi holda saqlab turadi. Tomchilarga qarshi (anti-drip) klapan esa foydalanishni yanada toza va qulay qiladi.`;

        description_ru = `Капельная кофеварка ${brand} ${model} – это простое, надежное и экономичное устройство для приготовления классического фильтр-кофе дома или в офисе.`;
        if (capacityRu && capacityRu !== 'есть' && capacityRu !== 'нет') {
            description_ru += ` Вместительный стеклянный кувшин объемом ${capacityRu} позволяет за один цикл приготовить кофе для всей семьи или коллектива.`;
        }
        if (powerRu && powerRu !== 'есть' && powerRu !== 'нет') {
            description_ru += ` Мощность ${powerRu} обеспечивает нагрев воды до оптимальной температуры экстракции для идеального раскрытия кофейного вкуса.`;
        }
        description_ru += ` Функция автоподогрева сохраняет готовый напиток горячим в течение долгого времени, а противокапельная система предотвращает проливание жидкости при снятии кувшина.`;
    }

    info.description_uz = description_uz;
    info.description_ru = description_ru;
    count++;
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Successfully generated and cleaned descriptions for ${count} products in coffee_makers.json!`);
