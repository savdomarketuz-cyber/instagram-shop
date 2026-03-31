CREATE TABLE IF NOT EXISTS click_transactions (
    id SERIAL PRIMARY KEY,
    click_trans_id TEXT NOT NULL UNIQUE,
    click_paydoc_id TEXT NOT NULL,
    order_id TEXT REFERENCES orders(id),
    amount NUMERIC NOT NULL,
    action INTEGER,
    error INTEGER,
    error_note TEXT,
    sign_time TEXT,
    sign_string TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
