-- ============================================================================
-- ORDERS & ORDER ITEMS
-- Uses existing enums: order_status, payment_status, payment_method
-- ============================================================================

-- Drop existing tables if they exist (order matters due to FK)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,

    -- Address snapshot (denormalized so order survives address deletion)
    shipping_name TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_address_line_1 TEXT NOT NULL,
    shipping_address_line_2 TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_postal_code TEXT NOT NULL,
    shipping_country TEXT NOT NULL DEFAULT 'India',

    -- Totals
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Status
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,

    -- SSLCommerz fields
    transaction_id TEXT,
    ssl_session_key TEXT,
    ssl_val_id TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    product_image TEXT,
    product_slug TEXT,
    size TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- Service role / API can insert orders
CREATE POLICY "Service can insert orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role / API can update orders
CREATE POLICY "Service can update orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can read their own order items
CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    );

-- Insert order items
CREATE POLICY "Service can insert order items"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    );

-- Admin read all
CREATE POLICY "Admins can read all orders"
    ON orders FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all orders"
    ON orders FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can read all order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );
