#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Velari AI Audio & Reels Configuration
=====================================
Barcha yo'llar, API kalitlar va tizim sozlamalarini xavfsiz va portable boshqarish.
"""

import os
import sys
import shutil
import json

# Asosiy papkalar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, ".env.local")

OUTPUT_DIR = BASE_DIR
READY_QUEUE_DIR = os.path.join(OUTPUT_DIR, "ready_queue")
TEMP_DIR = os.path.join(OUTPUT_DIR, "temp_auto_render")
SCRIPT_QUEUE_FILE = os.path.join(OUTPUT_DIR, "custom_scripts_queue.json")
POSTED_HISTORY_FILE = os.path.join(OUTPUT_DIR, "posted_history.json")
LOG_FILE = os.path.join(OUTPUT_DIR, "auto_bot.log")

os.makedirs(READY_QUEUE_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# 1. .env.local dan o'qish
ENV_VARS = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                ENV_VARS[k.strip()] = v.strip().strip('"').strip("'")

def get_env(key: str, default: str = "") -> str:
    """Muhit o'zgaruvchisi yoki .env.local dan qiymatni oladi."""
    return os.getenv(key) or ENV_VARS.get(key, default)

# API sozlamalari
SUPABASE_URL = get_env("NEXT_PUBLIC_SUPABASE_URL", "https://slmbethqqqugnktxwzdz.supabase.co")
SUPABASE_KEY = get_env("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = get_env("GROQ_API_KEY_1") or get_env("GROQ_API_KEY", "")
UZBEKVOICE_API_KEY = get_env("UZBEKVOICE_API_KEY", "")
S3_ENDPOINT = get_env("YANDEX_S3_ENDPOINT", "https://storage.yandexcloud.net")
S3_ACCESS_KEY = get_env("YANDEX_S3_ACCESS_KEY", "")
S3_SECRET_KEY = get_env("YANDEX_S3_SECRET_KEY", "")
S3_BUCKET = get_env("YANDEX_S3_BUCKET", "savdomarketimag")
S3_REGION = get_env("YANDEX_S3_REGION", "ru-central1")
IG_ID = get_env("INSTAGRAM_BUSINESS_ACCOUNT_ID", "17841446090191717")
PAGE_TOKEN = get_env("INSTAGRAM_PAGE_ACCESS_TOKEN", "")
ADMIN_SECRET = get_env("ADMIN_SECRET", "velari-admin-secret-2024")
BASE_URL = "https://velari.uz"

# 2. Portable FFmpeg qidirish
def resolve_ffmpeg_path() -> str:
    """FFmpeg dasturining mavjud yo'lini avtomatik aniqlaydi."""
    env_override = os.getenv("FFMPEG_PATH")
    if env_override and os.path.exists(env_override):
        return env_override

    candidate_paths = [
        r"D:\cdvfd\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        shutil.which("ffmpeg")
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            return p

    return "ffmpeg"

FFMPEG_PATH = resolve_ffmpeg_path()

# 3. Portable Font qidirish
def resolve_font_path(bold: bool = True) -> str:
    """Tizimdagi Arial yoki muqobil shriftni topadi."""
    font_name = "arialbd.ttf" if bold else "arial.ttf"
    candidates = [
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", font_name),
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "arial.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        font_name
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return font_name

# 4. Credential Validator
def validate_credentials(silent: bool = False) -> bool:
    """Zarur barcha API kalitlari mavjudligini tekshiradi."""
    missing = []
    if not SUPABASE_KEY:
        missing.append(("SUPABASE_SERVICE_ROLE_KEY", "Supabase ma'lumotlar bazasiga ulanish uchun"))
    if not GROQ_API_KEY:
        missing.append(("GROQ_API_KEY_1 / GROQ_API_KEY", "AI SMM matnini yozish uchun"))
    if not UZBEKVOICE_API_KEY:
        missing.append(("UZBEKVOICE_API_KEY", "O'zbekcha diktor ovozini yaratish uchun"))
    if not S3_ACCESS_KEY or not S3_SECRET_KEY:
        missing.append(("YANDEX_S3_ACCESS_KEY / SECRET_KEY", "Videoni bulutga yuklash uchun"))
    if not PAGE_TOKEN:
        missing.append(("INSTAGRAM_PAGE_ACCESS_TOKEN", "Instagramga video joylash uchun"))

    if missing:
        if not silent:
            print("\n" + "=" * 65)
            print("⚠️  DIQQAT: QUYIDAGI ZARUR SOZLAMALAR TOPILMADI (.env.local):")
            print("=" * 65)
            for key, desc in missing:
                print(f"  ❌ {key:<32} -> {desc}")
            print("=" * 65)
            print(f"Iltimos, ushbu kalitlarni quyidagi faylga kiriting:")
            print(f"👉 {ENV_PATH}\n")
        return False
    return True

# 5. Posted History Tracker
def load_posted_history() -> set:
    if os.path.exists(POSTED_HISTORY_FILE):
        try:
            with open(POSTED_HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return set(data if isinstance(data, list) else data.keys())
        except Exception:
            return set()
    return set()

def record_posted_history(product_id: str, product_title: str = "", instagram_url: str = ""):
    history = {}
    if os.path.exists(POSTED_HISTORY_FILE):
        try:
            with open(POSTED_HISTORY_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
                if isinstance(raw, list):
                    history = {k: {"title": "", "date": ""} for k in raw}
                else:
                    history = raw
        except Exception:
            history = {}

    import time
    history[str(product_id)] = {
        "title": product_title,
        "instagram_url": instagram_url,
        "posted_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        with open(POSTED_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving posted history: {e}")
