# 🎬 Velari AI Audio & Instagram Reels Generator

Ushbu papka Velari internet-do'koni uchun sun'iy intellekt yordamida to'liq avtomatlashtirilgan 1080x1920 (9:16 vertikal) Instagram Reels videoroliklarini yaratish va nashr qilish tizimidir.

---

## 🚀 Asosiy Imkoniyatlar

1. **Real Supabase & Unified Stock:**
   - Saytdagi yagona ombor qoldig'i mantiqi (`stock_details` omborlar yig'indisi) bo'yicha faqat sotuvda bor mahsulotlarni tanlaydi.
   - Allaqachon chiqarilgan mahsulotlarni `posted_history.json` orqali eslab qoladi va qayta takrorlamaydi.
2. **Top-Score Saralash:**
   - Mahsulotning ko'rishlar soni (`total_views`), sotuvlar (`sales`) va reytingi (`avg_rating`) asosida eng ommabop tovarlarni avtomatik aniqlaydi.
3. **Groq AI SMM Copywriting:**
   - Llama/Qwen modellari orqali 20–25 soniyaga mo'ljallangan, raqamlarsiz, odam tilida o'qiladigan tabiiy o'zbekcha marketing matnini tuzadi.
4. **UzbekVoice.ai TTS:**
   - Sevinch modeli ovozida professional o'zbekcha diktor ovozi yaratiladi.
5. **Yuqori sifatli video montaj (Pillow + FFmpeg):**
   - 1080x1920 (9:16) o'lchamda kadr-ba-kadr animatsiya: harakatlanuvchi zarrachalar (particles), rasmlar karuseli, jonli karaoke subtitrlar va 3D narx sakrashi.
6. **Yandex S3 & Instagram Reels Publish:**
   - Tayyor video Yandex S3 bulutiga yuklanadi va Meta Graph API orqali (yoki `velari.uz` xavfsiz ko'prigi orqali) to'g'ridan-to'g'ri Instagram Reels'ga e'lon qilinadi.

---

## 📦 O'rnatish (Installation)

Kerakli Python kutubxonalarini o'rnatish:

```cmd
pip install -r velari_ai_audio/requirements.txt
```

Tizimda **FFmpeg** o'rnatilgan bo'lishi kerak. Skript avtomatik ravishda:
* `D:\cdvfd\ffmpeg\bin\ffmpeg.exe`
* `C:\Program Files\ffmpeg\bin\ffmpeg.exe`
* Yoki tizim `PATH`idagi FFmpeg'ni topib ishlatadi.

---

## 🔑 Sozlamalar (`.env.local`)

Loyiha boshidagi `.env.local` faylida quyidagi kalitlar bo'lishi shart:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://slmbethqqqugnktxwzdz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# AI & Ovoz
GROQ_API_KEY_1=gsk_...
UZBEKVOICE_API_KEY=4e365544-...

# Yandex S3
YANDEX_S3_ACCESS_KEY=...
YANDEX_S3_SECRET_KEY=...
YANDEX_S3_BUCKET=savdomarketimag
YANDEX_S3_REGION=ru-central1

# Instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841446090191717
INSTAGRAM_PAGE_ACCESS_TOKEN=EAAw8o...
ADMIN_SECRET=velari-admin-secret-2024
```

> Agar birorta kalit yetishmasa, skriptlar qaysi kalit yo'qligini chiroyli tushuntirish bilan xabar beradi.

---

## 💻 Qanday Ishlatiladi?

### 1. Interaktiv Menyu (Eng oson usul):
Loyihaning ildizidagi `REELS-YARATISH.bat` faylini 2 marta bosing.

### 2. Qo'lda (CLI orqali):
* **Faqat video yasash va kompyuterda tomosha qilish (Instagramga yuklamaydi):**
  ```cmd
  python velari_ai_audio/run_reels_bot.py --test
  ```
* **Tasodifiy tovar uchun video yasab, Instagramga joylash:**
  ```cmd
  python velari_ai_audio/run_reels_bot.py
  ```
* **Bazadagi tovarlar ro'yxatini va qoldiqlarini ko'rish:**
  ```cmd
  python velari_ai_audio/run_reels_bot.py --list
  ```
* **Aniq tovar ID si bo'yicha yasash:**
  ```cmd
  python velari_ai_audio/run_reels_bot.py --product-id <UUID>
  ```

### 3. Avtomat Rejalashtiruvchi (Scheduler):
* **Kunlik topshiriqni 1 marta ishga tushirish:**
  ```cmd
  python velari_ai_audio/auto_reels_scheduler.py
  ```
* **Har 24 soatda avtomat takrorlanuvchi rejimda qoldirish:**
  ```cmd
  python velari_ai_audio/auto_reels_scheduler.py --interval 24
  ```

---

## 🗂️ Papka Tuzilishi

* `run_reels_bot.py` — Boshqaruvchi asosiy CLI vositasi.
* `auto_reels_scheduler.py` — 3 bosqichli avtomat scheduler.
* `render_product_reels.py` — Kadr-ba-kadr video va ovoz render qiluvchi dvigatel.
* `config.py` — Portable yo'llar, API kalitlar va credential validator.
* `stock_utils.py` — Unified Stock (haqiqiy ombor qoldig'i) hisoblagichi.
* `ready_queue/` — Agar tayyor `.mp4` videongiz bo'lsa, shu yerga tashlasangiz, scheduler birinchi bo'lib uni chiqaradi.
* `custom_scripts_queue.json` — O'zingiz yozgan maxsus SMM ssenariylar navbati.
* `posted_history.json` — Chiqarilgan mahsulotlar tarixi (qayta takrorlanmasligi uchun).
