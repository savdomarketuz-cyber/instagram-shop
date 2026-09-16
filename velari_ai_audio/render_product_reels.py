import os
import sys
import math
import wave
import json
import shutil
import random
import struct
import subprocess
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

from config import (
    FFMPEG_PATH,
    OUTPUT_DIR,
    READY_QUEUE_DIR,
    TEMP_DIR,
    UZBEKVOICE_API_KEY,
    resolve_font_path
)

# ALL 3 OFFICIAL PHOTOS OF UAKEEN AUTOMATIC COFFEE MACHINE!
UAKEEN_COFFEE_URLS = [
    "https://storage.yandexcloud.net/savdomarketimag/images/10110/1775413345473_Gemini_Generated_Image_ufg35gufg35gufg3.jpg",
    "https://storage.yandexcloud.net/savdomarketimag/images/10110/1775413343988_Gemini_Generated_Image_ae52fbae52fbae52.jpg",
    "https://storage.yandexcloud.net/savdomarketimag/images/10110/1775413342552_Gemini_Generated_Image_26dpnw26dpnw26dp.jpg"
]

def generate_sevinch_voiceover(full_text):
    voice_path = os.path.join(TEMP_DIR, "sevinch_voice.wav")
    if os.path.exists(voice_path):
        os.remove(voice_path)

    payload = {
        "text": full_text,
        "model": "sevinch",
        "blocking": "true"
    }
    
    req = urllib.request.Request(
        "https://uzbekvoice.ai/api/v1/tts",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": UZBEKVOICE_API_KEY,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        method="POST"
    )
    
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        audio_url = data.get('result', {}).get('url')
        if audio_url:
            areq = urllib.request.Request(audio_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(areq) as aresp:
                with open(voice_path, 'wb') as f:
                    f.write(aresp.read())
            return voice_path

def generate_cash_register_sfx():
    sfx_path = os.path.join(TEMP_DIR, "cash_register.wav")
    sample_rate = 24000
    duration = 0.45
    num_samples = int(sample_rate * duration)
    
    with wave.open(sfx_path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for i in range(num_samples):
            t = i / sample_rate
            decay = math.exp(-10 * t)
            val = (0.5 * math.sin(2 * math.pi * 1760 * t) + 0.5 * math.sin(2 * math.pi * 2637 * t)) * decay
            sample = max(-32768, min(32767, int(val * 30000)))
            wav_file.writeframes(struct.pack('<h', sample))
    return sfx_path

def get_audio_duration(wav_path):
    with wave.open(wav_path, 'r') as f:
        return f.getnframes() / float(f.getframerate())

def download_all_images(image_urls):
    if isinstance(image_urls, str):
        image_urls = [image_urls]

    images = []
    for i, url in enumerate(image_urls):
        dest = os.path.join(TEMP_DIR, f"curr_product_{i}.jpg")
        if os.path.exists(dest):
            os.remove(dest)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(dest, 'wb') as f:
                f.write(resp.read())
        except Exception as e:
            print(f" Image Download Error ({url}): {e}", flush=True)

        if os.path.exists(dest):
            images.append(Image.open(dest).convert("RGB"))
            
    return images if images else [Image.new("RGB", (1000, 1000), (200, 200, 200))]

def compute_word_timestamps(full_text, audio_duration):
    words = full_text.split()
    total_chars = sum(len(w) for w in words)
    
    word_timings = []
    current_time = 0.0
    
    for i, word in enumerate(words):
        dur = (len(word) / float(total_chars)) * audio_duration
        start = current_time
        end = current_time + dur
        word_timings.append({
            "word": word,
            "start": start,
            "end": end,
            "index": i
        })
        current_time = end
        
    return word_timings

def draw_3d_text(draw, x, y, text, font, main_color, shadow_color, depth=6, anchor="mm"):
    for d in range(depth, 0, -1):
        draw.text((x + d, y + d), text, font=font, fill=shadow_color, anchor=anchor)
    draw.text((x, y), text, font=font, fill=main_color, anchor=anchor)

def create_bilateral_wave_mask(w, h, frame_idx, wave_amplitude=12):
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    phase = frame_idx * 0.10
    
    margin = 35
    for y in range(h):
        t = y / h
        wave_offset = math.sin(t * math.pi * 2.5 + phase) * wave_amplitude
        x_left = int(margin + wave_offset)
        x_right = int(w - margin - wave_offset)
        draw.line([(x_left, y), (x_right, y)], fill=255)
        
    return mask, phase

# PRE-LOADED FONTS (Bir marta xotiraga yuklanadi, har kadrda qayta ochilmaydi)
try:
    _font_path = resolve_font_path(bold=True)
    FONT_TITLE_MARQUEE = ImageFont.truetype(_font_path, 64)
    FONT_DISCOUNT_NUM = ImageFont.truetype(_font_path, 68)
    FONT_DISCOUNT_LBL = ImageFont.truetype(_font_path, 24)
    FONT_OLD_PRICE = ImageFont.truetype(_font_path, 36)
    FONT_NEW_PRICE_3D = ImageFont.truetype(_font_path, 68)
    FONT_ACTIVE_WORD = ImageFont.truetype(_font_path, 54)
    FONT_NORM_WORD = ImageFont.truetype(_font_path, 42)
except Exception:
    FONT_TITLE_MARQUEE = FONT_DISCOUNT_NUM = FONT_DISCOUNT_LBL = FONT_OLD_PRICE = FONT_NEW_PRICE_3D = FONT_ACTIVE_WORD = FONT_NORM_WORD = ImageFont.load_default()

# PRE-COMPUTED SHADOW CACHE
SHADOW_CACHE = {}

def get_cached_shadow(w, h, paste_x, paste_y, target_w, target_h):
    key = (paste_x, paste_y, target_w, target_h)
    if key not in SHADOW_CACHE:
        shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw_sh = ImageDraw.Draw(shadow_layer)
        draw_sh.rounded_rectangle([(paste_x - 10, paste_y - 10), (paste_x + target_w + 10, paste_y + target_h + 10)], radius=30, fill=(0, 0, 0, 85))
        SHADOW_CACHE[key] = shadow_layer.filter(ImageFilter.GaussianBlur(radius=25))
    return SHADOW_CACHE[key]

def render_v6_frame(raw_images, frame_idx, total_frames, audio_duration, word_timings, price_reveal_sec,
                    product_name, price, old_price, discount_percent):
    W, H = 1080, 1920
    fps = 25
    
    current_time_sec = (frame_idx / total_frames) * audio_duration

    display_old_num = f"{old_price:,}".replace(",", " ")
    display_new_price = f"{price:,}".replace(",", " ") + " SO'M"

    font_title_marquee = FONT_TITLE_MARQUEE
    font_discount_num = FONT_DISCOUNT_NUM
    font_discount_lbl = FONT_DISCOUNT_LBL
    font_old_price = FONT_OLD_PRICE
    font_new_price_3d = FONT_NEW_PRICE_3D
    font_active_word = FONT_ACTIVE_WORD
    font_norm_word = FONT_NORM_WORD

    # MULTI-PRODUCT CAROUSEL SLIDESHOW WITH SMOOTH CROSS-FADE TRANSITIONS
    num_imgs = len(raw_images)
    slide_dur = 3.5 * fps # 3.5 seconds per photo!
    curr_slide = int(frame_idx // slide_dur) % num_imgs
    next_slide = (curr_slide + 1) % num_imgs
    
    transition_frames = 0.8 * fps
    if num_imgs > 1 and (slide_dur - (frame_idx % slide_dur)) <= transition_frames:
        fade_alpha = (transition_frames - (slide_dur - (frame_idx % slide_dur))) / transition_frames
        raw_img = Image.blend(raw_images[curr_slide], raw_images[next_slide], fade_alpha)
    else:
        raw_img = raw_images[curr_slide]

    orig_w, orig_h = raw_img.size

    canvas = Image.new("RGB", (W, H), (248, 250, 254))
    
    bubbles_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    
    random.seed(42)
    bubble_configs = []
    for bi in range(16):
        bx_base = random.randint(50, 1030)
        by_base = random.randint(50, 1850)
        br = random.randint(60, 180)
        speed = random.uniform(2.0, 5.5)
        phase_offset = random.uniform(0, 6.28)
        bubble_configs.append({"x": bx_base, "y": by_base, "r": br, "speed": speed, "phase": phase_offset})

    thumb_prod = raw_img.resize((320, 320)).filter(ImageFilter.GaussianBlur(radius=12))
    
    for i, b in enumerate(bubble_configs):
        by = int((b["y"] - frame_idx * b["speed"]) % (H + 300) - 150)
        bx = int(b["x"] + 45 * math.sin(frame_idx * 0.07 + b["phase"]))
        r = b["r"]
        
        circ_mask = Image.new("L", (r * 2, r * 2), 0)
        ImageDraw.Draw(circ_mask).ellipse([(0, 0), (r * 2, r * 2)], fill=210)
        
        bub_crop = thumb_prod.resize((r * 2, r * 2))
        bubbles_layer.paste(bub_crop, (bx - r, by - r), circ_mask)

    canvas_rgba = Image.alpha_composite(canvas.convert("RGBA"), bubbles_layer)
    canvas = canvas_rgba.convert("RGB")

    card_top = 210
    card_bottom = 1470
    card_height = card_bottom - card_top
    max_img_w = 1020

    scale = min(max_img_w / orig_w, card_height / orig_h)
    target_w = int(orig_w * scale)
    target_h = int(orig_h * scale)

    prod_scaled = raw_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    wave_mask, phase = create_bilateral_wave_mask(target_w, target_h, frame_idx, wave_amplitude=12)
    
    paste_x = (W - target_w) // 2
    paste_y = card_top + (card_height - target_h) // 2

    shadow_blurred = get_cached_shadow(W, H, paste_x, paste_y, target_w, target_h)
    canvas_rgba = Image.alpha_composite(canvas.convert("RGBA"), shadow_blurred)
    canvas = canvas_rgba.convert("RGB")

    canvas.paste(prod_scaled, (paste_x, paste_y), wave_mask)

    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_glow = ImageDraw.Draw(glow_layer)
    margin = 35
    for y in range(target_h):
        t = y / target_h
        wave_offset = math.sin(t * math.pi * 2.5 + phase) * 12
        x_left = int(paste_x + margin + wave_offset)
        x_right = int(paste_x + target_w - margin - wave_offset)
        screen_y = paste_y + y
        
        for gw in range(5):
            alpha = int(180 * (1 - gw / 5))
            draw_glow.point((x_left - gw, screen_y), fill=(239, 68, 68, alpha))
            draw_glow.point((x_right + gw, screen_y), fill=(239, 68, 68, alpha))

    canvas = Image.alpha_composite(canvas.convert("RGBA"), glow_layer).convert("RGB")

    pulse = 1.0 + 0.05 * math.sin(frame_idx * 0.2)
    badge_w = int(240 * pulse)
    badge_h = int(120 * pulse)
    
    badge = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
    draw_b = ImageDraw.Draw(badge)
    
    draw_b.rounded_rectangle([(4, 4), (badge_w, badge_h)], radius=24, fill=(150, 20, 20, 180))
    draw_b.rounded_rectangle([(0, 0), (badge_w - 4, badge_h - 4)], radius=24, fill=(239, 68, 68, 255), outline=(255, 255, 255), width=3)
    
    draw_b.text(((badge_w - 4) // 2, (badge_h - 4) // 2 - 12), f"-{discount_percent}%", font=font_discount_num, fill=(255, 255, 255), anchor="mm")
    draw_b.text(((badge_w - 4) // 2, (badge_h - 4) // 2 + 34), "CHEGIRMA", font=font_discount_lbl, fill=(255, 255, 255), anchor="mm")
    
    tilt = math.sin(frame_idx * 0.15) * 4.0
    rotated_badge = badge.rotate(tilt, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.paste(rotated_badge, (50, 170), rotated_badge.split()[3])

    draw = ImageDraw.Draw(canvas)

    marquee_text = f"  ★  {product_name.upper()}  ★  {product_name.upper()}  "
    bbox_m = draw.textbbox((0, 0), marquee_text, font=font_title_marquee)
    marquee_width = bbox_m[2] - bbox_m[0]
    
    speed_px = 7.0
    offset_x = (frame_idx * speed_px) % marquee_width
    start_x = W - offset_x
    
    draw_3d_text(draw, int(start_x), 100, marquee_text, font_title_marquee,
                 main_color=(15, 23, 42), shadow_color=(203, 213, 225), depth=5, anchor="lm")
    draw_3d_text(draw, int(start_x - marquee_width), 100, marquee_text, font_title_marquee,
                 main_color=(15, 23, 42), shadow_color=(203, 213, 225), depth=5, anchor="lm")

    if current_time_sec >= price_reveal_sec:
        pop_progress = min(1.0, (current_time_sec - price_reveal_sec) / 0.45)
        pop_alpha = int(pop_progress * 255)

        price_badge_bg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_pbg = ImageDraw.Draw(price_badge_bg)
        
        rect_box = [(60, 1490), (W - 60, 1680)]
        draw_pbg.rounded_rectangle([(66, 1496), (W - 54, 1686)], radius=28, fill=(148, 163, 184, int(pop_alpha * 0.8)))
        draw_pbg.rounded_rectangle(rect_box, radius=28, fill=(255, 255, 255, pop_alpha), outline=(34, 197, 94), width=4)

        canvas_rgba = Image.alpha_composite(canvas.convert("RGBA"), price_badge_bg)
        canvas = canvas_rgba.convert("RGB")
        draw = ImageDraw.Draw(canvas)

        old_str = f"Eski narx: {display_old_num}"
        draw.text((W // 2, 1540), old_str, font=font_old_price, fill=(100, 116, 139), anchor="mm")
        bbox_old = draw.textbbox((W // 2, 1540), old_str, font=font_old_price, anchor="mm")
        draw.line([(bbox_old[0] + 130, 1540), (bbox_old[2], 1540)], fill=(239, 68, 68), width=4)

        draw_3d_text(draw, W // 2, 1615, display_new_price, font_new_price_3d,
                     main_color=(22, 163, 74), shadow_color=(187, 247, 208), depth=5, anchor="mm")

    sub_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_sub = ImageDraw.Draw(sub_overlay)
    
    draw_sub.rounded_rectangle([(30, 1730), (W - 30, 1860)], radius=20, fill=(15, 23, 42, 225), outline=(219, 39, 119), width=3)
    
    canvas_rgba = Image.alpha_composite(canvas.convert("RGBA"), sub_overlay)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    active_idx = 0
    for wt in word_timings:
        if wt["start"] <= current_time_sec <= wt["end"]:
            active_idx = wt["index"]
            break
        elif current_time_sec > wt["end"]:
            active_idx = wt["index"]

    start_w = max(0, active_idx - 1)
    end_w = min(len(word_timings), active_idx + 2)
    phrase_words = word_timings[start_w:end_w]

    center_y = 1795
    phrase_rendered = []
    for w in phrase_words:
        is_active = (w["index"] == active_idx)
        phrase_rendered.append((w["word"], is_active))

    word_widths = []
    for word_str, is_act in phrase_rendered:
        fnt = font_active_word if is_act else font_norm_word
        bbox = draw.textbbox((0, 0), word_str + " ", font=fnt)
        word_widths.append(bbox[2] - bbox[0])

    tot_w = sum(word_widths)
    start_x = (W - tot_w) // 2

    cur_x = start_x
    for i, (word_str, is_act) in enumerate(phrase_rendered):
        fnt = font_active_word if is_act else font_norm_word
        color = (253, 224, 71) if is_act else (255, 255, 255)
        draw.text((cur_x, center_y), word_str, font=fnt, fill=color, anchor="lm")
        cur_x += word_widths[i]

    frame_path = os.path.join(TEMP_DIR, f"frame_{frame_idx:04d}.jpg")
    canvas.save(frame_path, quality=92)
    return frame_path

def build_product_reels(product_name, price, old_price, image_urls, script_text, output_filename=None):
    if os.path.exists(TEMP_DIR):
        for f in os.listdir(TEMP_DIR):
            fp = os.path.join(TEMP_DIR, f)
            if os.path.isfile(fp):
                try:
                    os.remove(fp)
                except:
                    pass

    print(f"\n==================================================", flush=True)
    print(f"🎬 STARTING REELS ENGINE FOR: '{product_name}'", flush=True)
    print(f"==================================================", flush=True)

    if isinstance(image_urls, str):
        image_urls = [image_urls]

    if not output_filename:
        safe_name = "".join(c for c in product_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
        output_filename = f"{safe_name}_Reels.mp4"

    output_mp4 = os.path.join(OUTPUT_DIR, output_filename)
    discount_percent = round(((old_price - price) / old_price) * 100)

    print(f"[1/4 🎙️ TTS Ovoz Generator] UzbekVoice Sevinch ovozi yozilmoqda...", flush=True)
    voice_path = generate_sevinch_voiceover(script_text)
    audio_duration = get_audio_duration(voice_path)
    print(f"   -> Suxandon ovozi davomiyligi: {audio_duration:.2f} soniya", flush=True)

    word_timings = compute_word_timestamps(script_text, audio_duration)

    price_reveal_sec = 18.77
    for wt in word_timings:
        w_lower = wt['word'].lower()
        if w_lower in ['bir', 'ikki', 'uch', "to'rt", 'besh', 'olti', 'yetti', 'sakkiz', "to'qqiz", "o'n"]:
            if wt['start'] > 15.0:
                price_reveal_sec = wt['start']
                break

    price_reveal_ms = int(price_reveal_sec * 1000)
    print(f"   -> 💰 Kassa Tovushi Triggeri: {price_reveal_sec:.2f}-soniya ({price_reveal_ms}ms)", flush=True)

    sfx_path = generate_cash_register_sfx()
    
    print(f"[2/4 🖼️ Rasmlar Yuklash] Mahsulot rasmlari olinmoqda...", flush=True)
    raw_images = download_all_images(image_urls)
    print(f"   -> {len(raw_images)} ta MAHSULOT RASMI olindi va karuselga tayyorlandi!", flush=True)

    fps = 25
    total_frames = int(audio_duration * fps)

    print(f"[3/4 🎨 Live Video Rendering] {total_frames} ta kadr chizilmoqda...", flush=True)
    for i in range(total_frames):
        render_v6_frame(raw_images, i, total_frames, audio_duration, word_timings, price_reveal_sec,
                        product_name, price, old_price, discount_percent)
        
        if i % 40 == 0 or i == total_frames - 1:
            pct = int(((i + 1) / total_frames) * 100)
            print(f"   ⏳ [Chizilmoqda] Kadr {i+1}/{total_frames} ({pct}% bajarildi)...", flush=True)

    video_only_mp4 = os.path.join(TEMP_DIR, "video_no_audio.mp4")

    print(f"[4/4 🔊 FFmpeg Audio Mixing] Video va 3.0x baland ovoz birlashtirilmoqda...", flush=True)
    cmd_v = [
        FFMPEG_PATH,
        "-y",
        "-framerate", str(fps),
        "-i", os.path.join(TEMP_DIR, "frame_%04d.jpg"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        video_only_mp4
    ]
    subprocess.run(cmd_v, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    cmd_mix = [
        FFMPEG_PATH,
        "-y",
        "-i", video_only_mp4,
        "-i", voice_path,
        "-i", sfx_path,
        "-filter_complex", f"[1:a]volume=3.0[v_louder];[2:a]adelay={price_reveal_ms}:all=1,volume=2.0[sfx];[v_louder][sfx]amix=inputs=2:duration=first,volume=1.4[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        output_mp4
    ]
    subprocess.run(cmd_mix, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Vaqtinchalik kadrlar va yordamchi audiolarni xotiradan tozalash
    try:
        for f in os.listdir(TEMP_DIR):
            fp = os.path.join(TEMP_DIR, f)
            if os.path.isfile(fp):
                os.remove(fp)
    except Exception:
        pass

    print(f"\n==================================================", flush=True)
    print(f"🎉 MUVAFFAQIYATLI YAKUNLANDI: {output_mp4}", flush=True)
    print(f"==================================================\n", flush=True)
    return output_mp4

if __name__ == "__main__":
    test_title = "UAKEEN AVTOMATIK KOFEMASHINA"
    test_price = 1299000
    test_old_price = 3897000
    test_urls = UAKEEN_COFFEE_URLS
    test_script = "Siz bugun qahva tayyorlash uchun qancha vaqt sarmoya qilyapsiz? Endi sizning vaqtinizni tejaydigan va qulayligingizni oshiradigan yo'nalish bor, bizning avtomatik kofemashinamiz orqali qahva tayyorlash jarayonini osonlashtiring. Bugungi kundagina bizning mahsulotimiz uchun maxsus taklif: katta chegirma imkoniyati. Narxi bugun bir million ikki yuz to'qson to'qqiz ming so'm. Shu vaqtdan boshlab qahva ichishning yangi usulini boshlang."
    
    build_product_reels(test_title, test_price, test_old_price, test_urls, test_script, "Uakeen_Coffee_V6_Master_Reels.mp4")
