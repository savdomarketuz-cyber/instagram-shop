import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(k + '=([^\\r\\n]+)')); return m ? m[1].trim() : ''; };
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const BANNED_PATTERNS = [
    /innovatsion/i,
    /betakror/i,
    /ajralmas\s+yordamchi/i,
    /mukammal\s+yechim/i,
    /yangi\s+bosqich/i,
    /nafis\s+dizayn/i,
    /shoshiling/i,
    /bugunoq\s+xarid/i,
    /siz\s+kutgan/i,
    /hayotingizni\s+o'zgartiradi/i
];

function lintText(title, text) {
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(text)) {
            throw new Error(`AI-slop detected in "${title}": matches ${pattern}`);
        }
    }
}

const blogs = [
    {
        id: "a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab",
        slug: "mac-styler-cronier-soch-dazmoli-taqqoslash",
        title: "M.A.C Styler va Cronier soch dazmollari: MC-2218, MC-3083, MC-2021 va CR-777 — qaysi biri nimaga mos?",
        title_uz: "M.A.C Styler va Cronier soch dazmollari: MC-2218, MC-3083, MC-2021 va CR-777 — qaysi biri nimaga mos?",
        title_ru: "Гид по стайлерам M.A.C Styler и Cronier: MC-2218, MC-3083, MC-2021 и CR-777 — в чем разница?",
        category: "Xarid bo'yicha qo'llanma",
        read_time: 6,
        image: "https://media.velari.uz/file/velariuz/admin/images/s2_206_MACSTYLER-MC-2218-KUMUSHVAQORA_c1_1792323546705.avif",
        excerpt_uz: "Bozorda 'stayler' yoki 'soch dazmoli' deb sotilayotgan modellar aslida 3 xil vazifani bajaradi: tekislash, hajm beruvchi gofre va konus jingalaklash. Farqlar, harorat rejimlari va xaridorlar tajribasi.",
        excerpt_ru: "Утюжки, гофре и конусные плойки часто путают между собой. Разбираем реальные отличия популярных моделей M.A.C Styler и Cronier по температуре, пластинам и практическому назначению.",
        linked_product_ids: [
            "843911be-e8bf-4c4c-b1e2-3a2aaddbb8e1", // MC-2218
            "60bc89dd-8335-455b-81fc-2db40aff5503", // MC-3083
            "6486cb52-2197-49db-843c-6ceb219d3a92", // MC-2021
            "7f8c3723-9b79-40cd-bba2-174f57e23188", // CR-777
            "ea7ca037-64c1-44aa-93e2-ef756a6e28a2"  // JR-304
        ],
        content_uz: `Ko'pchilik xaridorlar qutidagi yozuvlarga qarab adashadi: sotuvchilar barcha apparatlarni birdek "stayler" yoki "dazmol" deb ataydi. Natijada sochini silliq tekislayman deb gofre sotib olgan yoki aksincha, ildizdan hajm berolmay qolgan holatlar ko'p uchraydi.

Keling, ombordagi 5 ta ommabop modelni vazifasi, plastina kengligi va haroratiga qarab aniq ajratib chiqamiz.

## 1. Asosiy farqlar jadvali

| Model | Asosiy vazifasi | Qoplamasi | Maks. harorat | Kimga tavsiya etiladi? |
| J·R·M JR-304 | Kundalik tekislash | Keramika | 230°C (450°F) | Safar va byudjetli variant |
| CRONIER CR-777 | Keratin va tekislash | Titan-turmalin | 220°C | Uyda tez-tez tekislovchilarga |
| M.A.C MC-2218 | Jingalak qilish (Konus) | Keramika | 230°C | Tabiiy to'lqinsimon jingalak |
| M.A.C MC-3083 | Ildizdan hajm (Gofre) | Mayda gofre plita | 230°C | Yupqa sochlarga hajm berish |
| M.A.C MC-2021 | Keng tekislash | Keng keramika | 230°C | Qalin, uzun va o'jar sochlarga |

## 2. Modelma-model tahlil va real foydalanish tajribasi

### M.A.C Styler MC-2218: Konusli ployka (faqat jingalak uchun)
Bu model tekislovchi dazmol emas. Uning korpusi asosida 25 mm dan uchiga qarab 9 mm gacha torayib boruvchi konus shaklida ishlangan.

[product:843911be-e8bf-4c4c-b1e2-3a2aaddbb8e1]

:::pros
+ Qisqich (zajim) yo'qligi sababli sochda sinish yoki bukilgan chiziq izi qolmaydi, jingalak tabiiy tushadi.
+ 30 soniyada tez qiziydi, raqamli ekranda harorat aniq ko'rinadi.
+ 360 daraja aylanuvchi sim ushlashni osonlashtiradi.
:::

:::cons
- Qisqichi bo'lmagani uchun soch uchini qo'lda ushlab turish kerak. Komplektdagi issiqlikdan himoya qo'lqopini taqmasangiz, barmoqni kuydirib olish oson.
:::

### M.A.C Styler MC-3083: Hajm beruvchi gofre dazmoli
Agar sochingiz yupqa bo'lsa va boshga yopishib qolsa, oddiy tekislagich yordam bermaydi. MC-3083 aynan soch ildiziga yaqin joyda mayda to'lqinlar hosil qilib, 2-3 kun saqlanib turuvchi hajm berish uchun kerak.

[product:60bc89dd-8335-455b-81fc-2db40aff5503]

:::pros
+ Ildizdan berilgan hajm lak yoki muss ishlatmasdan ham 2 kungacha turadi.
+ Plitalar orasi zich yopiladi, sochni bir tekis qizdiradi.
:::

:::cons
- Bu tekislagich emas. Sochning butun uzunligi bo'ylab tortib tekislashga urinmang — u faqat gofre tekstura beradi.
:::

### CRONIER CR-777 va M.A.C MC-2021: Klassik tekislagichlar
Agar sizga har kuni sochni oynadek silliq qilish kerak bo'lsa, shu ikkisidan birini tanlaysiz:

[product:7f8c3723-9b79-40cd-bba2-174f57e23188]

* **CRONIER CR-777 (139 000 so'm):** Standart kenglikdagi plitalar. O'rtacha uzunlikdagi sochlar va karelarga juda qulay. Arzon narxda LED displey va tez qizish tizimiga ega.
* **M.A.C MC-2021 (278 070 so'm):** Plitalari ancha kengroq. Qalin, uzun yoki tabiiy jingalak sochlarni tezroq tekislash imkonini beradi, chunki bitta harakatda kattaroq tutamni qamrab oladi.

[product:6486cb52-2197-49db-843c-6ceb219d3a92]

## 3. Harorat bo'yicha muhim amaliy qoidalar

Har qanday dazmolni maksimal 230°C ga qo'yib ishlatish sochni tezda quritib yuboradi. Professional sartaroshlar tavsiyasi:
* **140–160°C:** Bo'yalgan, ochartirilgan (meliorovanniy) yoki ingichka sochlar uchun yetarli;
* **170–190°C:** Oddiy, o'rtacha qalinlikdagi tabiiy sochlar uchun;
* **200–230°C:** Faqat juda qalin, qattiq va jingalak sochlarga kerak.

> Har qanday termik apparatdan foydalanishdan oldin termospray (issiqlikdan himoyalovchi vosita) sepish shart. Bu sochni sinishdan va uchlari gullashidan asraydi.

## 4. Xulosa: Qaysi birini tanlash kerak?
* Sochga **hajm** kerak bo'lsa ➡️ **MC-3083 (Gofre)**
* Chiroyli **jingalak va to'lqin** kerak bo'lsa ➡️ **MC-2218 (Konus)**
* Har kungi **tekislash** uchun hamyonbop variant ➡️ **CR-777** yoki **JR-304**
* **Qalin va uzun sochlarni** tez tekislash uchun ➡️ **MC-2021**`,

        content_ru: `Многие покупатели путаются в терминах: в магазинах словом «стайлер» или «утюжок» часто называют абсолютно разные по назначению приборы. В итоге вместо выпрямителя приобретают гофре для объема, или наоборот — не могут добиться желанных локонов.

Разбираем 5 популярных моделей M.A.C Styler, Cronier и J.R.M, чтобы вы выбрали именно то, что нужно вашим волосам, и не переплачивали за лишние функции.

## 1. Сравнительная таблица характеристик

| Модель | Назначение | Покрытие | Макс. нагрев | Для кого подходит? |
| J·R·M JR-304 | Выпрямление на каждый день | Керамика | 230°C (450°F) | Бюджетный и дорожный вариант |
| CRONIER CR-777 | Выпрямление и кератин | Турмалин/керамика | 220°C | Домашнее регулярное выпрямление |
| M.A.C MC-2218 | Плойка конусная (кудри) | Керамика | 230°C | Естественные объемные локоны |
| M.A.C MC-3083 | Прикорневой объем (Гофре) | Мелкое гофре | 230°C | Тонкие волосы, лишенные объема |
| M.A.C MC-2021 | Широкий выпрямитель | Керамика (широкая) | 230°C | Длинные, густые и жесткие волосы |

## 2. Разбор моделей на основе реального опыта использования

### M.A.C Styler MC-2218: Конусная плойка без зажима
Это не утюжок, а плойка с сужающимся стволом (от 25 мм у основания до 9 мм на кончике). 

[product:843911be-e8bf-4c4c-b1e2-3a2aaddbb8e1]

:::pros
+ Отсутствие металлического зажима гарантирует отсутствие заломов на прядях — локон получается мягким и упругим.
+ Нагрев за 30 секунд, температура контролируется на цифровом дисплее.
+ Шнур вращается на 360 градусов, провод не запутывается при накрутке.
:::

:::cons
- Кончик пряди нужно придерживать пальцами. Обязательно используйте термоперчатку из комплекта, чтобы не обжечь руку.
:::

### M.A.C Styler MC-3083: Плойка-гофре для стойкого объема
Классический утюжок не дает объема у корней. Модель MC-3083 имеет мелкую волнистую текстуру пластин, которая приподнимает волосы у самого основания.

[product:60bc89dd-8335-455b-81fc-2db40aff5503]

:::pros
+ Прикорневой объем держится 2–3 дня даже без обильного использования лака и мусса.
+ Пластины плотно прилегают друг к другу, равномерно прогревая прядь.
:::

:::cons
- Это не выпрямитель. Протягивать им пряди по всей длине нельзя — он создает рельефную гофрированную текстуру.
:::

### CRONIER CR-777 и M.A.C MC-2021: Выпрямители
Если ваша главная задача — гладкие шелковистые пряди:

[product:7f8c3723-9b79-40cd-bba2-174f57e23188]

* **CRONIER CR-777 (139 000 сум):** Стандартная ширина пластин. Идеален для волос средней длины, каре и челки. Отличное соотношение цены, наличия LED-экрана и быстрого прогрева.
* **M.A.C MC-2021 (278 070 сум):** Увеличенная площадь пластин. Позволяет захватывать широкие пряди густых волос, сокращая время утренней укладки в два раза.

[product:6486cb52-2197-49db-843c-6ceb219d3a92]

## 3. Советы экспертов по выбору температуры

Не стоит выставлять прибор на максимальные 230°C без необходимости:
* **140–160°C:** Тонкие, осветленные или поврежденные волосы;
* **170–190°C:** Натуральные волосы средней густоты;
* **200–230°C:** Густые, жесткие, сильно вьющиеся пряди.

> Перед любой горячей укладкой обязательно наносите термозащитный спрей — это базовое правило, сохраняющее структуру и блеск волос.

## 4. Резюме
* Нужен стойкий **объем у корней** ➡️ **MC-3083 (Гофре)**
* Хотите натуральные **голливудские кудри** ➡️ **MC-2218 (Конусная плойка)**
* Практичный выпрямитель на **каждый день** ➡️ **CR-777** или **JR-304**
* Для **густых и длинных** волос ➡️ **MC-2021** с широкими пластинами`
    },
    {
        id: "b2c3d4e5-f6a7-4b8c-9d0e-123456789abc",
        slug: "trimmer-mashinka-sheyver-vgr-taqqoslash",
        title: "Trimmer, mashinka yoki sheyver: VGR V-003, V-359 va V-345 qanday farqlanadi?",
        title_uz: "Trimmer, mashinka yoki sheyver: VGR V-003, V-359 va V-345 qanday farqlanadi?",
        title_ru: "Триммер, машинка или шейвер: отличия VGR V-003, V-359 и V-345 — что выбрать?",
        category: "Erkaklar parvarishi",
        read_time: 5,
        image: "https://media.velari.uz/file/velariuz/admin/images/s2_117_VGR-V003-QORA_c1_1792323304476.avif",
        excerpt_uz: "Soqolni tozalash, sochni tekislash yoki kantovka qilish uchun bitta apparat yetmaydi. VGR mashinkalari, trimmerlari va sheyverlarining aniq vazifalari hamda pichoq turlari bo'yicha to'liq qo'llanma.",
        excerpt_ru: "Стрижка волос, окантовка бороды и бритье под ноль требуют совершенно разных инструментов. Разбираем разницу между мощной машинкой V-003, детальным триммером V-359 и сеточным шейвером V-345.",
        linked_product_ids: [
            "ce83adb8-3c69-40a4-bfcc-4a91c645a239", // VGR V-003
            "359cfa2c-fbc0-4f5b-8cc3-2f4b3f16c87b", // VGR V-359
            "b048457a-c8c3-4f90-b702-bfb6efc22856", // VGR V-345
            "18b3db7f-bd53-4824-bdcd-4e04caad4514"  // VGR V-130
        ],
        content_uz: `Ko'pchilik erkaklar bitta apparat bilan ham sochni olishni, ham soqolning chetini to'g'rilashni, ham yuzni qirtishlab silliq qilishni xohlaydi. Lekin amalda bu uchta butunlay boshqa vazifa hisoblanadi.

Bitta apparat bilan hammasini qilishga uringanda, yo soqol qirtishlanmay qoladi, yoki nozik joylar qizarib achishadi.

Keling, VGR turkumidagi 3 ta asosiy asbobning farqini ko'rib chiqamiz.

## 1. Asbob turlarining farqi

| Qurilma turi | Namuna model | Pichoq kengligi | Vazifasi | Qoldiradigan uzunlik |
| Mashinka (Clipper) | VGR V-003 | 45 mm (keng) | Boshdagi asosiy sochni olish, o'tishlar (fade) | 0.8 mm dan 12 mm gacha |
| Trimmer (Detailer) | VGR V-359 | 30–35 mm (tor T-pichoq) | Soqol konturi, mo'ylov, quloq/bo'yin atrofi | 0.1 – 0.3 mm |
| To'rli Sheyver | VGR V-345 | Ikki qavatli to'r | Yuzni qirtishlab 'nol'ga olish | 0 mm (silliq teri) |

## 2. Real foydalanish va amaliy jihatlar

### 1. VGR V-003: 9000 ayl/daqiqali professional mashinka
Bu uyda sochni tez va toza olish, shuningdek boshlovchi sartaroshlar uchun mo'ljallangan og'ir toifadagi apparat.

[product:ce83adb8-3c69-40a4-bfcc-4a91c645a239]

:::pros
+ 9000 aylanish/daqiqali motor qalin va qattiq sochlarni ham qisib qolmasdan oson kesadi.
+ Korpus yonidagi richag yordamida pichoq balandligini nasadkasiz ham sozlab, silliq o'tish (fade) qilish mumkin.
+ Katta sig'imli akkumulyator uzoq vaqt quvvatsiz ishlaydi.
:::

:::cons
- Motor kuchli bo'lgani uchun pichoq bloki 10 daqiqalik to'xtovsiz ishdan keyin qiziydi (bu professional apparatlarda tabiiy holat).
- Yuzni 'nol'ga qirtishlash uchun mos emas — pichog'i keng va qalin.
:::

### 2. VGR V-359: Soqol va kantovka trimmeri
Metall korpusli, ixcham T-shaklidagi pichoqqa ega trimmer. Uning vazifasi — aniq chiziqlar chizish.

[product:359cfa2c-fbc0-4f5b-8cc3-2f4b3f16c87b]

:::pros
+ Tor pichog'i quloq orqasi, iyak va mo'ylov chizig'ini millimeterigacha aniq to'g'rilash imkonini beradi.
+ Metall korpusi qo'lda mustahkam turadi va sirpanmaydi.
:::

:::cons
- Boshdagi qalin sochni butunlay olishga mo'ljallanmagan — pichoq kengligi yetmaydi va jarayon juda cho'zilib ketadi.
:::

### 3. VGR V-345: To'rli elektr ustara (Sheyver)
Trimmer bilan soqol qirqilgandan keyin ham terida 0.2–0.3 mm tuk qoladi. Yuzni stanokdek silliq qilish uchun aynan sheyver ishlatiladi.

[product:b048457a-c8c3-4f90-b702-bfb6efc22856]

:::pros
+ Yuz terisini pichoq bevosita kesmaydi, balki to'r ichiga kirgan tuklar olinadi — bu terini qichishish va toshmalardan asraydi.
+ IPX7 suvdan himoyasi bor, suv ostida yuvish mumkin.
+ Type-C orqali telefon zaryadkasi bilan ham quvvatlanadi.
:::

:::cons
- Uzun soqolni olmaydi! Sheyver faqat 1-2 kunlik qisqa tuklarni qirtishlash uchun ishlaydi. Avval uzun tukni trimmerda qisqartirish shart.
:::

## 3. Xulosa: Sizga qaysi biri kerak?
* Agar maqsad **boshdagi sochni olish** bo'lsa ➡️ **VGR V-003**
* Agar maqsad **soqol shaklini to'g'rilash va tekislash** bo'lsa ➡️ **VGR V-359**
* Agar maqsad **yuzni stanoksiz, qizarishlarsiz silliq qirtishlash** bo'lsa ➡️ **VGR V-345**`,

        content_ru: `Многие мужчины рассчитывают купить один универсальный прибор, которым можно и постричь голову, и подровнять контур бороды, и начисто побрить щеки. Но на практике это три абсолютно разные технические задачи.

Попытка использовать один прибор для всего приводит либо к раздражению кожи, либо к неаккуратной стрижке.

Разбираем разницу между машинкой, триммером и сеточным шейвером на примере линейки VGR.

## 1. Таблица назначения приборов

| Тип прибора | Модель | Ширина ножа | Основная задача | Длина среза |
| Машинка (Clipper) | VGR V-003 | 45 мм (широкий) | Стрижка массы волос на голове, переходы (фейд) | от 0.8 до 12 мм |
| Триммер (Detailer) | VGR V-359 | 30–35 мм (узкий Т-нож) | Окантовка бороды, усов, линии шеи и за ушами | 0.1 – 0.3 мм |
| Сеточный шейвер | VGR V-345 | Двойная сетка | Гладко бритье под ноль без раздражения | 0 мм (гладкая кожа) |

## 2. Практический разбор каждой модели

### 1. VGR V-003: Мощная машинка для стрижки (9000 об/мин)
Полноценная машинка с высокооборотистым роторным мотором для стрижки волос любой густоты.

[product:ce83adb8-3c69-40a4-bfcc-4a91c645a239]

:::pros
+ Скорость 9000 об/мин позволяет легко срезать жесткие волосы без «зажевывания» и рывков.
+ Боковой рычаг регулирует высоту среза ножа, что позволяет делать плавные переходы (фейды) даже без насадок.
+ Вместительный аккумулятор гарантирует долгую автономную работу.
:::

:::cons
- Ножевой блок при непрерывной интенсивной работе нагревается через 10–12 минут (норма для скоростных моторов).
- Не подходит для чистого бритья лица под ноль — нож слишком широкий и массивный.
:::

### 2. VGR V-359: Металлический триммер для четких линий
Компактный прибор с открытым Т-образным ножевым блоком для детальных работ.

[product:359cfa2c-fbc0-4f5b-8cc3-2f4b3f16c87b]

:::pros
+ Узкий нож позволяет выводить идеальные контуры бороды, подстригать усы и подчищать линию шеи.
+ Металлический корпус приятно тяжелит руку и не скользит во время работы.
:::

:::cons
- Не предназначена для стрижки всей головы — это займет слишком много времени из-за небольшой ширины ножа.
:::

### 3. VGR V-345: Электробритва-шейвер
Триммер срезает волос близко к коже, но оставляет микро-щетину (0.2–0.3 мм). Чтобы кожа стала идеально гладкой, как после станка, используется шейвер.

[product:b048457a-c8c3-4f90-b702-bfb6efc22856]

:::pros
+ Лезвия скрыты за тончайшей гипоаллергенной сеткой: они не касаются кожи напрямую, защищая лицо от порезов и раздражения.
+ Защита от воды IPX7 — прибор легко промывается под краном.
+ Зарядка через стандартный порт Type-C.
:::

:::cons
- Не бреет длинные волосы! Шейвер рассчитан исключительно на короткую 1–2 дневную щетину. Длинную щетину сначала нужно укоротить триммером.
:::

## 3. Резюме: Что именно вам нужно?
* Для **стрижки волос на голове** ➡️ **VGR V-003**
* Для **моделирования бороды и окантовки** ➡️ **VGR V-359**
* Для **гладкого бритья лица без раздражения** ➡️ **VGR V-345**`
    }
];

async function main() {
    console.log('🚀 Checking and validating articles...');
    for (const b of blogs) {
        lintText(b.title_uz, b.content_uz);
        lintText(b.title_ru, b.content_ru);
        console.log(`✅ Linter passed for: "${b.title_uz}" (0 banned AI words)`);
    }

    console.log('\n📦 Inserting/Upserting into Supabase "blogs" table...');
    for (const b of blogs) {
        const payload = {
            id: b.id,
            slug: b.slug,
            title: b.title,
            title_uz: b.title_uz,
            title_ru: b.title_ru,
            excerpt_uz: b.excerpt_uz,
            excerpt_ru: b.excerpt_ru,
            content: b.content_uz,
            content_uz: b.content_uz,
            content_ru: b.content_ru,
            category: b.category,
            read_time: b.read_time,
            image: b.image,
            linked_product_ids: b.linked_product_ids,
            is_published: true,
            is_deleted: false,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('blogs').upsert(payload, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Failed to insert "${b.slug}":`, error);
        } else {
            console.log(`🎉 Successfully published: /uz/blog/${b.slug}`);
        }
    }

    const { count } = await supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
    console.log(`\n📊 Total published blogs in DB now: ${count}`);
}

main().catch(console.error);
