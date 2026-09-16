@echo off
chcp 65001 > nul
title VELARI AI REELS GENERATOR
color 0A

echo ======================================================
echo           🎬 VELARI AI REELS GENERATOR BOT
echo ======================================================
echo.
echo [1] Tasodifiy tovar uchun Reels yasash va Instagramga joylash
echo [2] Faqat Test (Video yasash, lekin Instagramga yuklamaslik)
echo [3] Bazadagi tovarlar ro'yxatini va qoldiqlarini ko'rish
echo [4] Aniq tovar ID si bo'yicha video yasash
echo [5] Avtomat Scheduler (Top-Score bo'yicha eng zo'r tovarni joylash)
echo [6] Kerakli Python kutubxonalarini o'rnatish (requirements.txt)
echo [0] Chiqish
echo.
set /p choice="Tanlovingizni kiriting [0-6]: "

if "%choice%"=="1" (
    echo.
    echo 🚀 Ishga tushirilmoqda...
    python velari_ai_audio\run_reels_bot.py
    goto end
)
if "%choice%"=="2" (
    echo.
    echo 🧪 Test rejimi ishga tushirilmoqda...
    python velari_ai_audio\run_reels_bot.py --test
    goto end
)
if "%choice%"=="3" (
    echo.
    python velari_ai_audio\run_reels_bot.py --list
    goto end
)
if "%choice%"=="4" (
    echo.
    set /p pid="Tovar ID sini kiriting: "
    python velari_ai_audio\run_reels_bot.py --product-id %pid%
    goto end
)
if "%choice%"=="5" (
    echo.
    echo 🤖 Avtomat Scheduler ishga tushirilmoqda...
    python velari_ai_audio\auto_reels_scheduler.py
    goto end
)
if "%choice%"=="6" (
    echo.
    echo 📦 Kutubxonalar o'rnatilmoqda...
    pip install -r velari_ai_audio\requirements.txt
    goto end
)

:end
echo.
echo ======================================================
echo Jarayon yakunlandi. Chiqish uchun istalgan tugmani bosing...
pause > nul
