@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   VELARI - Yangi mahsulotlar embedding
echo ============================================
echo.
echo Yangi va o'zgargan mahsulotlar topilib, matn va rasm vektorlari yoziladi...
echo (Google Gemini API; kalitlar .env.local da)
echo.
call npm run embed:all
echo.
echo ============================================
echo   Tugadi. Yopish uchun istalgan tugmani bosing.
echo ============================================
pause >nul
