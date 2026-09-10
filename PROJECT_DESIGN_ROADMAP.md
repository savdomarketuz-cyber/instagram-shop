# Velari Design System & Architecture Roadmap (iOS 26 Liquid Glass)

## 1. Umumiy Konseptsiya
Velari onlayn savdo platformasining foydalanuvchi interfeysi (UI/UX) to'liq **iOS 26 Liquid Glass & Apple Human Interface Guidelines (HIG)** mezonlari asosida loyihalashtirilgan.

Asosiy xususiyatlari:
- **Canvas Fon**: `#FAFAF6` (iliq, engil premium fon)
- **Liquid Glass Kartochkalar**: `bg-white/90 backdrop-blur-xl border border-[rgba(15,20,16,0.06)] shadow-xs`
- **Brend Rangi**: Velari Emerald (`#2D6E3E`, gradient `from-[#2D6E3E] to-[#1F5A30]`)
- **Tipografiya**: Apple HIG — jiddiy, o'qilishi oson, ortiqcha `font-black italic uppercase` dan tozalangan semantik iyerarxiya
- **Animatsiyalar**: Mobil Safari (WebKit) uchun optimallashtirilgan maqsadli o'tishlar (`transition-transform`, `transition-colors`, `transition-opacity`), `will-change-transform` va haptic feedback (`videoPreWarmer.triggerHaptic`).

---

## 2. Design Tokens & Standartlar

| Token Turi | Qiymat / Tailwind Class | Qo'llanilish Joyi |
|---|---|---|
| **Background Canvas** | `#FAFAF6` | Butun sayt foni (`body`, `main`) |
| **Glass Card (Asosiy)** | `bg-white/90 backdrop-blur-xl border border-[rgba(15,20,16,0.06)] shadow-xs rounded-[28px]` | Mahsulot kartasi, bo'limlar, modallar |
| **Glass Pill (Belgilar)** | `bg-white/80 backdrop-blur-md border border-[rgba(15,20,16,0.08)] rounded-full` | Filtrlari, teglar, kesh pultlari |
| **Primary Button** | `bg-[#2D6E3E] hover:bg-[#235831] text-white rounded-full font-semibold shadow-xs active:scale-95 transition-transform will-change-transform` | Asosiy harakat tugmalari |
| **Floating Glass Capsule** | `bg-white/95 backdrop-blur-2xl border border-[rgba(15,20,16,0.08)] shadow-lg rounded-full` | Connectivity listener, PWA prompt |

---

## 3. Sahifalar Holati (Audit & Realizatsiya)

- [x] **Home (Bosh sahifa)**: Liquid Glass to'liq tatbiq etilgan (`HomeClient.tsx`, `ProductCard.tsx`, `BannerSection.tsx`).
- [x] **Catalog (Katalog)**: Dinamik kategoriyalar, brend filtrlari, pill tugmalar yangilandi (`CatalogClient.tsx`).
- [x] **Cart & Checkout**: Toza checkout va savatcha oqimi, Liquid Glass kartochkalar.
- [x] **Account, Orders & Wallet**: Foydalanuvchi kabineti, buyurtmalar tarixi va hamyon to'liq yangilandi.
- [x] **Messages & Chat**: Live chat va xabarlar oynasi Apple iMessage uslubiga moslandi.
- [x] **Blog (Maqolalar)**: Listing (`blog/page.tsx`) va maqola sahifasi (`blog/[slug]/page.tsx`) yangilandi, 24h Edge Cache (`revalidate = 86400`) ulandi.
- [x] **Store (Do'kon)**: Do'kon profili va mahsulotlar ro'yxati yangilandi, 5 daqiqalik Edge Cache (`revalidate = 300`) ulandi.
- [x] **PWA & Connectivity**: PWA o'rnatish paneli va Internet aloqasi ko'rsatkichi Liquid Glass floating kapsulaga aylantirildi.
- [x] **404 & Error**: `not-found.tsx` va `error.tsx` yangi dizayn tizimiga moslashtirildi.

---

## 4. Unumdorlik va Kesh Arxitekturasi (Vercel Optimization)

- **Layout Revalidation To'xtatildi**: Butun saytni qayta render qiluvchi `revalidatePath('/', 'layout')` o'rniga nuqtaviy yo'llar yangilanadi.
- **Sentry Serverless Proxy O'chirildi**: `tunnelRoute: '/monitoring'` olib tashlanib, Sentry so'rovlari Vercel Serverless CPU'sini sarflamaydi.
- **Edge CDN Caching**: Barcha ommaviy sahifalarda kesh muddati belgilangan bo'lib, foydalanuvchilar va botlar serverless funksiyasiz to'g'ridan-to'g'ri CDN'dan tezkor javob oladi.
- **Deployment Storage Tozalandi**: 92 ta eski deploy o'chirilib, xotira to'liq bo'shatildi.
