require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_chats CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS user_status CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS reels CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS private_messages CASCADE;
DROP TABLE IF EXISTS private_chats CASCADE;
DROP TABLE IF EXISTS active_carts CASCADE;
DROP TABLE IF EXISTS bot_sessions CASCADE;
DROP TABLE IF EXISTS fcm_tokens CASCADE;

-- Categories table
create table categories (
  id text primary key,
  name text not null,
  name_uz text,
  name_ru text,
  parent_id text,
  image text,
  is_deleted boolean default false,
  created_at timestamp with time zone default now()
);

-- Brands table
create table brands (
  id text primary key,
  name text not null,
  name_uz text,
  name_ru text,
  image text,
  is_deleted boolean default false,
  created_at timestamp with time zone default now()
);

-- Products table
create table products (
  id text primary key,
  name text not null,
  name_uz text,
  name_ru text,
  price numeric default 0,
  old_price numeric default 0,
  category_id text,
  category_uz text,
  category_ru text,
  stock integer default 0,
  stock_details jsonb default '{}'::jsonb,
  image text,
  images text[] default '{}',
  description text,
  description_uz text,
  description_ru text,
  tag text,
  sku text,
  group_id text,
  color_name text,
  sales integer default 0,
  is_deleted boolean default false,
  article text,
  is_original boolean default false,
  brand_id text,
  height text,
  width text,
  length text,
  weight text,
  barcode text,
  video_url text,
  created_at timestamp with time zone default now()
);

-- Users table
create table users (
  id text primary key,
  phone text unique not null,
  password text not null,
  name text,
  username text,
  is_admin boolean default false,
  ip_address text,
  last_login timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Orders table
create table orders (
  id text primary key,
  user_phone text,
  items jsonb not null,
  total numeric not null,
  address text,
  coords jsonb,
  status text,
  created_at timestamp with time zone default now()
);

-- Comments table
create table comments (
  id text primary key,
  product_id text,
  user_id text,
  username text,
  text text,
  type text,
  parent_id text,
  rating integer,
  reactions jsonb default '{}'::jsonb,
  is_admin boolean default false,
  is_edited boolean default false,
  created_at timestamp with time zone default now()
);

-- Reels table
create table reels (
  id text primary key,
  product_id text,
  video_url text,
  likes_count integer default 0,
  comment_count integer default 0,
  name text,
  price numeric default 0,
  image text,
  created_at timestamp with time zone default now()
);

-- Banners table
create table banners (
  id text primary key,
  title_uz text,
  title_ru text,
  subtitle_uz text,
  subtitle_ru text,
  image_url_uz text,
  image_url_ru text,
  link_type text,
  link_ids text[] default '{}',
  button_text text,
  active boolean default true,
  order_index integer default 0,
  tab_name_uz text,
  tab_name_ru text,
  created_at timestamp with time zone default now()
);

-- Settings table
create table settings (
  id text primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

-- Warehouses table
create table warehouses (
  id text primary key,
  name text,
  address text,
  location jsonb,
  created_at timestamp with time zone default now()
);

-- User Status table
create table user_status (
  id text primary key,
  user_phone text,
  name text,
  ip_address text,
  current_path text,
  last_seen timestamp with time zone default now(),
  is_online boolean default true,
  type text, -- 'user' or 'visitor'
  last_action text,
  updated_at timestamp with time zone default now()
);

-- User Interests table
create table user_interests (
  id text primary key,
  user_phone text references users(phone),
  categories jsonb default '{}'::jsonb,
  attention_products text[] default '{}',
  ai_recommendations text[] default '{}',
  ai_recommendations_updated_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Support Chats table
create table support_chats (
  id text primary key,
  username text,
  last_message text,
  last_timestamp timestamp with time zone,
  status text,
  unread_by_admin integer default 0,
  created_at timestamp with time zone default now()
);

-- Support Messages table
create table support_messages (
  id text primary key,
  chat_id text references support_chats(id),
  text text,
  image text,
  video text,
  sender_id text,
  sender_type text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Private Chats table
create table private_chats (
  id text primary key,
  participants text[],
  last_message text,
  last_timestamp timestamp with time zone default now(),
  participant_data jsonb default '{}'::jsonb,
  unread_count jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Private Messages table
create table private_messages (
  id text primary key,
  chat_id text references private_chats(id),
  text text,
  image text,
  video text,
  sender_id text,
  created_at timestamp with time zone default now()
);

-- AI Logs table
create table ai_logs (
  id text primary key,
  user_phone text,
  input jsonb,
  output text[] default '{}',
  model text,
  action text,
  created_at timestamp with time zone default now()
);

-- Bot Sessions table
create table bot_sessions (
  chat_id text primary key,
  phone text,
  step text,
  temp_password_hash text,
  updated_at timestamp with time zone default now()
);

-- FCM Tokens table
create table fcm_tokens (
  user_phone text primary key references users(phone) on delete cascade,
  token text not null,
  platform text default 'web',
  last_updated timestamp with time zone default now()
);

-- Active Carts table
create table active_carts (
  user_phone text primary key references users(phone) on delete cascade,
  items jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default now()
);

-- Function to increment reel likes
create or replace function increment_reel_likes(reel_id text, diff integer)
returns void as $$
begin
  update reels
  set likes_count = likes_count + diff
  where id = reel_id;
end;
$$ language plpgsql;

-- Function to track product view
create or replace function track_product_view(p_user_phone text, p_product_id text, p_category_id text, p_weight integer)
returns void as $$
begin
  insert into user_interests (id, user_phone, categories, attention_products, updated_at)
  values (p_user_phone, p_user_phone, jsonb_build_object(p_category_id, p_weight), array[p_product_id], now())
  on conflict (id) do update 
  set categories = user_interests.categories || 
      jsonb_build_object(p_category_id, coalesce((user_interests.categories->>p_category_id)::int, 0) + p_weight),
      attention_products = (select array_agg(distinct e) from unnest(array_append(user_interests.attention_products, p_product_id)) e),
      updated_at = now();
end;
$$ language plpgsql;

-- Function to decrement product stock
create or replace function decrement_product_stock(p_id text, p_quantity integer)
returns void as $$
declare
  v_stock_details jsonb;
  v_warehouse_id text;
  v_available integer;
  v_to_deduct integer;
begin
  select stock_details into v_stock_details from products where id = p_id;
  v_to_deduct := p_quantity;
  for v_warehouse_id, v_available in select * from jsonb_each_text(v_stock_details)
  loop
    if v_to_deduct <= 0 then
      exit;
    end if;
    if v_available::int > 0 then
      if v_available::int >= v_to_deduct then
        v_stock_details := jsonb_set(v_stock_details, array[v_warehouse_id], (v_available::int - v_to_deduct)::text::jsonb);
        v_to_deduct := 0;
      else
        v_stock_details := jsonb_set(v_stock_details, array[v_warehouse_id], '0'::jsonb);
        v_to_deduct := v_to_deduct - v_available::int;
      end if;
    end if;
  end loop;
  if v_to_deduct > 0 then
    select key into v_warehouse_id from jsonb_each_text(v_stock_details) limit 1;
    if v_warehouse_id is not null then
       v_stock_details := jsonb_set(v_stock_details, array[v_warehouse_id], ((v_stock_details->>v_warehouse_id)::int - v_to_deduct)::text::jsonb);
    end if;
  end if;
  update products
  set stock = stock - p_quantity,
      sales = sales + p_quantity,
      stock_details = v_stock_details
  where id = p_id;
end;
$$ language plpgsql;

-- Function to place order atomically
create or replace function place_order(
  p_user_phone text,
  p_items jsonb,
  p_total numeric,
  p_address text,
  p_coords numeric[],
  p_status text
)
returns jsonb as $$
declare
  v_order_id text;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_stock_details jsonb;
  v_actual_stock integer;
  v_errors jsonb := '[]'::jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    select stock_details into v_stock_details from products where id = v_product_id;
    v_actual_stock := coalesce((select sum(val::int) from jsonb_each_text(v_stock_details) as t(key, val)), 0);
    if v_actual_stock < v_quantity then
      v_errors := v_errors || jsonb_build_object(
        'id', v_product_id,
        'name', v_item->>'name',
        'available', v_actual_stock
      );
    end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('success', false, 'errors', v_errors);
  end if;
  v_order_id := 'ORD-' || floor(random() * 1000000)::text;
  insert into orders (id, user_phone, items, total, address, coords, status, created_at)
  values (v_order_id, p_user_phone, p_items, p_total, p_address, p_coords, p_status, now());
  return jsonb_build_object('success', true, 'orderId', v_order_id);
end;
$$ language plpgsql;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres!');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ Tables and functions created successfully!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
