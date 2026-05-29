-- Yetkazib berish (standart + tezkor) uchun ustunlar.
-- Supabase SQL editor'da bir marta ishga tushiring.

-- 1) Mahsulotlar: admin "tezkor yetkazish" mumkin bo'lgan tovarlarni belgilaydi
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS express_delivery boolean NOT NULL DEFAULT false;

-- 2) Buyurtmalar: tanlangan yetkazish turi, narxi va taxminiy vaqti
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text,            -- 'standard' | 'express'
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_eta text;             -- masalan: "30 daqiqa — 1 soat 30 daqiqa"

-- Indeks: tezkor mahsulotlarni tez filtrlash uchun (ixtiyoriy)
CREATE INDEX IF NOT EXISTS idx_products_express_delivery
  ON public.products (express_delivery) WHERE express_delivery = true;
