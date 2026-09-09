# 📱 VELARI — iOS-DARASIDAGI SILIQ INTERFEYS (PROJECT HANDOVER)

> **Ushbu fayl nima uchun?**
> Ushbu hujjat boshqa kompyuterda (uyda) yoki yangi AI sessiyasida loyihani aynan to'xtagan joyidan uzluksiz, birorta ham standartni yo'qotmasdan davom ettirish uchun to'liq yo'riqnomadir.

---

## 🎯 LOYIHANING ASOSIY MAQSADI VA STANDARTLARI

Butun saytni (Instagram Shop / Velari) mobil Safari va iOS WebView darajasidagi tabiiy, silliq (60–120 FPS), qotmaydigan va Apple ekotizimiga xos dastur holatiga keltirish.

### ⚠️ Majburiy Texnik Qoidalar (Har doim amal qilinadi):
1. **Zero `transition-all`:**
   - Hech qachon `transition-all` ishlatilmaydi (u layout thrashing va GPU sekinlashuviga olib keladi).
   - Faqat apparat tezlashtirilgan xususiyatlar: `transition-transform duration-150 will-change-transform` yoki `transition-colors duration-150`.
2. **Apple Spring Curve (Fizika):**
   - Barcha ochilish va harakatlarda: `cubic-bezier(0.22, 1, 0.36, 1)` (Tailwind yoki inline style).
3. **Sensorli Bosilish (Haptic & Spring Scale):**
   - Katta tugmalar va kartochkalar: `ios-tap-feedback active:scale-[0.98]` yoki `active:scale-95`.
   - Dumaloq/kichik ikonkalar: `ios-icon-tap active:scale-90`.
   - Tebranish dvigateli: `videoPreWarmer.triggerHaptic("light" | "medium" | "selection" | "double")` dan foydalaniladi (`@/lib/videoPreWarmer`).
4. **Pastdan Chiquvchi Modallar (Bottom Sheets & Dialogs):**
   - Modallar qat'iy ravishda `createPortal(..., document.body)` orqali `<body>` ga chiqariladi (ota konteynerning `contain` yoki transformlari uni qamab qo'ymasligi uchun).
   - Animatsiyalarda `animation-fill-mode: both / forwards` ishlatilmaydi (chunki u JS inline `transform`ni bloklab qo'yadi). Barmoq bilan surish boshlanganda `animation = "none"` qilinadi.
   - Fon (backdrop) bosilganda modal silliq yopilishi shart (`onClick={() => setModal(false)}`), ichki paneliga esa `onClick={(e) => e.stopPropagation()}` qo'yiladi.

---

## 🚀 HOZIRGACHA BAJARILGAN BOSQICHLAR (1-DAN 7-GACHA)

Barcha o'zgarishlar `main` branchiga push qilingan va TypeScript tekshiruvidan (`npx tsc --noEmit`) 0 ta xatolik bilan o'tgan.

### ✅ 1-Faza: Global Tizim & Gestural Poydevor
- `src/app/globals.css`:
  - `touch-action: pan-y`, `-webkit-tap-highlight-color: transparent`.
  - `overscroll-contain` (sahifa osmonga yoki pastga keraksiz sakramasligi uchun).
  - Safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
  - `.ios-tap-feedback`, `.ios-icon-tap` sinflari va spring tebranishlari.
- `src/lib/videoPreWarmer.ts`: Universal haptic motori (`navigator.vibrate` orqali iOS/Android uchun to'liq optimallashgan).

### ✅ 2-Faza: Bosh Sahifa (`HomeClient.tsx` & Home komponentlari)
- Commit: `1994537`
- Tovar kartochkalari spring press animatsiyasi, bannerlar karuseli, kategoriyalar skrolli, stories va reels preview bloklari.

### ✅ 3-Faza: Katalog & Filtrlar (`CatalogClient.tsx`)
- Commit: `24d90b8`
- Skelet yuklanish (skeleton grid loading), pastdan chiquvchi Filtr va Saralash modallari (barmoqqa 1:1 ergashuvchi drag-to-dismiss va inersiya bilan yopilish).

### ✅ 4-Faza: Mahsulot Sahifasi (`/products/[slug]`)
- Commit: `c2320c6`
- Rasmlar swipe karuseli, variant tanlagichlar, sticky savat paneli, tezkor chat modali.

### ✅ 5-Faza: Savat & Checkout (`CartDrawer.tsx` & `/checkout`)
- Commit: `b2f199d`
- Savat drayveri, buyurtmani rasmiylashtirish sahifasi, manzil tanlash, to'lov turlari, promokodlar.

### ✅ 6-Faza: Qidiruv & Header (`Navigation.tsx` & Live Search)
- Commit: `cd0c027`
- Qidiruv dropdown takliflari modali (`backdrop-blur-xl`), tozalash (`X`), navigatsiya ikonkalarining spring bosilishi.

### ✅ Reels Modallarining Drag-to-Dismiss Tuzatishi
- Commit: `937538e`
- **Tuzatildi:** Reels ichidagi Izohlar (`CommentsSheet`), Tezkor xarid (`QuickBuySheet`) va 3-nuqta opsiyalar menyusi (`ReelOptionsSheet`) barmoq bilan pastga tushmaslik muammosi to'liq hal qilindi (`createPortal` + CSS animatsiya konfliktini yo'qotish).

### ✅ 7-Faza: Profil, Buyurtmalar, Hamyon & Saralanganlar
- Commit: `46c3b2a`
- `src/app/[lang]/account/page.tsx`: Profil, statistika kartochkalari, barcha menyu bandlari, Sharh qoldirish, Qaytarish (Returns) va Hamkorlik (Affiliate) modallari.
- `src/app/[lang]/orders/page.tsx`: Buyurtmalar tarixi, orqaga qaytish tugmasi, Buyurtma tafsilotlari modali (fon bosilganda yopilish, `slide-in-from-bottom duration-300`, tovar havolalari va bekor qilish/qaytarish dialoglari).
- `src/app/[lang]/wallet/WalletClient.tsx`: Hamyon kartochkasi, 2FA o'tkazma modali (fon bosilganda yopilish, slide animatsiyasi, haptics).
- `src/app/[lang]/wishlist/page.tsx`: Istaklar ro'yxati, savatga qo'shish va `+`/`−` tugmalarining tezkor tebranishi.

---

## 📋 QILINISHI KERAK BO'LGAN VAZIFALAR (UYDA QILINADI)

Loyihani 100% to'liq yakunlash uchun oldimizda **2 ta asosiy bosqich** qoldi:

---

### 🔥 8-BOSQICH: Kirish (Auth), Xabarlar / Direct va Qo'llab-quvvatlash Chati

#### 1. `src/app/[lang]/login/page.tsx`
- Barcha `transition-all`larni olib tashlash.
- Orqaga qaytish tugmasiga `ios-icon-tap active:scale-90` va `light` haptic qo'shish.
- Telefon kiritish va parol kiritish formalariga Apple silliqligi.
- Telegram bot orqali kirish tugmasiga `ios-tap-feedback active:scale-[0.98]` va `medium` haptic.
- Xato parol kiritilganda yoki topilmaganda `videoPreWarmer.triggerHaptic("double")` (xatolik silkitişi).
- 2FA qadamiga o'tishda silliq `fade-in slide-in-from-right duration-300` animatsiyasi.

#### 2. `src/components/PinKeypad.tsx`
- PIN kod kiritish raqamlariga (`0-9`) `ios-tap-feedback active:scale-90` va har bosilganda `selection` haptic tebranishi.
- O'chirish (Backspace) tugmasiga `light` haptic.

#### 3. `src/app/[lang]/messages/page.tsx`
- Chatlar ro'yxatida har bir suhbat qatoriga `ios-tap-feedback active:scale-[0.99]` va `light` haptic.
- Support chat bloki va qidiruv maydoni.
- O'ng burchakdagi menyu ochilishiga `backdrop-blur` va fon bosilganda yopilish.

#### 4. `src/app/[lang]/messages/[id]/page.tsx` & `src/app/[lang]/chat/page.tsx`
- Orqaga qaytish tugmasi (`ios-icon-tap active:scale-90`).
- Xabarlar oqimi skrolli: `overscroll-contain [WebkitOverflowScrolling:touch]`.
- Rasm/fayl biriktirish (paperclip/camera) tugmalariga `selection` haptic.
- Xabar yuborish (Send) tugmasiga `ios-tap-feedback active:scale-90` va `medium` haptic.
- Xabar yuborilganda avtomatik silliq pastga skroll bo'lishi (`behavior: "smooth"`).

---

### 🎨 9-BOSQICH: Blog, Do'kon (Store), PWA va Global Vidjetlar

#### 1. Blog Bo'limi (`src/app/[lang]/blog/page.tsx` & `[slug]/page.tsx`)
- Maqola kartochkalari spring bosilishi.
- Maqola ichida: Orqaga qaytish, Layk bosish (yurakcha pulsatsiyasi + haptic), Ulashish (Web Share API).

#### 2. Do'kon / Sotuvchi Profili (`src/app/[lang]/store/[id]/page.tsx` & `StoreClient.tsx`)
- Sotuvchi kartasi, obuna bo'lish tugmasi va tovarlar to'ri.

#### 3. Global Yordamchi Komponentlar
- `src/components/Footer.tsx`: Ijtimoiy tarmoqlar (Instagram, Telegram, Facebook, YouTube) va telefon havolalariga `ios-icon-tap active:scale-95` va `light` haptic berish, `transition-all`larni tozalash.
- `src/components/PWAInstallPrompt.tsx`: Pastdan chiquvchi "Bosh ekranga qo'shish" yo'riqnomasi fon bosilganda yopilishi, `animate-in slide-in-from-bottom duration-300`.
- `src/components/common/ConnectivityListener.tsx`: Internet uzilganda/kelganda silliq paydo bo'lish.
- `src/app/[lang]/not-found.tsx` & `error.tsx`: 404 va xatolik sahifalaridagi "Bosh sahifaga qaytish" tugmalariga spring effekti.

---

## 🛠 TEKSHIRUV VA DEPLOYMENT BUYRUQLARI

Har bir bosqichdan so'ng:
```powershell
# 1. TypeScript kompilyatsiyasini tekshirish (0 xato bo'lishi shart):
npx tsc --noEmit

# 2. O'zgarishlarni tekshirish:
git status

# 3. Commit va push qilish (PowerShell-da nuqta-vergul bilan):
git add -A ; git commit -m "perf(...): add iOS spring tap feedback, animations, and haptics" ; git push origin main
```

---

## 💡 UYDA AGENTGA BERILADIGAN TAYYOR PROMPT

Uyga borganingizda, AI chatiga shunchaki quyidagi matnni nusxalab (copy) tashlab bersangiz kifoya:

```text
Salom! Men loyihani davom ettirmoqchiman. 
Loyiha ildizidagi PROJECT_HANDOVER.md faylini to'liq o'qib chiq. 
U yerda 1-bosqichdan 7-bosqichgacha nimalar qilingani, qanday texnik standartlar (zero transition-all, spring curves, haptics, modallar) o'rnatilgani yozilgan.

Hozir biz 8-BOSQICH: Kirish (Auth/Login), Xabarlar / Direct Chat va Qo'llab-quvvatlash Chatini amalga oshirishimiz kerak:
1. src/app/[lang]/login/page.tsx
2. src/components/PinKeypad.tsx
3. src/app/[lang]/messages/page.tsx
4. src/app/[lang]/messages/[id]/page.tsx
5. src/app/[lang]/chat/page.tsx

Iltimos, ushbu fayllarni ko'zdan kechirib, iOS silliqligi bo'yicha 8-bosqichni boshla!
```
