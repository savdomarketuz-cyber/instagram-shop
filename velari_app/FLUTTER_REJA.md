# VELARI — NATIVE FLUTTER ILOVA: TO'LIQ REJA

> Manba: velari.uz saytining (Next.js) to'liq frontend inventarizatsiyasi asosida tuzildi.
> Tamoyil: backend (Supabase + Next.js API) O'ZGARMAYDI — Flutter faqat mijoz.
> Sana: 2026-06-11

---

## 1-QISM. SAYTDAGI MAVJUD FRONTEND INVENTARIZATSIYASI

### 1.1 Global elementlar (har ekranda ishlaydigan narsalar)

| Element | Saytda | Flutter'da |
|---|---|---|
| Pastki tab bar (mobil) | Asosiy, Savat (badge), Video, Saralangan, Profil | `BottomNavigationBar` — aynan shu 5 tab |
| Qidiruv (header) | Live suggestions (debounce + abort), didYouMean, facet chiplar | SearchDelegate / custom overlay |
| Vizual qidiruv | Rasm yuklab qidirish (canvas resize → base64 → API) | Kamera/galereya → resize → o'sha API |
| Toast tizimi | success / error / info (yuqorida suzuvchi) | Global toast servisi |
| Offline indikator | ConnectivityListener | connectivity_plus + banner |
| Push obuna | Web-push (VAPID) | **FCM** (backend'ga kichik qo'shimcha kerak) |
| Affiliate atributsiya | `affiliate_data` cookie → `/api/affiliate/track` | Deep link (`/ref/[slug]`) → local storage → track |
| Activity tracking | `/api/client-sync` (geo, device, path) | Soddalashtirilgan versiya (ixtiyoriy) |
| Til | uz / ru (URL prefiks) | intl + saqlanadigan sozlama |
| PWA install prompt | bor | KERAK EMAS |

### 1.2 Foydalanuvchi ekranlari — 23 ta (+ ichki modallar)

**E1. Bosh sahifa** (`/` — HomeClient.tsx, 847 qator)
- Stories qatori + **fullscreen story viewer** (progress bar, 15s video limit, pause, guruhlararo o'tish, "ko'rilgan" holati)
- PromoCountdown — vaqtli aksiya (2 ko'rinish: banner + card), sinxron taymer
- BannerSection — HTML bannerlar (saytda iframe srcDoc; Flutter'da: rasm-banner yoki webview)
- FeaturedCategories — tanlangan kategoriyalar bloki
- CategoryFilter — gorizontal kategoriya chiplar
- TrustStrip — ishonch belgilari qatori
- RecentlyViewed — yaqinda ko'rilganlar (local tarix)
- ProductGrid — infinite scroll, skeleton'lar
- **Qidiruv natijalari rejimi** — facet (kategoriya) chiplar, didYouMean taklifi, fallback belgisi, tozalaganda to'liq ro'yxat qaytishi
- URL orqali kategoriya filtri (`?category=`)

**E2. Katalog** (`/catalog`) — kategoriyalar ro'yxati/daraxti
**E3. Kategoriya sahifasi** (`/catalog/[slug]`) — kategoriya mahsulotlari

**E4. Mahsulot sahifasi** (`/products/[id]` — ProductClient.tsx, 1130 qator)
- ProductMedia: rasm+video galereya, fullscreen ko'rish, variant rasmlari
- ProductInfo: narx, eski narx, chegirma %, promo narx (global promo bilan), stock holati, yetkazish sanasi matni, kafolat/qaytarish/original belgilari
- **Variant tanlash**: rang/model guruhi (group_id bo'yicha boshqa mahsulotlarga o'tish)
- Ombor havolasi → do'kon sahifasi
- ProductSpecifications: xususiyatlar jadvali (alohida API)
- **ProductDescriptionModal**: to'liq tavsif (modal)
- ReviewsSection: sharhlar (rating, matn, rasm/video)
- RelatedProducts: o'xshash mahsulotlar
- Savatga qo'shish + **tezkor xarid (fast buy → checkout)**
- Telemetriya: ko'rish tracking, Yandex Metrika ekvivalenti (AppMetrica — ixtiyoriy)

**E5. Savat** (`/cart`)
- Miqdor +/-, o'chirish, qator chegirmalari (line discounts)
- **Promo-kod sheet** (qo'llash/olib tashlash, validate API)
- Jami hisob, "Buyurtma berish" tugmasi

**E6. Checkout** (`/checkout`, 594 qator)
- Manzil kiritish + **Yandex xarita picker (modal)** → koordinatalar
- Yetkazish turi: **standard / express** (express eligibility API — koordinata + summa bo'yicha narx/ETA)
- Promo-kod (savatdan ko'chib keladi)
- **Hamyon balansidan to'lash** (useWallet)
- Smart discount + shaxsiy takliflar (personal offers)
- Stock validatsiya (yetarli emas bo'lsa xato ro'yxati)
- Bepul yetkazish chegarasi (promo-kodsiz hisoblanadi!)

**E7. To'lov** (`/payment`)
- Click (deep link `clickuz://payment` + web fallback `my.click.uz`) yoki naqd
- Flutter'da: url_launcher bilan Click ilovasini ochish — NATIVE AFZALLIK

**E8. Order Success** (`/order-success`) — tasdiqlash ekrani

**E9. Buyurtmalarim** (`/orders`, 785 qator)
- Ro'yxat + status (normalize qilingan: yangi/tasdiqlangan/yo'lda/yetkazildi/bekor)
- **Tafsilot modal** (enriched items)
- **Bekor qilish modal** (tasdiqlash bilan)
- **Qaytarish (return) modal** — sabab kiritish, returns holati xaritasi
- **Sharh yozish modal** — rating (5 yulduz), matn, rasm/video yuklash

**E10. Saralangan** (`/wishlist`) — wishlist grid

**E11. Kirish** (`/login`)
- Telefon + parol
- **2FA bosqichi**: Telegram'ga yuborilgan OTP kod
- **Telegram orqali ro'yxatdan o'tish**: bot deep link + base64url payload (qaytish manzili bilan)

**E12. Auth callback** (`/auth`) — Telegram auto-login (bot'dan qaytganda)

**E13. Profil** (`/account`, 2235 qator — 7 ta ichki view)
- `menu` — profil karta + menyu bandlari
- `edit-profile` — ism/telefon tahrirlash
- `language` — til tanlash
- `returns` — qaytarishlarim ro'yxati
- `promo-codes` — mening promo-kodlarim
- `reviews` — mening sharhlarim
- `affiliate` → E14
- Footer (Biz haqimizda / Qaytarish siyosati havolalari) faqat shu bo'limda

**E14. Hamkorlik kabineti** (account ichida, 4 tab)
- `dashboard` — statistika: jami bosishlar, konversiyalar, conv. rate, jamoa bosishlari, komissiya/balans
- `products` — mahsulot qidirish + havola yaratish (modal)
- `promos` — promo-kodlarim
- `links` — havolalarim ro'yxati

**E15. Hamyon** (`/wallet` — WalletClient)
- Balans, keshbek tarixi
- **Pul o'tkazish**: request + confirm (2 bosqich), **PinKeypad** (PIN kiritish)

**E16. Reels** (`/reels`)
- Vertikal video lenta (PageView), autoplay, mute
- Like, **CommentsSheet** (izohlar bottom-sheet)
- Mahsulotga o'tish tugmasi

**E17. Support chat** (`/chat`)
- Real-time (Supabase realtime channel `support_messages`)
- Media yuborish (rasm preview + upload)

**E18. Xabarlar** (`/messages` ro'yxat + `/messages/[id]` xona)

**E19. Do'kon/ombor** (`/store/[id]`) — ombor profili + shu ombordagi mahsulotlar

**E20. Blog** (`/blog` + `/blog/[slug]`) — maqolalar

**E21. Statik**: Biz haqimizda (`/about`), Qaytarish siyosati (`/return-policy`)

**E22. Ref redirect** (`/ref/[slug]`) — affiliate havola → Flutter'da **deep link** sifatida ushlanadi (App Links / `velari.uz` assetlinks.json)

**E23. Global qidiruv natijalari** — alohida ekran sifatida (saytda bosh sahifa rejimi)

### 1.3 Admin panel — Flutter'ga KIRMAYDI
29 ta admin sahifa (orders, products, categories, banners, stories, promo-codes, smart-discount, cashback, wallets, warehouses, customers, users, carts, chats, ai, live, logs, synonyms, notifications, returns, settings, express-delivery, featured-categories, inventory, pricing, affiliate, blogs, brands, promo-countdown) — **web'da qoladi**. Kerak bo'lsa keyinroq alohida "Velari Admin" ilova.

---

## 2-QISM. API QATLAMI (Flutter ishlatadigan)

### 2.1 Next.js API endpointlar

| Domen | Endpointlar |
|---|---|
| Auth | `POST /api/auth` (login+2FA), `/api/auth/telegram-login`, `/api/auth/user`, `/api/auth/update`, `/api/auth/logout`, `/api/auth/push-subscription` |
| Qidiruv | `POST /api/search` (facets, didYouMean), `/api/analytics/search-click` |
| Buyurtma | `POST /api/orders/place`, `GET /api/orders/user`, `/api/orders/get`, `/api/orders/return`, `/api/orders/update-status` (bekor qilish) |
| Promo | `POST /api/promo-codes/validate`, `/api/promo` (global promo) |
| Yetkazish | `POST /api/delivery/express` |
| Hamyon | `POST /api/wallet/transfer/request`, `/api/wallet/transfer/confirm` |
| Hamkorlik | `/api/affiliate/user`, `/products`, `/links`, `/promo-codes`, `/analytics`, `/track` |
| Chat/izoh | `/api/chat`, `/api/comments` |
| AI | `/api/ai/personalize`, `/api/ai/recommendations` |
| Boshqa | `/api/upload` (media), `/api/client-sync`, `/api/discount`, `/api/returns` |

### 2.2 Supabase to'g'ridan-to'g'ri (anon key, sayt qanday ishlatsa shunday)
- O'qish: `products`, `categories`, `banners`, `stories`, `reels`, `comments`, `warehouses`
- **Realtime**: `support_messages` kanali (chat)
- Flutter: `supabase_flutter` paketi

### 2.3 Auth mexanizmi (MUHIM)
- Sayt: JWT (`user_token` httpOnly cookie) + `token_version` tekshiruvi
- Token login javobining **body'sida ham qaytadi** → Flutter'da saqlash mumkin
- **Yechim**: `dio` + `cookie_jar` (persist) — server o'zgarishsiz ishlaydi.
  Keyinroq xohlasak `Authorization: Bearer` qo'llab-quvvatlash qo'shamiz (kichik o'zgarish).

### 2.4 Backend'da KERAK BO'LADIGAN kichik o'zgarishlar (faqat 3 ta)
1. **FCM token endpoint** — `/api/auth/push-subscription` web-push uchun; mobil FCM tokenlarini saqlash uchun kengaytirish + admin push-send'da FCM'ga ham yuborish
2. **Click return URL** → ilova deep link'iga qaytish (`velari://payment-result` yoki App Link)
3. (Ixtiyoriy) Bearer header auth

---

## 3-QISM. FLUTTER ARXITEKTURASI

### 3.1 Texnologiyalar
| Nima | Tanlov | Sabab |
|---|---|---|
| State | **Riverpod 2** | Sodda, test qilinadigan, kod-gen ixtiyoriy |
| Routing | **go_router** | Deep link (App Links) bilan tabiiy ishlaydi |
| HTTP | **dio** + cookie_jar + retry interceptor | Cookie auth, xatolarni markaziy ushlash |
| Supabase | **supabase_flutter** | O'qish + realtime |
| Local cache | **hive_ce** | Savat, wishlist, til, recently viewed, sessiya |
| Rasm | **cached_network_image** | Disk kesh |
| Video | **video_player** (+ preload manager) | Reels, stories |
| Push | **firebase_messaging** | FCM |
| Xarita | **yandex_maps_mapkit** | Saytdagi bilan bir xil (Yandex) |
| l10n | **intl** + ARB (uz/ru) | Sayt translations.ts'dan ko'chiriladi |
| Animatsiya | Hero, animations paketi, flutter_animate | "Zo'r animatsiyalar" talabi |

### 3.2 Papka tuzilishi
```
lib/
  core/
    api/        — dio client, interceptors, endpoints
    supabase/   — client, realtime
    theme/      — ranglar (#2D6E3E yashil, oq, radiuslar), tipografika
    router/     — go_router, deep links
    l10n/       — uz/ru
    utils/      — narx format, sana, slug
  features/
    home/       — bosh sahifa (stories, promo, banner, grid)
    search/     — qidiruv + vizual qidiruv
    catalog/    — katalog + kategoriya
    product/    — mahsulot sahifasi (media, info, specs, reviews)
    cart/       — savat + promo
    checkout/   — manzil, xarita, yetkazish, hamyon
    payment/    — Click/naqd
    orders/     — buyurtmalar, bekor, qaytarish, sharh
    wishlist/
    auth/       — login, 2FA, Telegram register
    account/    — profil, sozlamalar, til
    affiliate/  — hamkorlik kabineti
    wallet/     — hamyon, transfer, PIN
    reels/      — video lenta
    chat/       — support chat (realtime)
    blog/
    store/      — ombor sahifasi
  shared/
    widgets/    — ProductCard, Skeleton, Sheet, Toast, EmptyState, Chip
```

### 3.3 Mavjud `velari_app`dagi WebView kodi
`lib/main.dart` (WebView) — yangi arxitektura kirgach **olib tashlanadi**. Paket nomi/signing kalitlari qoladi (Play Market uchun bir xil applicationId).

---

## 4-QISM. BOSQICHLAR (har biri oxirida ishlaydigan APK)

### 0-bosqich: Poydevor
- [ ] pubspec: barcha paketlar, applicationId, min SDK
- [ ] Theme (Velari dizayn tizimi: #2D6E3E, oq fon, radius, shriftlar)
- [ ] go_router skeleti + 5 tab (bottom bar)
- [ ] dio client + cookie persist + xato handling (429/401 toast — saytdagidek)
- [ ] supabase init, hive init, l10n (uz/ru)
- [ ] Splash + ilova ikonkasi

### 1-bosqich: Katalog oqimi (eng katta qiymat)
- [ ] Bosh sahifa: ProductGrid (infinite + skeleton), CategoryFilter, FeaturedCategories, TrustStrip, RecentlyViewed (hive)
- [ ] PromoCountdown (taymer)
- [ ] Bannerlar (rasm; HTML bo'lsa webview fallback)
- [ ] Stories qatori + fullscreen viewer
- [ ] Katalog + kategoriya ekranlari
- [ ] Mahsulot sahifasi: galereya (fullscreen, video), info, variantlar, specs, tavsif sheet, related, sharhlar (o'qish)
- [ ] Qidiruv: suggestions, natijalar, facet chiplar, didYouMean; vizual qidiruv

### 2-bosqich: Savat → To'lov
- [ ] Savat (hive + serverga sync), promo-kod sheet
- [ ] Checkout: manzil, Yandex xarita, standard/express, hamyon, stock validatsiya
- [ ] To'lov: Click deep link (url_launcher) / naqd
- [ ] Order success
- [ ] `place_order` oqimi to'liq test (promo + express + wallet kombinatsiyalari)

### 3-bosqich: Auth + Shaxsiy bo'lim
- [ ] Login (parol + 2FA OTP), Telegram register (bot deep link)
- [ ] Telegram auto-login callback (App Link)
- [ ] Profil: edit, til, mening sharhlarim, promo-kodlarim, qaytarishlarim
- [ ] Buyurtmalarim: ro'yxat, tafsilot, bekor qilish, qaytarish, sharh yozish (media upload)
- [ ] Wishlist (hive + sync)

### 4-bosqich: Qo'shimcha modullar
- [ ] Hamyon: balans, tarix, transfer (PIN keypad)
- [ ] Hamkorlik kabineti (4 tab)
- [ ] Reels (PageView, like, izohlar sheet, preload)
- [ ] Support chat (Supabase realtime, media)
- [ ] Blog, Do'kon sahifasi, statik sahifalar
- [ ] Push: FCM (backend endpoint + buyurtma holati bildirishnomasi)
- [ ] Deep links: `/products/`, `/ref/`, `/catalog/` (assetlinks.json)

### 5-bosqich: Sayqal + Play Market
- [ ] Animatsiyalar: Hero (karta→sahifa), sahifa o'tishlari, micro-interactions
- [ ] Offline rejim: keshdan ko'rsatish + banner
- [ ] Empty/error holatlar hamma ekranda
- [ ] Performance: rasm o'lchamlari, lazy loading, jank tekshiruv
- [ ] AppMetrica/Firebase Analytics (ixtiyoriy)
- [ ] Signing, ProGuard, app bundle, Store listing (skrinshot, tavsif uz/ru)
- [ ] Ichki test (internal testing track) → production

---

## 5-QISM. XAVFLAR / DIQQAT NUQTALARI
1. **Narx hisob-kitobi** saytda murakkab (global promo + smart discount + personal offers + promo-kod + wallet + bepul yetkazish chegarasi promo-kodsiz). Flutter'da hisoblash mantig'ini API javoblariga tayanib qilish — DUBLIKAT QILMASLIK. Yakuniy hisob doim `place_order` serverda.
2. **HTML bannerlar** — admin HTML kiritadi; Flutter'da to'liq render qilish uchun mini-webview kerak bo'ladi. Iloji bo'lsa admin'da rasm-banner rejimiga o'tish.
3. **Cookie auth** — dio cookie_jar persist to'g'ri sozlanmasa sessiya yo'qoladi; birinchi bosqichda sinash.
4. **Click callback** — to'lovdan qaytishda ilova holatini tiklash (deep link).
5. **2 til** — translations.ts dagi BARCHA matnlarni ARB'ga ko'chirish (bir martalik mexanik ish, kattaroq hajm).
