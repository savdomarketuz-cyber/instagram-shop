import pg from 'pg';
import fs from 'fs';
import { getDatabaseUrl } from './get_db_url.mjs';

// Exact translation mapping for all 160 untranslated / duplicate parameter values
const TRANSLATION_MAP = {
  // --- Bosh turi / Тип головки ---
  "3D panoramik bosh, 360°": {
    uz: "3D panoramik bosh, 360°",
    ru: "3D панорамная головка, 360°"
  },
  "Ball head, 360° aylanadi": {
    uz: "Sharli bosh (Ball head), 360° aylanadi",
    ru: "Шаровая головка, вращение на 360°"
  },
  "Pan-tilt bosh, gorizontal qo'l": {
    uz: "Pan-tilt bosh, gorizontal tutqich",
    ru: "Панорамная головка (Pan-tilt), горизонтальная ручка"
  },
  "Pan-tilt professional bosh": {
    uz: "Pan-tilt professional bosh",
    ru: "Профессиональная панорамная (Pan-tilt) головка"
  },

  // --- Material / Материал ---
  "Aluminiy qotishma": {
    uz: "Alyuminiy qotishmasi",
    ru: "Алюминиевый сплав"
  },

  // --- Mos qurilmalar / Совместимые устройства ---
  "DSLR Kamera, Mirrorless Kamera, Smartfon, Aksiya-kamera": {
    uz: "DSLR kamera, Mirrorless kamera, smartfon, ekshn-kamera",
    ru: "DSLR камера, беззеркальная камера, смартфон, экшн-камера"
  },
  "Kamera, Smartfon, Planshet, Proyektor, Ring Light, Aksiya-kamera": {
    uz: "Kamera, smartfon, planshet, proyektor, halqali chiroq, ekshn-kamera",
    ru: "Камера, смартфон, планшет, проектор, кольцевая лампа, экшн-камера"
  },
  "Smartfon, Kamera, Aksiya-kamera": {
    uz: "Smartfon, kamera, ekshn-kamera",
    ru: "Смартфон, камера, экшн-камера"
  },
  "Smartfon, Kamera, Aksiya-kamera, Proyektor": {
    uz: "Smartfon, kamera, ekshn-kamera, proyektor",
    ru: "Смартфон, камера, экшн-камера, проектор"
  },

  // --- Qo'shimchalar / Насадки (Комплектация) ---
  "Nuqtali epilyatsiya,nozik joylar uchun nozul,sovutish": {
    uz: "Nuqtali epilyatsiya, nozik joylar uchun nasadka, sovutish tizimi",
    ru: "Точечная эпиляция, насадка для деликатных зон, охлаждение"
  },

  // --- Xususiyatlari / Особенности ---
  "impulslar soni cheklanmagan": {
    uz: "Impulslar soni cheklanmagan",
    ru: "Неограниченное количество вспышек"
  },

  // --- Pichoq materiali / Материал лезвий ---
  "3 ta suzilib yuruvchi tishli bosh (ko'g'irlodli metall)": {
    uz: "3 ta suzuvchi pichoqli bosh (metall)",
    ru: "3 плавающие бреющие головки (металл)"
  },
  "5D sirtga moslaydigan zanglamas po'lat boshlar": {
    uz: "5D suzuvchi zanglamas po'lat boshlar",
    ru: "5D плавающие головки из нержавеющей стали"
  },
  "6 ta o'tkir lop'lar": {
    uz: "6 ta o'tkir pichoq",
    ru: "6 острых лезвий"
  },
  "Chang metallurgiya (Karbid volfram) va keramika": {
    uz: "Kukun metallurgiyasi (volfram karbidi) va keramika",
    ru: "Порошковая металлургия (карбид вольфрама) и керамика"
  },
  "Chiqay (foil) pichoqlar va mahkamlangan kesish boshlig'i": {
    uz: "Setkali (foil) pichoqlar va kesuvchi bosh",
    ru: "Сеточные (foil) лезвия и бреющая головка"
  },
  "DLC (Diamond Like Carbon) ustki qoplama, zanglamas po'lat": {
    uz: "DLC qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с DLC покрытием"
  },
  "DLC bilan qoplangan pichoqlar": {
    uz: "DLC qoplamali pichoqlar",
    ru: "Лезвия с DLC покрытием"
  },
  "DLC qoplamali zanglamas po'lat": {
    uz: "DLC qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с DLC покрытием"
  },
  "Ikki tomonlama zanglamas po'lat pichoq (Stainless Steel Foil)": {
    uz: "Ikki tomonlama zanglamas po'lat pichoq",
    ru: "Двусторонние лезвия из нержавеющей стали"
  },
  "Ikkita ultraton suzuvchi metal folga boshi": {
    uz: "Ikkita o'ta yupqa suzuvchi metall setkali bosh",
    ru: "Двойная ультратонкая плавающая металлическая сетка"
  },
  "Italiyalik zanglamaydigan po'lat (Sun light steel)": {
    uz: "Italiya zanglamas po'lati",
    ru: "Итальянская нержавеющая сталь"
  },
  "Karbonli po'lat": {
    uz: "Uglerodli po'lat",
    ru: "Углеродистая сталь"
  },
  "Keramik": {
    uz: "Keramika",
    ru: "Керамика"
  },
  "Keramik va titanium qoplamali metal (MN) pichoqlar": {
    uz: "Keramik va titan qoplamali metall pichoqlar",
    ru: "Керамические и титановые металлические лезвия"
  },
  "keramika": {
    uz: "Keramika",
    ru: "Керамика"
  },
  "Keramika": {
    uz: "Keramika",
    ru: "Керамика"
  },
  "Keramika (Ceramic Blade)": {
    uz: "Keramika",
    ru: "Керамика"
  },
  "Keramika (plastinkalar)": {
    uz: "Keramika plastinkalari",
    ru: "Керамические пластины"
  },
  "Keramika (rasm lug'atida KERAMICHESKIE LEZVIYA degan yozuv mavjud)": {
    uz: "Keramika pichoqlari",
    ru: "Керамические лезвия"
  },
  "Keramika va metallurgiya": {
    uz: "Keramika va metall qotishmasi",
    ru: "Керамика и металлокерамика"
  },
  "Keramika va zanglamaydigan po'lat": {
    uz: "Keramika va zanglamas po'lat",
    ru: "Керамика и нержавеющая сталь"
  },
  "Keramika-karbon po'lat": {
    uz: "Keramika va uglerodli po'lat",
    ru: "Керамика и углеродистая сталь"
  },
  "Keramika, zanglamaydigan po'lat": {
    uz: "Keramika va zanglamas po'lat",
    ru: "Керамика и нержавеющая сталь"
  },
  "Keramika/zanglamas po'lat": {
    uz: "Keramika va zanglamas po'lat",
    ru: "Керамика и нержавеющая сталь"
  },
  "Ko'rsatilmagan (Standart: zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Ko'zon (Temir)": {
    uz: "Qotishma po'lat",
    ru: "Легированная сталь"
  },
  "Kuchli kesuvchi pichoqlar (zanglamas po'lat)": {
    uz: "Mustahkam zanglamas po'lat pichoqlar",
    ru: "Высокопрочные лезвия из нержавеющей стали"
  },
  "Kumush va palladiy qotishmasi (tavsifga muvofiq)": {
    uz: "Kumush va palladiy qotishmasi",
    ru: "Сплав серебра и палладия"
  },
  "Metall (zanglamas po'lat tig'lari)": {
    uz: "Metall (zanglamas po'lat pichoqlar)",
    ru: "Металл (лезвия из нержавеющей стали)"
  },
  "Metall T-shaklli pichoq": {
    uz: "Metall T-shaklli pichoq",
    ru: "Металлическое Т-образное лезвие"
  },
  "Oltin qoplama bog‘lamli folga va zanglamas po'lat": {
    uz: "Oltin qoplamali setka va zanglamas po'lat",
    ru: "Позолоченная сетка и нержавеющая сталь"
  },
  "Oltin rangli tarmoqli pichoq (yupqa soqol uchun)": {
    uz: "Oltin rangli setkali pichoq",
    ru: "Сетчатые лезвия золотистого цвета"
  },
  "plastik korpus (bizli qism yo'q)": {
    uz: "Plastik korpus",
    ru: "Пластиковый корпус"
  },
  "Po'lat (Stальные ножи)": {
    uz: "Po'lat pichoqlar",
    ru: "Стальные ножи"
  },
  "Po'lat (tumanlangan mahsulot tavsifi yaqinida adabiyotlarda ko'pincha keskinlik sifatida zanglamas po'lat ko'rsatiladi, rasmda suyuqlikka chidamli qoplama)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Po'lat tishlari (pichoqlik)": {
    uz: "Po'lat tishli pichoqlar",
    ru: "Стальные зубчатые лезвия"
  },
  "Professional blade (Ceramic/Steak)": {
    uz: "Professional pichoqlar (keramika / po'lat)",
    ru: "Профессиональные лезвия (керамика / сталь)"
  },
  "professional zanglamas po'lat": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Qayta tiklanuvchi aylanma boshliklar (zanglamas po'lat metall)": {
    uz: "Aylanuvchi pichoq boshlari (zanglamas po'lat)",
    ru: "Роторные плавающие головки (нержавеющая сталь)"
  },
  "Reza po'lat (zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Rolikli pichoqlar texnologiyasi": {
    uz: "Rolikli pichoqlar texnologiyasi",
    ru: "Технология роликовых лезвий"
  },
  "rotor pichoqlari (double rotary heads)": {
    uz: "Rotorli pichoqlar (qo'shaloq boshli)",
    ru: "Роторные лезвия (двойная бреющая головка)"
  },
  "Sifatli po'lat (Precision blades)": {
    uz: "Yuqori aniqlikdagi po'lat pichoqlar",
    ru: "Прецизионная нержавеющая сталь"
  },
  "So'rovda ko'rsatilmagan (racmda aniq ko'rinmaydi, odatda zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Sovuq zanglamas po'lat (Metal), IPX6 suv o'tkazmaydigan qoplama": {
    uz: "Zanglamas po'lat (IPX6 suv o'tkazmaydigan)",
    ru: "Нержавеющая сталь (IPX6 водонепроницаемый)"
  },
  "Stainless steel (zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Stainless Steel (Zanglamas po'lat) - Dual-lined trimmer": {
    uz: "Zanglamas po'lat (ikki tomonlama trimmer)",
    ru: "Нержавеющая сталь (двухсторонний триммер)"
  },
  "Stal (batafsil ma'lumotni istalgan suratda ko'rsatilmagan)": {
    uz: "Po'lat",
    ru: "Сталь"
  },
  "Stal (zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Tesla magnitli qoplamali pichoqlar (zanglamas po'lat)": {
    uz: "Magnitli pichoqlar (zanglamas po'lat)",
    ru: "Лезвия на магнитной подвеске (нержавеющая сталь)"
  },
  "titan": {
    uz: "Titan",
    ru: "Титан"
  },
  "Titan": {
    uz: "Titan",
    ru: "Титан"
  },
  "Titan (o'yib olingan 'Titan' yozuvi asosida)": {
    uz: "Titan",
    ru: "Титан"
  },
  "Titan bilan qoplangan silliq folga (TITANIUM FLEXING FOILS)": {
    uz: "Titan qoplamali harakatlanuvchi setka",
    ru: "Титановая сетка (плавающие лезвия)"
  },
  "Titan folga (Gold blade)": {
    uz: "Titan setka (oltin rangli pichoq)",
    ru: "Титановая сетка (золотое лезвие)"
  },
  "Titan panjaralar": {
    uz: "Titan setkalar",
    ru: "Титановые сетки"
  },
  "Titan qoplamali pichoq turi (rasmdan ko'rinib turishi cha)": {
    uz: "Titan qoplamali pichoq",
    ru: "Лезвия с титановым покрытием"
  },
  "Titan qoplamali zanglamaydigan po'lat": {
    uz: "Titan qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с титановым покрытием"
  },
  "Titanniylangan keramika (keramika bilan titanli)": {
    uz: "Titanlangan keramika",
    ru: "Титанированная керамика"
  },
  "To'qima zarrali kosmik filament (shtrix)": {
    uz: "Maxsus kompozit tola",
    ru: "Специальное композитное волокно"
  },
  "Yapon po'lati": {
    uz: "Yapon po'lati",
    ru: "Японская сталь"
  },
  "Yapon po'lati (Titanium steel)": {
    uz: "Yapon po'lati (titan po'lati)",
    ru: "Японская сталь (титановая сталь)"
  },
  "Zanglamagan po'lat": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "zanglamas po'lat": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (3 ravishlik pichoq)": {
    uz: "Zanglamas po'lat (3 qirrali pichoq)",
    ru: "Нержавеющая сталь (3-стороннее лезвие)"
  },
  "zanglamas po'lat (3 ta qirrali tizim)": {
    uz: "Zanglamas po'lat (3 ta qirrali tizim)",
    ru: "Нержавеющая сталь (трехсторонняя система лезвий)"
  },
  "Zanglamas po'lat (3 ta sferik boshli)": {
    uz: "Zanglamas po'lat (3 ta sferik boshli)",
    ru: "Нержавеющая сталь (3 сферические головки)"
  },
  "Zanglamas po'lat (360° buriluvchi)": {
    uz: "Zanglamas po'lat (360° aylanuvchi)",
    ru: "Нержавеющая сталь (вращение на 360°)"
  },
  "zanglamas po'lat (AISI-440C)": {
    uz: "Zanglamas po'lat (AISI-440C)",
    ru: "Нержавеющая сталь (AISI-440C)"
  },
  "Zanglamas po'lat (aksariyat professional mashinkalarda standart)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamas po'lat (aylanadigan pichoqlar)": {
    uz: "Zanglamas po'lat (aylanuvchi pichoqlar)",
    ru: "Нержавеющая сталь (роторные лезвия)"
  },
  "Zanglamas po'lat (Ceramic/Metal Blade)": {
    uz: "Keramika va zanglamas po'lat",
    ru: "Керамика и нержавеющая сталь"
  },
  "Zanglamas po'lat (Copper Coating, Copper Core)": {
    uz: "Mis qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с медным покрытием"
  },
  "Zanglamas po'lat (DLC qoplama bilan)": {
    uz: "DLC qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с DLC покрытием"
  },
  "zanglamas po'lat (DLC qoplama T-pichoq)": {
    uz: "DLC qoplamali T-pichoq (zanglamas po'lat)",
    ru: "Т-образное лезвие с DLC покрытием (нержавеющая сталь)"
  },
  "Zanglamas po'lat (Double layer stainless steel)": {
    uz: "Ikki qavatli zanglamas po'lat",
    ru: "Двухслойная нержавеющая сталь"
  },
  "Zanglamas po'lat (ikki qatorli plastina)": {
    uz: "Ikki qatorli zanglamas po'lat plastinalar",
    ru: "Двухрядные пластины из нержавеющей стали"
  },
  "Zanglamas po'lat (kerak bo'lsa oddiy suv bilan tozalanadigan)": {
    uz: "Zanglamas po'lat (suvda yuviladigan)",
    ru: "Нержавеющая сталь (моющаяся водой)"
  },
  "zanglamas po'lat (korpusda yozilgan: HIGH CARBON STEEL)": {
    uz: "Yuqori uglerodli po'lat (High Carbon Steel)",
    ru: "Высокоуглеродистая сталь (High Carbon Steel)"
  },
  "Zanglamas po'lat (Nerzhavevayushchaya setka)": {
    uz: "Zanglamas po'lat setka",
    ru: "Сетка из нержавеющей стали"
  },
  "Zanglamas po'lat (Nerzhavevayushchi stal)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (Nerzhavieyushchaya stal)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (Nerzhavieyushchaya staly)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (Nержавеющая сталь)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (o'stirilgan pichoqlar)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (o'tkir va xavfsiz pichoqlar)": {
    uz: "O'tkir va xavfsiz zanglamas po'lat",
    ru: "Острая и безопасная нержавеющая сталь"
  },
  "Zanglamas po'lat (o'z-o'zidan o'tkiruvchi)": {
    uz: "O'z-o'zidan o'tkirlanuvchi zanglamas po'lat",
    ru: "Самозатачивающаяся нержавеющая сталь"
  },
  "zanglamas po'lat (perforatsiyalangan to'r)": {
    uz: "Zanglamas po'lat (perforatsiyalangan to'r)",
    ru: "Нержавеющая сталь (перфорированная сетка)"
  },
  "zanglamas po'lat (plastinka)": {
    uz: "Zanglamas po'lat plastinka",
    ru: "Пластины из нержавеющей стали"
  },
  "Zanglamas po'lat (Precision T-Blade)": {
    uz: "Zanglamas po'lat (Precision T-Blade)",
    ru: "Высокоточная нержавеющая сталь (Т-образное лезвие)"
  },
  "Zanglamas po'lat (Professional pichoqlar)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamas po'lat (Professional soch kesuvchi pichoqlar)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamas po'lat (Professional tishli pichoqlar)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamas po'lat (qo‘zg‘almas bosh)": {
    uz: "Zanglamas po'lat (qo'zg'almas bosh)",
    ru: "Нержавеющая сталь (фиксированная головка)"
  },
  "Zanglamas po'lat (Rоторный dvigatel bilan)": {
    uz: "Zanglamas po'lat (rotorli motor bilan)",
    ru: "Нержавеющая сталь (с роторным мотором)"
  },
  "Zanglamas po'lat (Shar Razor texnologiyasi)": {
    uz: "Zanglamas po'lat (Sharp Razor texnologiyasi)",
    ru: "Нержавеющая сталь (технология Sharp Razor)"
  },
  "zanglamas po'lat (stainless steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (stainless steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (Stainless Steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "zanglamas po'lat (tashqi ko'rinishga qaralib aniq material tasdiqlanmagan)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (titan qoplamali)": {
    uz: "Titan qoplamali zanglamas po'lat",
    ru: "Нержавеющая сталь с титановым покрытием"
  },
  "Zanglamas po'lat (troynaya saitovaya setka nojey)": {
    uz: "Uch qavatli setkali zanglamas po'lat",
    ru: "Нержавеющая сталь (тройная сеточная система)"
  },
  "Zanglamas po'lat (Xavfsiz kesish uchun)": {
    uz: "Xavfsiz zanglamas po'lat",
    ru: "Безопасная нержавеющая сталь"
  },
  "Zanglamas po'lat (yaqinlashgan)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (yupiq chelaklar bilan)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (zanglamaydigan po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "zanglamas po'lat (zanglashmaydigan po'lat pichoqlar)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamas po'lat (Zero gapped stellite alloy)": {
    uz: "Stellit qotishmali zanglamas po'lat (Zero gap)",
    ru: "Стеллитовый сплав из нержавеющей стали (Zero gap)"
  },
  "Zanglamas po'lat pichoqlari (Alyuminiy qoplama)": {
    uz: "Zanglamas po'lat pichoqlar (alyuminiy qoplama)",
    ru: "Лезвия из нержавеющей стали (алюминиевое покрытие)"
  },
  "zanglamas po'lat, shnekli tizim": {
    uz: "Zanglamas po'lat (shnekli tizim)",
    ru: "Нержавеющая сталь (шнековая система)"
  },
  "zanglamas po'lat, yaltiroq qoplama": {
    uz: "Sayqallangan zanglamas po'lat",
    ru: "Полированная нержавеющая сталь"
  },
  "zanglamaydigan po'lat": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (kerakli material rasmda ko'rsitilmagan)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (keramikali qoplamali ko'rinishda)": {
    uz: "Zanglamas po'lat (keramika qoplamali)",
    ru: "Нержавеющая сталь с керамическим покрытием"
  },
  "zanglamaydigan po'lat (nerjavevayushchaya stal)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Nerzhavayushchaya stal)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Nержавеющая сталь)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (o'rta trimmerli ikki qavatli folga)": {
    uz: "Zanglamas po'lat (ikki qavatli setka va trimmer)",
    ru: "Двойная сетка со средним триммером (нержавеющая сталь)"
  },
  "Zanglamaydigan po'lat (passivsian stali)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "zanglamaydigan po'lat (Professional Blades)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Professional qator dastaklari)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Professional qotishma)": {
    uz: "Professional zanglamas po'lat",
    ru: "Профессиональная нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Stainless steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Stainless Steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Stal)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Xavfsiz pichoqlar)": {
    uz: "Xavfsiz zanglamas po'lat pichoqlar",
    ru: "Безопасные лезвия из нержавеющей стали"
  },
  "zanglamaydigan po'lat (zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat (Нержавеющая сталь)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan po'lat va keramika": {
    uz: "Zanglamas po'lat va keramika",
    ru: "Нержавеющая сталь и керамика"
  },
  "Zanglamaydigan po'lat, Keramik qoplama": {
    uz: "Zanglamas po'lat va keramika qoplama",
    ru: "Нержавеющая сталь и керамическое покрытие"
  },
  "Zanglamaydigan po‘lat, silliqlangan pichoqlar": {
    uz: "Sayqallangan zanglamas po'lat pichoqlar",
    ru: "Полированные лезвия из нержавеющей стали"
  },
  "Zanglamaydigan po'latdan (Stainless Steel)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  },
  "Zanglamaydigan temir (metall) pichoqlar": {
    uz: "Metall pichoqlar",
    ru: "Металлические лезвия"
  },
  "Нержавеющая сталь (Zanglamas po'lat)": {
    uz: "Zanglamas po'lat",
    ru: "Нержавеющая сталь"
  }
};

// Helper for units
function translateUnits(val) {
  // e.g. "60 sm" -> uz: "60 sm", ru: "60 см"
  const mSm = val.match(/^(\d+(?:\.\d+)?)\s*sm$/i);
  if (mSm) {
    return {
      uz: `${mSm[1]} sm`,
      ru: `${mSm[1]} см`
    };
  }
  // e.g. "3 kg" -> uz: "3 kg", ru: "3 кг"
  const mKg = val.match(/^(\d+(?:\.\d+)?)\s*kg$/i);
  if (mKg) {
    return {
      uz: `${mKg[1]} kg`,
      ru: `${mKg[1]} кг`
    };
  }
  return null;
}

export function getTranslation(val) {
  const trimmed = val ? val.trim() : '';
  if (TRANSLATION_MAP[trimmed]) {
    return TRANSLATION_MAP[trimmed];
  }
  const unit = translateUnits(trimmed);
  if (unit) {
    return unit;
  }
  return null;
}

async function main() {
  const list = JSON.parse(fs.readFileSync('scripts/untranslated_params.json', 'utf8'));
  console.log(`Checking coverage for all ${list.length} untranslated distinct values...`);
  
  let missing = 0;
  for (const item of list) {
    const t = getTranslation(item.val);
    if (!t) {
      console.error(`❌ Missing translation for: [${item.param}] -> "${item.val}"`);
      missing++;
    }
  }

  if (missing > 0) {
    console.error(`Found ${missing} missing translations! Aborting.`);
    process.exit(1);
  }

  console.log('✅ 100% of untranslated values are successfully mapped!');

  const client = new pg.Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('🔌 Connected to Supabase DB. Beginning update transaction...');

  try {
    await client.query('BEGIN');

    let updatedCount = 0;
    for (const item of list) {
      const t = getTranslation(item.val);
      const composite = `${t.uz} / ${t.ru}`;
      
      const res = await client.query(`
        UPDATE product_param_values
        SET 
          value = $1,
          value_uz = $2,
          value_ru = $3
        WHERE id = ANY($4::uuid[])
      `, [composite, t.uz, t.ru, item.ids]);

      updatedCount += res.rowCount;
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully updated ${updatedCount} parameter value records!`);

    // Verify
    const verifyRes = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE value_uz != value_ru) as different_count,
        COUNT(*) FILTER (WHERE value_uz = value_ru) as same_count
      FROM product_param_values
    `);
    console.log('📊 Post-fix Statistics:', verifyRes.rows[0]);

    // Check remaining same_count
    const remainingSame = await client.query(`
      SELECT ppv.value_uz, COUNT(*) as cnt
      FROM product_param_values ppv
      WHERE ppv.value_uz = ppv.value_ru AND ppv.value_uz ~ '[a-zA-Zа-яА-ЯёЁ]'
      GROUP BY ppv.value_uz
      ORDER BY cnt DESC
      LIMIT 10
    `);
    console.log('📋 Remaining same text items (should only be temperatures e.g. °C):', remainingSame.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
