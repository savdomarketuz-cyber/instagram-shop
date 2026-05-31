# Banner HTML yaratish qoidalari (AI uchun prompt)

> Bu hujjatni AIga (ChatGPT/Claude) nusxalab bering, keyin qanday banner xohlaganingizni yozing.
> AI faqat HTML kodini qaytaradi — uni admin panel → Bannerlar → HTML maydoniga joylashtirasiz.

---

## VAZIFA
Sen Velari onlayn-do'koni uchun bosh sahifa bannerining HTML kodini yozasan.
Banner `dangerouslySetInnerHTML` orqali render qilinadi va konteynerni to'ldiradi.
Faqat tayyor HTML kodini qaytar — markdown belgilari (```), izoh yoki tushuntirishsiz.

## KONTEYNER (muhim)
- Banner joylashadigan quti **kengligi o'zgaruvchan**: telefon ~360px, planshet ~700px, desktop ~1100px+.
- **Balandlik**: desktopda admin belgilaydi (odatda ~450px), mobilda 16:10 nisbat. Ya'ni balandlik ham o'zgaruvchan.
- Burchaklar avtomatik yumaloqlanadi va `overflow:hidden` qo'llanadi — sen border-radius qo'shishing shart emas.
- Shu sababli **qat'iy piksel o'lcham ishlatma**. Hamma narsa moslashuvchan bo'lsin.

## MAJBURIY QOIDALAR
1. Eng tashqi (root) element **`width:100%; height:100%; box-sizing:border-box`** bo'lsin.
2. Shrift o'lchami, padding, bo'shliqlar **`clamp(min, vw, max)`** bilan berilsin. Misol: `font-size:clamp(20px,4vw,44px)`.
3. Dekorativ elementlar uchun `position:absolute` mumkin — root elementga `position:relative` ber.
4. `100vw` / `100vh` **ISHLATMA** (bu ekran o'lchami, konteyner emas). `%` ishlat.
5. `position:fixed` ishlatma (konteynerdan chiqib ketadi).
6. Tashqi CSS/JS fayl ulama. Hamma stil **inline** yoki `<style>` blok ichida bo'lsin.

## HAVOLA (link) ULASH
Butun bannerni bosiladigan qilish uchun root elementni `<a href="...">` qil.
URL manzillari (`uz` o'rniga `ru` ham bo'lishi mumkin — banner qaysi til uchun bo'lsa o'shani ishlat):

| Maqsad | URL |
|--------|-----|
| Bitta mahsulot | `/uz/products/<MAHSULOT_ID>` |
| Kategoriya mahsulotlari | `/uz/?category=<KATEGORIYA_ID>` |
| Brend mahsulotlari | `/uz/?brand=<BREND_ID>` |
| To'liq katalog | `/uz/catalog` |
| Bosh sahifa | `/uz` |

> ID larni admin panelidan oling (mahsulot/kategoriya/brend sahifasini ochib URL dan ko'rinadi).
> Ichki sahifa bo'lgani uchun `https://` yozma — `/uz/...` dan boshla.

## ANIMATSIYA (ixtiyoriy, lekin tavsiya etiladi)
- CSS animatsiya **ishlaydi**: `@keyframes`, `transition`, `transform`, `animation`.
- `@keyframes` va class nomlarini **unikal** qil (masalan har bannerda boshqa prefiks: `b1Float`, `promoShimmer`). Aks holda turli bannerlar bir-biriga ta'sir qiladi.
- `<style>` blokini HTML ichiga qo'shsang bo'ladi (@keyframes shu yerda yoziladi).

## TAQIQLANGAN
- `<script>` teg yoki `onclick`/`onmouseover` kabi inline JS — **ishlamaydi**.
- `position:fixed`, `100vw`, `100vh`.
- Tashqi `<link rel="stylesheet">` yoki `<script src>`.

## RASM ISHLATISH (xohlasang)
Tashqi rasm URL bilan `<img>` qo'shsang bo'ladi. Kesilmasligi uchun `object-fit:contain`,
to'ldirish uchun `object-fit:cover` ishlat. Rasm bir tomonga `position:absolute` bilan joylashtirilsa chiroyli.

---

## TO'LIQ NAMUNA (responsive + animatsiyali + linkli)

```html
<a href="/uz/?category=KATEGORIYA_ID" style="position:relative;display:flex;width:100%;height:100%;box-sizing:border-box;text-decoration:none;align-items:center;justify-content:space-between;gap:16px;padding:clamp(16px,4vw,52px);background:linear-gradient(135deg,#0F2A18 0%,#1F5A30 55%,#2D6E3E 100%);color:#fff;overflow:hidden;font-family:inherit;">
  <style>
    @keyframes b1Float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes b1Shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes b1Pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  </style>

  <!-- Dekorativ suzuvchi doiralar -->
  <div style="position:absolute;top:-40px;right:-30px;width:clamp(120px,22vw,260px);height:clamp(120px,22vw,260px);border-radius:50%;background:rgba(255,255,255,0.07);animation:b1Float 6s ease-in-out infinite;"></div>
  <div style="position:absolute;bottom:-50px;left:-20px;width:clamp(90px,16vw,190px);height:clamp(90px,16vw,190px);border-radius:50%;background:rgba(255,255,255,0.05);animation:b1Float 8s ease-in-out infinite reverse;"></div>

  <!-- Matn qismi -->
  <div style="position:relative;max-width:65%;z-index:2;">
    <div style="display:inline-block;font-size:clamp(9px,1.4vw,13px);font-weight:800;letter-spacing:2px;padding:6px 14px;border-radius:100px;background:rgba(255,255,255,0.15);backdrop-filter:blur(6px);">YANGI KOLLEKSIYA</div>
    <h2 style="margin:12px 0 16px;font-size:clamp(20px,4.2vw,46px);font-weight:800;line-height:1.05;background:linear-gradient(90deg,#fff 25%,#bff5cf 50%,#fff 75%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:b1Shimmer 3s linear infinite;">Sarlavhani shu yerga yozing</h2>
    <span style="display:inline-block;background:#fff;color:#1F5A30;padding:clamp(9px,1.2vw,15px) clamp(18px,2.2vw,30px);border-radius:100px;font-weight:800;font-size:clamp(12px,1.4vw,16px);animation:b1Pulse 2.5s ease-in-out infinite;">Hozir xarid qiling →</span>
  </div>
</a>
```

Bu namunada: gradient fon, suzib turadigan doiralar, sarlavhada yaltirash (shimmer),
tugmada pulsatsiya, va butun banner kategoriyaga bog'langan — hammasi har qurilmada moslashadi.
