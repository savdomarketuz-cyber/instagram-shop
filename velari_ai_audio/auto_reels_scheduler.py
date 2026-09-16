#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VELARI AUTO REELS SCHEDULER
===========================
Uch bosqichli professional Instagram Reels avtomatlashtirish tizimi:
  1-Bosqich (Priority 1): ready_queue papkasida qo'lda tashlangan tayyor video bo'lsa -> S3 ga yuklaydi va Instagramga chiqaradi.
  2-Bosqich (Priority 2): custom_scripts_queue.json da yozilgan maxsus insoniy ssenariy bo'lsa -> video yasab Instagramga chiqaradi.
  3-Bosqich (Priority 3): Real Supabase bazasidan eng ko'p ko'rilgan va sotilgan (Top Score) tovar tanlanadi -> Groq AI ssenariy yozadi -> render qilinadi -> Instagramga chiqariladi.

Foydalanish:
    python velari_ai_audio/auto_reels_scheduler.py
    python velari_ai_audio/auto_reels_scheduler.py --test
    python velari_ai_audio/auto_reels_scheduler.py --interval 24
"""

import os
import sys
import glob
import json
import time
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from config import (
    READY_QUEUE_DIR,
    SCRIPT_QUEUE_FILE,
    LOG_FILE,
    BASE_URL,
    validate_credentials,
    record_posted_history,
)
from stock_utils import is_product_in_stock, get_product_real_stock, calculate_product_score
from run_reels_bot import (
    fetch_products,
    fetch_single_product,
    upload_video_to_s3,
    publish_to_instagram_reels,
    process_and_publish_product,
)


def log(msg, emoji="ℹ️"):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {emoji} {msg}"
    print(entry, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(entry + "\n")
    except Exception:
        pass


def check_priority_1_ready_video():
    """1-Bosqich: ready_queue papkasida tayyor video bormi?"""
    if not os.path.exists(READY_QUEUE_DIR):
        return None
    videos = glob.glob(os.path.join(READY_QUEUE_DIR, "*.mp4"))
    if videos:
        videos.sort(key=os.path.getmtime)
        return videos[0]
    return None


def check_priority_2_custom_script():
    """2-Bosqich: custom_scripts_queue.json da maxsus yozilgan ssenariy bormi?"""
    if not os.path.exists(SCRIPT_QUEUE_FILE):
        return None
    try:
        with open(SCRIPT_QUEUE_FILE, "r", encoding="utf-8") as f:
            queue = json.load(f)
        if queue and len(queue) > 0:
            return queue[0]
    except Exception as e:
        log(f"Ssenariylar navbatini o'qishda xatolik: {e}", "⚠️")
    return None


def remove_first_custom_script():
    if os.path.exists(SCRIPT_QUEUE_FILE):
        try:
            with open(SCRIPT_QUEUE_FILE, "r", encoding="utf-8") as f:
                queue = json.load(f)
            if queue:
                queue.pop(0)
                with open(SCRIPT_QUEUE_FILE, "w", encoding="utf-8") as f:
                    json.dump(queue, f, ensure_ascii=False, indent=2)
        except Exception as e:
            log(f"Ssenariylar navbatini yangilashda xato: {e}", "⚠️")


def select_top_product_from_supabase():
    """Supabase'dan faqat omborda bor va hali chiqarilmagan tovarlarni Top-Score bo'yicha saralaydi."""
    log("Supabase bazasidan barcha tovarlar yuklanib, TOP-SCORE reytingi tahlil qilinmoqda...", "🔍")
    ranked = fetch_products(only_unposted=True, sort_by_score=True)

    if not ranked:
        log("Sotuvda mavjud bo'lgan chiqarilmagan mahsulot qolmadi!", "⚠️")
        return None

    # Dastlabki 3 ta tovar haqida log yozish
    log(f"Top 3 ta nomzod:", "📊")
    for idx, p in enumerate(ranked[:3], 1):
        name = (p.get("name_uz") or p.get("name") or "")[:35]
        log(f"   {idx}. {name:<35} | Score: {p['top_score']:<5.2f} (Ko'rish: {p.get('total_views', 0)}, Sotuv: {p.get('sales', 0)}) | Qoldiq: {p['real_stock']}")

    winner = ranked[0]
    log(f"G'olib tovar tanlandi: '{winner.get('name_uz') or winner.get('name')}' (Score: {winner['top_score']})", "🎯")
    return winner


def run_auto_daily_task(is_test=False):
    log("=" * 60)
    mode_str = " [TEST REJIMI]" if is_test else ""
    log(f"🤖 AUTO REELS BOT: Kunlik topshiriq boshlandi...{mode_str}", "🚀")
    log("=" * 60)

    if not validate_credentials(is_test=is_test):
        return

    # ----------------------------------------------------
    # Step 1: Priority 1 (Tayyor video tekshiruvi)
    # ----------------------------------------------------
    ready_video = check_priority_1_ready_video()
    if ready_video:
        vid_name = os.path.basename(ready_video)
        log(f"1-USTUVORLIK TOPILDI: Navbatda tayyor video mavjud -> {vid_name}", "✅")

        if is_test:
            log(f"TEST REJIMI: Tayyor video topildi ({ready_video}), lekin Instagramga yuklanmadi.", "🧪")
            return

        s3_url = upload_video_to_s3(ready_video, f"ready_{int(time.time())}_{vid_name}")
        caption = f"🛍 Yangi mahsulot Velari do'konida!\n\nBuyurtma berish uchun bio-dagi saytimizga kiring:\n👉 {BASE_URL}\n\n#velari #reels #yangilik"
        res = publish_to_instagram_reels(s3_url, caption)
        log(f"Reels Instagramga chiqarildi: {res.get('url')}", "🎉")

        record_posted_history(
            product_id=f"ready_{int(time.time())}",
            product_title=vid_name,
            instagram_url=res.get("url", ""),
            video_url=s3_url,
            reel_id=str(res.get("reel_id", ""))
        )

        try:
            os.remove(ready_video)
            log(f"Chiqarilgan video navbatdan o'chirildi: {vid_name}", "🗑️")
        except Exception as e:
            log(f"Faylni o'chirishda xato: {e}", "⚠️")
        return

    # ----------------------------------------------------
    # Step 2: Priority 2 (Maxsus yozilgan ssenariy)
    # ----------------------------------------------------
    custom_item = check_priority_2_custom_script()
    if custom_item:
        title = custom_item.get("title", "Maxsus tovar")
        log(f"2-USTUVORLIK TOPILDI: '{title}' uchun maxsus yozilgan ssenariy topildi.", "✅")

        # Agar tovar ID berilgan bo'lsa bazadan oladi
        product = None
        if custom_item.get("product_id"):
            try:
                product = fetch_single_product(custom_item["product_id"])
            except Exception:
                product = None

        if not product:
            product = {
                "name_uz": title,
                "price": custom_item.get("price", 250000),
                "old_price": custom_item.get("old_price", 400000),
                "images": custom_item.get("image_urls") or custom_item.get("image_url") or [],
                "stock": 10,
                "id": custom_item.get("product_id", f"custom_{int(time.time())}")
            }

        process_and_publish_product(product, custom_script=custom_item.get("script"), is_test=is_test)

        if not is_test:
            remove_first_custom_script()
            log("Maxsus ssenariy navbatdan olib tashlandi.", "🗑️")
        return

    # ----------------------------------------------------
    # Step 3: Priority 3 Fallback (Real Supabase Top Score)
    # ----------------------------------------------------
    log("3-USTUVORLIK: Supabase bazasidan eng yuqori reytingli tovar tanlanmoqda...", "ℹ️")
    top_product = select_top_product_from_supabase()
    if not top_product:
        log("Chiqarish uchun munosib tovar topilmadi.", "❌")
        return

    process_and_publish_product(top_product, is_test=is_test)


def start_scheduler_loop(interval_hours=24, is_test=False):
    log(f"Avtomatik rejalashtiruvchi ishga tushdi (Har {interval_hours} soatda bir marta).", "⏰")
    try:
        while True:
            run_auto_daily_task(is_test=is_test)
            sleep_sec = interval_hours * 3600
            log(f"Keyingi nashrgacha kutilmoqda: {interval_hours} soat ({sleep_sec} soniya)...", "⏳")
            time.sleep(sleep_sec)
    except KeyboardInterrupt:
        log("Rejalashtiruvchi foydalanuvchi tomonidan to'xtatildi.", "🛑")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Velari Auto Reels Scheduler")
    parser.add_argument("--test", action="store_true", help="Faqat video yasash, Instagramga yuklamaslik")
    parser.add_argument("--interval", type=int, default=0, help="Takroriy davriy ishlash (soatda). 0 = bir marta ishlash")

    args = parser.parse_args()

    if args.interval > 0:
        start_scheduler_loop(interval_hours=args.interval, is_test=args.test)
    else:
        run_auto_daily_task(is_test=args.test)
