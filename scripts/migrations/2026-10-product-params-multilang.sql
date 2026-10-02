BEGIN;
ALTER TABLE public.product_param_values
    ADD COLUMN IF NOT EXISTS value_uz TEXT,
    ADD COLUMN IF NOT EXISTS value_ru TEXT;
UPDATE public.product_param_values
SET 
    value_uz = CASE 
        WHEN position(' / ' in value) > 0 THEN trim(split_part(value, ' / ', 1))
        ELSE trim(value)
    END,
    value_ru = CASE 
        WHEN position(' / ' in value) > 0 THEN trim(split_part(value, ' / ', 2))
        ELSE trim(value)
    END
WHERE value IS NOT NULL AND (value_uz IS NULL OR value_ru IS NULL);
COMMIT;
