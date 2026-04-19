-- Security Fix: Automatic Product Rating Update via Trigger
-- This removes the need for client-side rating updates, preventing rating manipulation.

-- 0. Ensure products table has review_count column
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='review_count') THEN
    ALTER TABLE products ADD COLUMN review_count integer DEFAULT 0;
  END IF;
END $$;

-- 1. Create the function that updates product rating
CREATE OR REPLACE FUNCTION update_product_rating() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only update rating if it's a review (not a question or reply)
    IF (NEW.type = 'review' AND NEW.parent_id IS NULL AND NEW.rating IS NOT NULL) 
       OR (OLD.type = 'review' AND OLD.parent_id IS NULL AND OLD.rating IS NOT NULL) THEN
        
        UPDATE products
        SET 
            avg_rating = COALESCE((
                SELECT AVG(rating)::numeric(3,2) 
                FROM comments 
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
                  AND type = 'review' 
                  AND parent_id IS NULL 
                  AND rating IS NOT NULL
            ), 0),
            review_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
                  AND type = 'review' 
                  AND parent_id IS NULL 
                  AND rating IS NOT NULL
            )
        WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_update_product_rating ON comments;
CREATE TRIGGER tr_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- 3. Run initial sync
UPDATE products p
SET 
    avg_rating = COALESCE((
        SELECT AVG(rating)::numeric(3,2) 
        FROM comments 
        WHERE product_id = p.id 
          AND type = 'review' 
          AND parent_id IS NULL 
          AND rating IS NOT NULL
    ), 0),
    review_count = (
        SELECT COUNT(*) 
        FROM comments 
        WHERE product_id = p.id 
          AND type = 'review' 
          AND parent_id IS NULL 
          AND rating IS NOT NULL
    );
