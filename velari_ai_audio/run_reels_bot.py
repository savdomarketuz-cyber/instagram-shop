#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VELARI AI REELS BOT (CLI)
=========================
Supabase'dan tovar ma'lumotlarini oladi, Groq AI orqali marketing ssenariy yozadi,
UzbekVoice orqali o'zbekcha ovoz yaratadi, Pillow va FFmpeg yordamida 1080x1920 (9:16)
vertikal Reels videosini render qiladi, Yandex S3 ga yuklaydi va Instagram Reels'ga joylaydi.

Foydalanish:
    python velari_ai_audio/run_reels_bot.py
    python velari_ai_audio/run_reels_bot.py --test
    python velari_ai_audio/run_reels_bot.py --product-id <UUID>
    python velari_ai_audio/run_reels_bot.py --list
"""

import os
import sys
import json
import time
import random
import argparse
import requests
import boto3
import hmac
import hashlib
import base64

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    GROQ_API_KEY,
    S3_ENDPOINT,
    S3_ACCESS_KEY,
    S3_SECRET_KEY,
    S3_BUCKET,
    S3_REGION,
    IG_ID,
    PAGE_TOKEN,
    ADMIN_SECRET,
    BASE_URL,
    validate_credentials,
    load_posted_history,
    record_posted_history,
)
from stock_utils import is_product_in_stock, get_product_real_stock, calculate_product_score
from render_product_reels import build_product_reels, OUTPUT_DIR


def log(msg, emoji="ℹ️"):
    now = time.strftime("%H:%M:%S")
    print(f"[{now}] {emoji} {msg}", flush=True)


def create_admin_jwt_token(secret: str) -> str:
    """Velari server ko'prigi uchun xavfsiz admin JWT tokenni yaratadi."""
    if not secret:
        return ""
    header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps({"role": "admin"}).encode()).decode().rstrip("=")
    data = f"{header_b64}.{payload_b64}".encode()
    signature_b64 = base64.urlsafe_b64encode(hmac.new(secret.encode(), data, hashlib.sha256).digest()).decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{signature_b64}"


# --- SUPABASE INTEGRATION ---
def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }


def fetch_all_raw_products():
    """Supabase'dan bazadagi BARCHA mahsulotlarni sahifalab (pagination) to'liq yuklaydi."""
    all_items = []
    limit = 1000
    offset = 0
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/products"
            f"?select=id,name_uz,name,price,old_price,images,image,stock,stock_details,description_uz,description,sales,total_views,avg_rating"
            f"&is_deleted=eq.false&limit={limit}&offset={offset}"
        )
        res = requests.get(url, headers=get_supabase_headers(), timeout=20)
        if res.status_code != 200:
            raise Exception(f"Supabase xatosi ({res.status_code}): {res.text}")
        batch = res.json()
        if not batch:
            break
        all_items.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return all_items


def fetch_products(only_unposted=True, sort_by_score=True):
    """Barcha mahsulotlarni oladi, Unified Stock bo'yicha filtrlaydi va Top-Score bo'yicha saralaydi."""
    items = fetch_all_raw_products()

    # 1. Faqat omborda bor tovarlar
    in_stock_items = [p for p in items if is_product_in_stock(p)]

    # 2. Har bir mahsulot uchun top_score va haqiqiy qoldiqni hisoblash
    for p in in_stock_items:
        p["top_score"] = calculate_product_score(p)
        p["real_stock"] = get_product_real_stock(p)

    # 3. Instagramga allaqachon chiqarilgan tovarlarni chiqarib tashlash
    candidates = in_stock_items
    if only_unposted:
        posted_set = load_posted_history()
        unposted = [p for p in in_stock_items if str(p.get("id")) not in posted_set]
        if unposted:
            candidates = unposted
        else:
            log("Barcha mavjud mahsulotlar e'lon qilingan. Barcha mahsulotlar orasidan eng yuqori ballisi tanlanadi.", "ℹ️")

    # 4. Top-Score bo'yicha kamayish tartibida saralash
    if sort_by_score:
        candidates.sort(key=lambda x: x["top_score"], reverse=True)

    return candidates


def fetch_single_product(product_id):
    """Aniq bitta mahsulotni ID bo'yicha oladi."""
    url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&is_deleted=eq.false"
    res = requests.get(url, headers=get_supabase_headers(), timeout=15)
    if res.status_code != 200 or not res.json():
        raise Exception(f"Mahsulot topilmadi: {product_id}")
    p = res.json()[0]
    p["top_score"] = calculate_product_score(p)
    p["real_stock"] = get_product_real_stock(p)
    return p


# --- GROQ AI MARKETING COPYWRITER ---
def generate_smm_script(product_name, price, old_price):
    """Groq AI orqali 20-25 soniyalik o'zbekcha marketing matnini tuzadi."""
    log("Groq AI orqali o'zbekcha professional SMM senariy yozilmoqda...", "🧠")
    discount = round(((old_price - price) / old_price) * 100) if old_price > price else 25

    prompt = f"""Siz Velari do'koni uchun professional O'zbek SMM videorolik muallifisiz.
Quyidagi mahsulot uchun Instagram Reels formatida 20-25 soniyaga mo'ljallangan qisqa, jozibali, odam tilida o'qiladigan ssenariy yozing.

Mahsulot: {product_name}
Yangi narxi: {price:,} so'm
Eski narxi: {old_price:,} so'm
Chegirma: {discount}%

QAT'IY QOIDALAR:
1. Matnda BIRORTA HAM RAQAM, MODEL NOMI YOKI BELGI BO'LMASIN! (Masalan: '1100W', 'V-099', '2026', '50%' aslo bo'lmasin).
2. Narxi va chegirmalarni FAQAT O'ZBEKCHA SO'ZLAR BILAN YOZING! (Masalan: 'bir yuz to'qson to'qqiz ming so'm', 'o'ttiz foiz chegirmada').
3. Matn oxirida 'Buyurtma berish uchun saytimizga kiring' degan chaqiriq bo'lsin.
4. Javobda faqat diktor o'qiydigan sof matnni bering, boshqa hech qanday izoh yoki sarlavha yozmang.
"""

    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {"role": "system", "content": "Siz faqat diktor o'qiydigan matnni qaytaradigan yordamchisiz."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6
    }

    res = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if res.status_code != 200:
        raise Exception(f"Groq API xatosi ({res.status_code}): {res.text}")

    content = res.json()["choices"][0]["message"]["content"].strip()
    return content


# --- YANDEX S3 UPLOADER ---
def upload_video_to_s3(local_file_path, s3_filename):
    """Videoni Yandex S3 bulutiga yuklab, ommaviy havola qaytaradi."""
    log(f"Video Yandex S3 bulutiga yuklanmoqda ({os.path.basename(local_file_path)})...", "☁️")

    s3 = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )

    key = f"reels/{s3_filename}"
    s3.upload_file(
        Filename=local_file_path,
        Bucket=S3_BUCKET,
        Key=key,
        ExtraArgs={
            "ContentType": "video/mp4",
            "ACL": "public-read"
        }
    )

    public_url = f"{S3_ENDPOINT}/{S3_BUCKET}/{key}"
    log(f"Video Yandex S3 ga yuklandi: {public_url}", "✅")
    return public_url


# --- INSTAGRAM REELS PUBLISHER ---
def publish_to_instagram_reels(video_url, caption):
    """Instagram Reels'ga video joylaydi (to'g'ridan-to'g'ri yoki velari.uz ko'prigi orqali)."""
    log("Instagram Reels ga joylash boshlanmoqda...", "📲")

    # Usul 1: Direct Meta Graph API (agar O'zbekistonda bloklanmagan bo'lsa)
    try:
        log("1-urinish: To'g'ridan-to'g'ri Meta Graph API ga ulanish...", "🌐")
        container_res = requests.post(
            f"https://graph.facebook.com/v20.0/{IG_ID}/media",
            json={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "share_to_feed": True,
                "access_token": PAGE_TOKEN
            },
            timeout=8
        )
        c_data = container_res.json()
        if "id" in c_data:
            creation_id = c_data["id"]
            log(f"Reels konteyner ochildi (ID: {creation_id}). Video ishlanishini kutamiz...", "⏳")

            for _ in range(15):
                time.sleep(3)
                st_res = requests.get(
                    f"https://graph.facebook.com/v20.0/{creation_id}?fields=status_code&access_token={PAGE_TOKEN}",
                    timeout=8
                )
                status_code = st_res.json().get("status_code")
                if status_code == "FINISHED":
                    log("Video Instagram serverida tayyor bo'ldi! E'lon qilinmoqda...", "🚀")
                    pub_res = requests.post(
                        f"https://graph.facebook.com/v20.0/{IG_ID}/media_publish",
                        json={"creation_id": creation_id, "access_token": PAGE_TOKEN},
                        timeout=8
                    )
                    pub_data = pub_res.json()
                    if "id" in pub_data:
                        reel_id = pub_data["id"]
                        return {"success": True, "reel_id": reel_id, "url": f"https://www.instagram.com/reel/{reel_id}/"}
                    break
    except Exception as e:
        log(f"To'g'ridan-to'g'ri ulanishda tarmoq xatosi: {e}", "⚠️")

    # Usul 2: Velari.uz xavfsiz server ko'prigi (xorijiy server orqali)
    log("2-urinish: Velari.uz xavfsiz server ko'prigi orqali yuborilmoqda...", "🌉")
    bridge_url = f"{BASE_URL}/api/admin/instagram/publish-reel"
    token = create_admin_jwt_token(ADMIN_SECRET) if ADMIN_SECRET else ""
    headers = {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
        "Authorization": f"Bearer {ADMIN_SECRET}"
    }
    cookies = {"admin_token": token} if token else {}
    payload = {
        "videoUrl": video_url,
        "caption": caption,
        "secret": ADMIN_SECRET,
        "pageAccessToken": PAGE_TOKEN,
        "instagramAccountId": IG_ID
    }

    res = requests.post(
        bridge_url,
        json=payload,
        headers=headers,
        cookies=cookies,
        timeout=60
    )

    if res.status_code == 200:
        data = res.json()
        return {"success": True, "reel_id": data.get("reelId"), "url": data.get("url")}
    else:
        raise Exception(f"Instagramga joylashda xatolik ({res.status_code}): {res.text}")


# --- TO'LIQ ISH OQIMI (WORKFLOW) ---
def process_and_publish_product(product, custom_script=None, is_test=False):
    """Har qanday mahsulot yoki maxsus ssenariy uchun to'liq Reels oqimini bajaradi."""
    title = product.get("name_uz") or product.get("name") or "Mahsulot"
    real_stock = get_product_real_stock(product)

    # Qat'iy qoldiq tekshiruvi (omborda yo'q tovar hech qachon ishlanmaydi)
    if not is_product_in_stock(product):
        log(f"XATOLIK: '{title}' mahsuloti omborda mavjud emas (qoldiq: {real_stock}). Jarayon to'xtatildi!", "❌")
        return {"success": False, "error": "Product out of stock"}

    price = int(product.get("price") or 0)
    old_price = int(product.get("old_price") or int(price * 1.35))

    raw_images = product.get("images") or []
    if isinstance(raw_images, str):
        try:
            raw_images = json.loads(raw_images)
        except Exception:
            raw_images = [raw_images]
    if not raw_images and product.get("image"):
        raw_images = [product["image"]]

    if not raw_images:
        raise Exception(f"'{title}' uchun rasm topilmadi.")

    log(f"Tanlangan tovar: '{title}'", "🎯")
    log(f"Narxi: {price:,} so'm (Eski: {old_price:,} so'm) | Qoldiq: {real_stock} dona", "🏷️")
    log(f"Rasmlar soni: {len(raw_images)} ta", "🖼️")

    # Ssenariyni tayyorlash
    if custom_script:
        script_text = custom_script
        log("Tayyor insoniy ssenariy ishlatilmoqda.", "✍️")
    else:
        script_text = generate_smm_script(title, price, old_price)

    print("\n" + "-" * 50)
    print(f"📝 TAYYORLANGAN SSENARIY:\n{script_text}")
    print("-" * 50 + "\n")

    # Video render
    clean_slug = "".join(c if c.isalnum() else "_" for c in title[:20]).strip("_")
    output_filename = f"Reels_{clean_slug}_{int(time.time())}.mp4"

    log("Reels videoni render qilish boshlandi (25 FPS, 1080x1920)...", "🎬")
    mp4_path = build_product_reels(title, price, old_price, raw_images, script_text, output_filename)
    log(f"Lokal video tayyor: {mp4_path}", "🎉")

    if is_test:
        log("TEST REJIMI: Video yaratildi, ammo bulut va Instagramga yuklanmadi.", "🧪")
        print("\nVideoni tomosha qilish uchun ushbu faylni oching:")
        print(f"👉 {mp4_path}\n")
        return {"success": True, "test": True, "mp4_path": mp4_path}

    # S3 ga yuklash
    s3_url = upload_video_to_s3(mp4_path, output_filename)

    # Instagram Caption
    product_slug = str(product.get("id"))
    product_url = f"{BASE_URL}/uz/products/{product_slug}"
    caption = f"""🛍 {title}

⚡️ Maxsus narx: {price:,} so'm
❌ Eski narx: {old_price:,} so'm

✅ Rasmiy kafolat
✅ O'zbekiston bo'ylab tezkor yetkazib berish

🛒 Xarid qilish uchun bio-dagi havola orqali saytimizga kiring:
👉 {product_url}

#velari #velarimarket #reels #onlineshop #uzbekistan #toshkent #chegirma #foydali"""

    # Instagramga joylash
    result = publish_to_instagram_reels(s3_url, caption)

    # Supabase reels jadvaliga va lokal tarixga yozish
    pid = str(product.get("id", ""))
    record_posted_history(
        product_id=pid,
        product_title=title,
        instagram_url=result.get("url", ""),
        video_url=s3_url,
        reel_id=str(result.get("reel_id", "")),
        price=price,
        image=(raw_images[0] if raw_images else "")
    )

    print("\n" + "=" * 60)
    print("🏆 TABRIKLAYMIZ! REELS MUVAFFAQIYATLI CHOP ETILDI!")
    print(f"📱 Instagram Reel havolasi: {result.get('url')}")
    print(f"🌐 S3 Video URL: {s3_url}")
    print("=" * 60 + "\n")

    return result


def run(product_id=None, is_test=False):
    print("=" * 60)
    mode_str = " [TEST REJIMI]" if is_test else ""
    print(f"🚀 VELARI AI REELS BOT ISHGA TUSHIRILDI{mode_str}")
    print("=" * 60)

    # 1. Sozlamalarni tekshirish (test rejimida faqat kerakli kalitlar tekshiriladi)
    if not validate_credentials(is_test=is_test):
        return

    # 2. Tovarni aniqlash
    if product_id:
        product = fetch_single_product(product_id)
        if not is_product_in_stock(product):
            stock_qty = get_product_real_stock(product)
            log(f"XATOLIK: Ushbu tovar omborda mavjud emas (qoldiq: {stock_qty}). Jarayon to'xtatildi!", "❌")
            return
    else:
        # Barcha mahsulotlar ichidan Top-Score bo'yicha eng yuqori baholanganni tanlash
        products = fetch_products(only_unposted=True, sort_by_score=True)
        if not products:
            log("Sotuvda mavjud bo'lgan chiqarilmagan mahsulot topilmadi!", "❌")
            return

        log("Top 3 ta yetakchi nomzod (Top-Score tahlili):", "📊")
        for idx, cand in enumerate(products[:3], 1):
            c_name = (cand.get("name_uz") or cand.get("name") or "")[:35]
            c_score = cand.get("top_score", 0)
            c_views = cand.get("total_views", 0)
            c_sales = cand.get("sales", 0)
            c_stock = cand.get("real_stock", 0)
            log(f"   {idx}. {c_name:<35} | Score: {c_score:<5.2f} (Ko'rish: {c_views}, Sotuv: {c_sales}) | Qoldiq: {c_stock}")

        product = products[0]
        log(f"Top-Score g'olibi tanlandi: '{product.get('name_uz') or product.get('name')}' (Score: {product.get('top_score')})", "🏆")

    process_and_publish_product(product, is_test=is_test)


def list_products():
    print("\n📦 BAZADAGI BARCHA SOTUVDA BOR MAHSULOTLAR (TOP-SCORE BO'YICHA):")
    print("=" * 88)
    products = fetch_products(only_unposted=False, sort_by_score=True)
    posted_set = load_posted_history()
    for i, p in enumerate(products[:30], 1):
        name = (p.get("name_uz") or p.get("name") or "")[:38]
        price = p.get("price") or 0
        stock = p.get("real_stock", 0)
        score = p.get("top_score", 0)
        pid = str(p.get("id"))
        status = "✅ E'lon qilingan" if pid in posted_set else "⏳ Kutmoqda"
        print(f"{i:2d}. [{pid[:8]}...] {name:<38} | Score: {score:>5.2f} | {price:>8,} so'm | Qoldiq: {stock:3d} | {status}")
    print("=" * 88)
    print(f"Jami sotuvda bor mahsulotlar soni: {len(products)} ta")
    print("Muayyan tovar uchun video yasash: python velari_ai_audio/run_reels_bot.py --product-id <ID>\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Velari Instagram Reels AI Bot")
    parser.add_argument("--product-id", type=str, help="Aniq tovar ID (UUID)")
    parser.add_argument("--test", action="store_true", help="Faqat video yasash, Instagramga yuklamaslik")
    parser.add_argument("--list", action="store_true", help="Bazadagi tovarlar ro'yxatini ko'rish")

    args = parser.parse_args()

    if args.list:
        list_products()
    else:
        run(product_id=args.product_id, is_test=args.test)
