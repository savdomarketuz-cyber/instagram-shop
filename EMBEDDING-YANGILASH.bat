@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   VELARI - Yangi mahsulotlar embedding
echo ============================================
echo.
echo Embedding yo'q (yangi) mahsulotlar topilib, vektor yoziladi...
echo (Birinchi marta model ~120MB yuklab oladi, keyin tez ishlaydi)
echo.
node scripts\embed-products.mjs
echo.
echo ============================================
echo   Tugadi. Yopish uchun istalgan tugmani bosing.
echo ============================================
pause >nul
