-- Mahsulotlarning category_id qiymatlari buzilgan edi: ba'zilari haqiqiy
-- kategoriya ID (raqamli) o'rniga matnli yorliq ("TRIMMER", "BLENDER", ...) edi.
-- Bu sabab kategoriya bo'yicha filtrlash ishlamasdi va breadcrumb xato chiqardi.
-- Quyidagi remap jonli bazaga qo'llanildi.

UPDATE products SET category_id = '406' WHERE category_id IN ('TRIMMER', '602'); -- Trimmerlar
UPDATE products SET category_id = '501' WHERE category_id = 'BLENDER';            -- Blenderlar
UPDATE products SET category_id = '513' WHERE category_id = 'TOASTER';            -- Tosterlar
UPDATE products SET category_id = '505' WHERE category_id = 'TIEFAL';             -- Elektr choynaklar (Tefal)
UPDATE products SET category_id = '511' WHERE category_id = 'MIKSER';             -- Mikserlar
UPDATE products SET category_id = '507' WHERE category_id = 'KOFE MASHINKA';      -- Kofe mashinalari
UPDATE products SET category_id = '403' WHERE category_id = 'FEN';                -- Fenlar
UPDATE products SET category_id = '504' WHERE category_id = 'BUGLI DAZMOL';       -- Bug'li dazmollar
UPDATE products SET category_id = '405' WHERE category_id = 'STYLER';             -- Soch turmaklash (Styler)
