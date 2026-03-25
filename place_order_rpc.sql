-- Function to place an order atomically
CREATE OR REPLACE FUNCTION place_order(
  p_user_phone text,
  p_items jsonb,
  p_total numeric,
  p_address text,
  p_coords jsonb,
  p_status text
) RETURNS jsonb AS $$
DECLARE
  v_item jsonb;
  v_product_id text;
  v_quantity int;
  v_stock_details jsonb;
  v_new_stock_details jsonb;
  v_wh_id text;
  v_wh_stock int;
  v_remaining_qty int;
  v_order_id text;
  v_stock_errors jsonb := '[]'::jsonb;
BEGIN
  -- 1. Validate Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    
    SELECT stock_details INTO v_stock_details FROM products WHERE id = v_product_id FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    -- Calculate total stock
    SELECT COALESCE(SUM((val)::int), 0) INTO v_wh_stock FROM jsonb_each_text(v_stock_details) AS t(key, val);
    
    IF v_wh_stock < v_quantity THEN
      v_stock_errors := v_stock_errors || jsonb_build_object(
        'id', v_product_id,
        'name', v_item->>'name',
        'available', v_wh_stock
      );
    END IF;
  END LOOP;

  -- 2. If errors, return them
  IF jsonb_array_length(v_stock_errors) > 0 THEN
    RETURN jsonb_build_object('success', false, 'errors', v_stock_errors);
  END IF;

  -- 3. Deduct Stock and Update Sales
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    v_remaining_qty := v_quantity;
    
    SELECT stock_details INTO v_stock_details FROM products WHERE id = v_product_id;
    v_new_stock_details := v_stock_details;

    -- Loop through warehouses to deduct stock
    FOR v_wh_id, v_wh_stock IN SELECT * FROM jsonb_each_text(v_stock_details) AS t(key, val)
    LOOP
      IF v_remaining_qty <= 0 THEN
        EXIT;
      END IF;

      IF (v_wh_stock::int) >= v_remaining_qty THEN
        v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], to_jsonb((v_wh_stock::int) - v_remaining_qty));
        v_remaining_qty := 0;
      ELSE
        v_remaining_qty := v_remaining_qty - (v_wh_stock::int);
        v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], '0'::jsonb);
      END IF;
    END LOOP;

    UPDATE products 
    SET stock_details = v_new_stock_details, 
        sales = sales + v_quantity 
    WHERE id = v_product_id;
  END LOOP;

  -- 4. Create Order
  v_order_id := floor(random() * (999999-100000+1) + 100000)::text || substr(extract(epoch from now())::text, -4);
  
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, created_at)
  VALUES (v_order_id, p_user_phone, p_items, p_total, p_address, p_coords, p_status, now());

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id);
END;
$$ LANGUAGE plpgsql;
