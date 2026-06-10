-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                      VALLEYCENTIA — POSTGRESQL DATABASE SCHEMA             ║
-- ║                                                                            ║
-- ║  E-Commerce Platform for Beauty & Personal Care                            ║
-- ║  Brands: Bare Anatomy · Chemist at Play · Sun Scoop                        ║
-- ║                                                                            ║
-- ║  Version : 1.0.0                                                           ║
-- ║  Created : 2026-02-24                                                      ║
-- ║  Engine  : PostgreSQL 15+                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram-based text search

-- ============================================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================================

CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'in_transit',
    'delivered',
    'cancelled',
    'refunded',
    'return_requested',
    'returned'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'authorized',
    'captured',
    'failed',
    'refunded',
    'partially_refunded'
);

CREATE TYPE payment_method AS ENUM (
    'credit_card',
    'debit_card',
    'upi',
    'net_banking',
    'wallet',
    'cod',
    'emi'
);

CREATE TYPE discount_type AS ENUM (
    'percentage',
    'fixed_amount',
    'free_shipping'
);

CREATE TYPE job_status AS ENUM (
    'active',
    'paused',
    'closed',
    'filled'
);

CREATE TYPE job_type AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'internship'
);

CREATE TYPE application_status AS ENUM (
    'received',
    'screening',
    'interview',
    'offer',
    'hired',
    'rejected',
    'withdrawn'
);

CREATE TYPE badge_type AS ENUM (
    'best_seller',
    'new_launch',
    'trending',
    'selling_fast',
    'premium',
    'sale',
    'limited_edition'
);

CREATE TYPE homepage_section_type AS ENUM (
    'best_sellers',
    'new_launches',
    'power_care_duos',
    'hero_carousel',
    'brands_that_lead',
    'visible_change',
    'custom'
);


-- ============================================================================
-- 2. USERS & AUTHENTICATION
-- ============================================================================

-- Extends Supabase auth.users with application-specific profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name         VARCHAR(150),
    display_name      VARCHAR(100),
    phone             VARCHAR(20),
    avatar_url        TEXT,
    date_of_birth     DATE,
    gender            VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_phone ON public.user_profiles(phone);

COMMENT ON TABLE public.user_profiles IS 'Extended user profile data linked to Supabase auth.users';


-- ============================================================================
-- 3. ADDRESSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    label           VARCHAR(50) DEFAULT 'Home',       -- Home, Office, Other
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    address_line_1  VARCHAR(255) NOT NULL,
    address_line_2  VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(10) NOT NULL,
    country         VARCHAR(100) NOT NULL DEFAULT 'India',
    landmark        VARCHAR(255),
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON public.addresses(user_id);

COMMENT ON TABLE public.addresses IS 'User shipping and billing addresses';


-- ============================================================================
-- 4. BRANDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brands (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    tagline         VARCHAR(255),
    description     TEXT,
    logo_url        TEXT,
    accent_color    VARCHAR(7),                        -- Hex color code (#c9a96e)
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON public.brands(slug);

COMMENT ON TABLE public.brands IS 'Brand entities: Bare Anatomy, Chemist at Play, Sun Scoop';


-- ============================================================================
-- 5. CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    description     TEXT,
    image_url       TEXT,
    icon_name       VARCHAR(50),                       -- Lucide icon identifier
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

COMMENT ON TABLE public.categories IS 'Hierarchical product categories (Hair Care > Shampoo, Skin Care > Serum, etc.)';


-- ============================================================================
-- 6. PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id            UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_id         UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name                VARCHAR(300) NOT NULL,
    slug                VARCHAR(350) NOT NULL UNIQUE,
    subtitle            VARCHAR(300),                    -- "250 ml | For All Hair Types"
    short_description   TEXT,                            -- One-liner for cards
    description         TEXT,                            -- Full product description
    how_to_use          TEXT,
    ingredients         TEXT,
    base_price          NUMERIC(10,2) NOT NULL,
    compare_at_price    NUMERIC(10,2),                   -- Original / MRP price
    discount_percent    NUMERIC(5,2) DEFAULT 0,
    cost_price          NUMERIC(10,2),                   -- For internal margin tracking
    sku                 VARCHAR(50) UNIQUE,
    barcode             VARCHAR(50),
    weight_grams        INT,
    is_active           BOOLEAN DEFAULT TRUE,
    is_featured         BOOLEAN DEFAULT FALSE,
    in_stock            BOOLEAN DEFAULT TRUE,
    stock_quantity      INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    rating_avg          NUMERIC(3,2) DEFAULT 0,
    review_count        INT DEFAULT 0,
    meta_title          VARCHAR(200),
    meta_description    VARCHAR(500),
    tags                TEXT[],                           -- ARRAY of searchable tags
    concerns            TEXT[],                           -- ['dandruff', 'hair-fall', 'acne']
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_price_positive CHECK (base_price >= 0),
    CONSTRAINT chk_compare_price  CHECK (compare_at_price IS NULL OR compare_at_price >= base_price)
);

CREATE INDEX idx_products_slug       ON public.products(slug);
CREATE INDEX idx_products_brand      ON public.products(brand_id);
CREATE INDEX idx_products_category   ON public.products(category_id);
CREATE INDEX idx_products_active     ON public.products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_featured   ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_tags       ON public.products USING GIN(tags);
CREATE INDEX idx_products_concerns   ON public.products USING GIN(concerns);
CREATE INDEX idx_products_search     ON public.products USING GIN(
    (name || ' ' || COALESCE(short_description, '') || ' ' || COALESCE(subtitle, '')) gin_trgm_ops
);

COMMENT ON TABLE public.products IS 'Core product catalog with full details, pricing, and searchable attributes';


-- ============================================================================
-- 7. PRODUCT IMAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(255),
    is_primary  BOOLEAN DEFAULT FALSE,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

COMMENT ON TABLE public.product_images IS 'Multiple images per product with ordering';


-- ============================================================================
-- 8. PRODUCT SIZES / VARIANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_sizes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label           VARCHAR(50) NOT NULL,               -- "250 ml", "100 ml"
    ml_value        VARCHAR(20),                        -- "250ml" (for sorting)
    price           NUMERIC(10,2) NOT NULL,
    sku_suffix      VARCHAR(20),
    stock_quantity  INT DEFAULT 0,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_sizes_product ON public.product_sizes(product_id);

COMMENT ON TABLE public.product_sizes IS 'Size variants for products (100ml, 250ml, 500ml, etc.)';


-- ============================================================================
-- 9. PRODUCT KEY BENEFITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_key_benefits (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    icon_name   VARCHAR(50) NOT NULL,                   -- Lucide icon name
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    sort_order  INT DEFAULT 0
);

CREATE INDEX idx_product_benefits_product ON public.product_key_benefits(product_id);

COMMENT ON TABLE public.product_key_benefits IS 'Key benefit tiles displayed on product detail pages';


-- ============================================================================
-- 10. PRODUCT HIGHLIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_highlights (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    highlight   VARCHAR(255) NOT NULL,
    sort_order  INT DEFAULT 0
);

CREATE INDEX idx_product_highlights_product ON public.product_highlights(product_id);

COMMENT ON TABLE public.product_highlights IS 'Bullet-point highlights for product cards and detail pages';


-- ============================================================================
-- 11. PRODUCT BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    badge           badge_type NOT NULL,
    custom_label    VARCHAR(100),                        -- Override display text
    badge_color     VARCHAR(7),                          -- Custom hex color
    is_primary      BOOLEAN DEFAULT TRUE,               -- Primary badge vs extra badge
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_badges_product ON public.product_badges(product_id);

COMMENT ON TABLE public.product_badges IS 'Promotional badges (Best Seller, New Launch, Trending, etc.)';


-- ============================================================================
-- 12. COUPONS & PROMOTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    description         VARCHAR(255),
    discount_type       discount_type NOT NULL,
    discount_value      NUMERIC(10,2) NOT NULL,          -- % or flat amount
    minimum_order_value NUMERIC(10,2) DEFAULT 0,
    max_discount_amount NUMERIC(10,2),                   -- Cap for % discounts
    usage_limit         INT,                             -- Total redemptions allowed
    usage_count         INT DEFAULT 0,
    per_user_limit      INT DEFAULT 1,
    is_active           BOOLEAN DEFAULT TRUE,
    starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    applicable_brands   UUID[],                          -- NULL = all brands
    applicable_categories UUID[],                        -- NULL = all categories
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_coupons_code ON public.coupons(UPPER(code));

COMMENT ON TABLE public.coupons IS 'Discount coupons (FLAT20, VALLEY20, FLAT35, etc.)';


-- ============================================================================
-- 13. PRODUCT–COUPON ASSOCIATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_coupons (
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    coupon_id       UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    coupon_price    NUMERIC(10,2),                       -- Pre-computed price after coupon
    PRIMARY KEY (product_id, coupon_id)
);

COMMENT ON TABLE public.product_coupons IS 'Maps which coupons are showcased on which products';


-- ============================================================================
-- 14. SHOPPING CART
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_id         UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 10),
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, product_id, size_id)
);

CREATE INDEX idx_cart_user ON public.cart_items(user_id);

COMMENT ON TABLE public.cart_items IS 'Server-side cart persistence (syncs with client localStorage)';


-- ============================================================================
-- 15. WISHLISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON public.wishlist_items(user_id);

COMMENT ON TABLE public.wishlist_items IS 'User wishlist / saved products';


-- ============================================================================
-- 16. ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        VARCHAR(20) NOT NULL UNIQUE,     -- "VC-10234"
    user_id             UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    status              order_status NOT NULL DEFAULT 'pending',
    payment_status      payment_status NOT NULL DEFAULT 'pending',
    payment_method      payment_method,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) DEFAULT 0,
    shipping_fee        NUMERIC(10,2) DEFAULT 0,
    tax_amount          NUMERIC(10,2) DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    coupon_id           UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code         VARCHAR(50),
    currency            VARCHAR(3) DEFAULT 'INR',

    -- Shipping address snapshot
    shipping_name       VARCHAR(150),
    shipping_phone      VARCHAR(20),
    shipping_address_1  VARCHAR(255),
    shipping_address_2  VARCHAR(255),
    shipping_city       VARCHAR(100),
    shipping_state      VARCHAR(100),
    shipping_postal     VARCHAR(10),
    shipping_country    VARCHAR(100) DEFAULT 'India',

    -- Billing address snapshot
    billing_name        VARCHAR(150),
    billing_phone       VARCHAR(20),
    billing_address_1   VARCHAR(255),
    billing_address_2   VARCHAR(255),
    billing_city        VARCHAR(100),
    billing_state       VARCHAR(100),
    billing_postal      VARCHAR(10),
    billing_country     VARCHAR(100) DEFAULT 'India',

    notes               TEXT,
    tracking_number     VARCHAR(100),
    tracking_url        TEXT,
    estimated_delivery  DATE,
    delivered_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user       ON public.orders(user_id);
CREATE INDEX idx_orders_number     ON public.orders(order_number);
CREATE INDEX idx_orders_status     ON public.orders(status);
CREATE INDEX idx_orders_created    ON public.orders(created_at DESC);

COMMENT ON TABLE public.orders IS 'Customer orders with full address snapshots and payment details';


-- ============================================================================
-- 17. ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    size_id         UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,

    -- Snapshot at time of purchase
    product_name    VARCHAR(300) NOT NULL,
    product_image   TEXT,
    size_label      VARCHAR(50),
    unit_price      NUMERIC(10,2) NOT NULL,
    original_price  NUMERIC(10,2),
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    line_total      NUMERIC(12,2) NOT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

COMMENT ON TABLE public.order_items IS 'Individual line items within an order with price snapshots';


-- ============================================================================
-- 18. ORDER STATUS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status      order_status NOT NULL,
    note        TEXT,
    changed_by  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON public.order_status_history(order_id);

COMMENT ON TABLE public.order_status_history IS 'Audit trail for order status transitions';


-- ============================================================================
-- 19. REVIEWS & RATINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_item_id   UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
    rating          SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title           VARCHAR(200),
    body            TEXT,
    is_verified      BOOLEAN DEFAULT FALSE,              -- Verified purchase
    is_approved     BOOLEAN DEFAULT FALSE,               -- Moderation flag
    helpful_count   INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (product_id, user_id, order_item_id)
);

CREATE INDEX idx_reviews_product  ON public.reviews(product_id);
CREATE INDEX idx_reviews_user     ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating   ON public.reviews(product_id, rating);

COMMENT ON TABLE public.reviews IS 'Product reviews with moderation and verified purchase tracking';


-- ============================================================================
-- 20. REVIEW IMAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.review_images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id   UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(255),
    sort_order  INT DEFAULT 0
);

CREATE INDEX idx_review_images_review ON public.review_images(review_id);


-- ============================================================================
-- 21. HOMEPAGE SECTIONS (CMS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_type    homepage_section_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    subtitle        VARCHAR(500),
    badge_text      VARCHAR(50),                         -- "🔥 Most Loved" etc.
    cta_text        VARCHAR(100),
    cta_link        VARCHAR(255),
    background_color VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homepage_sections_active ON public.homepage_sections(is_active, sort_order);

COMMENT ON TABLE public.homepage_sections IS 'Configurable homepage sections (Best Sellers, New Launches, etc.)';


-- ============================================================================
-- 22. HOMEPAGE SECTION PRODUCTS (MANY-TO-MANY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.homepage_section_products (
    section_id  UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sort_order  INT DEFAULT 0,
    custom_badge_text  VARCHAR(100),                     -- Section-specific badge override
    custom_badge_color VARCHAR(7),
    PRIMARY KEY (section_id, product_id)
);

COMMENT ON TABLE public.homepage_section_products IS 'Products assigned to homepage carousel sections';


-- ============================================================================
-- 23. HERO CAROUSEL SLIDES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hero_slides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(200) NOT NULL,
    subtitle        TEXT,
    cta_text        VARCHAR(100),
    cta_link        VARCHAR(255),
    image_url       TEXT NOT NULL,
    image_alt       VARCHAR(255),
    background_color VARCHAR(50),
    text_color      VARCHAR(50) DEFAULT '#ffffff',
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hero_slides_active ON public.hero_slides(is_active, sort_order);

COMMENT ON TABLE public.hero_slides IS 'Hero banner carousel slides on homepage';


-- ============================================================================
-- 24. TRUST BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trust_badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icon_name   VARCHAR(50) NOT NULL,                   -- Lucide icon name
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INT DEFAULT 0
);

COMMENT ON TABLE public.trust_badges IS 'Trust badges (Free Shipping, Secure Payment, Easy Returns, etc.)';


-- ============================================================================
-- 25. NEWSLETTER SUBSCRIBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(150),
    is_subscribed   BOOLEAN DEFAULT TRUE,
    subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    source          VARCHAR(50) DEFAULT 'footer'         -- footer, popup, checkout
);

CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);

COMMENT ON TABLE public.newsletter_subscribers IS 'Email newsletter subscription list';


-- ============================================================================
-- 26. CAREERS — DEPARTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    icon_name   VARCHAR(50),                             -- Lucide icon name
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.departments IS 'Company departments for career listings';


-- ============================================================================
-- 27. CAREERS — JOB LISTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_listings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id       UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    slug                VARCHAR(250) NOT NULL UNIQUE,
    description         TEXT NOT NULL,
    responsibilities    TEXT[] NOT NULL,                  -- Array of bullet points
    requirements        TEXT[] NOT NULL,                  -- Array of bullet points
    nice_to_haves       TEXT[],
    location            VARCHAR(150) NOT NULL,
    job_type            job_type NOT NULL DEFAULT 'full_time',
    experience_range    VARCHAR(50),                      -- "2–5 years"
    salary_min          NUMERIC(12,2),
    salary_max          NUMERIC(12,2),
    salary_currency     VARCHAR(3) DEFAULT 'INR',
    is_salary_visible   BOOLEAN DEFAULT FALSE,
    status              job_status NOT NULL DEFAULT 'active',
    apply_email         VARCHAR(255) DEFAULT 'careers@valleycentia.com',
    apply_url           TEXT,
    published_at        TIMESTAMPTZ,
    closes_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_department ON public.job_listings(department_id);
CREATE INDEX idx_jobs_status     ON public.job_listings(status) WHERE status = 'active';
CREATE INDEX idx_jobs_slug       ON public.job_listings(slug);

COMMENT ON TABLE public.job_listings IS 'Career openings with full detail and requirements';


-- ============================================================================
-- 28. CAREERS — JOB APPLICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
    applicant_name  VARCHAR(150) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(20),
    resume_url      TEXT,
    cover_letter    TEXT,
    linkedin_url    TEXT,
    portfolio_url   TEXT,
    status          application_status NOT NULL DEFAULT 'received',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_job    ON public.job_applications(job_id);
CREATE INDEX idx_applications_email  ON public.job_applications(applicant_email);

COMMENT ON TABLE public.job_applications IS 'Applications submitted for open positions';


-- ============================================================================
-- 29. COMPANY TIMELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_timeline (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year        VARCHAR(4) NOT NULL,
    event       TEXT NOT NULL,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.company_timeline IS 'About page journey/milestone timeline';


-- ============================================================================
-- 30. COMPANY VALUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_values (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icon_name   VARCHAR(50) NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.company_values IS 'Core values displayed on the About page';


-- ============================================================================
-- 31. PERKS & BENEFITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.perks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icon_name   VARCHAR(50) NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.perks IS 'Employee perks displayed on the Careers page';


-- ============================================================================
-- 32. SITE SETTINGS (KEY-VALUE CONFIG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    description VARCHAR(255),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_settings IS 'Global site configuration (free shipping threshold, contact info, etc.)';


-- ============================================================================
-- 33. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL,
    record_id   UUID NOT NULL,
    action      VARCHAR(10) NOT NULL,                    -- INSERT, UPDATE, DELETE
    old_data    JSONB,
    new_data    JSONB,
    performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table    ON public.audit_log(table_name);
CREATE INDEX idx_audit_record   ON public.audit_log(record_id);
CREATE INDEX idx_audit_time     ON public.audit_log(performed_at DESC);

COMMENT ON TABLE public.audit_log IS 'System-wide audit trail for critical data changes';


-- ============================================================================
-- 34. HELPER FUNCTIONS
-- ============================================================================

-- Auto-update `updated_at` timestamp on row modification
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Auto-generate order number in format VC-XXXXX
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INT)), 10000) + 1
    INTO next_num
    FROM public.orders;

    NEW.order_number = 'VC-' || LPAD(next_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Recalculate product rating_avg and review_count
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET
        rating_avg   = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = TRUE), 0),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = TRUE),
        updated_at   = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 35. TRIGGERS
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles   FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.addresses        FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.brands           FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories       FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products         FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.coupons          FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders           FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reviews          FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hero_slides      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.job_listings     FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cart_items       FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Auto-generate order number
CREATE TRIGGER trg_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION public.generate_order_number();

-- Auto-update product ratings on review changes
CREATE TRIGGER trg_update_rating_insert AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();
CREATE TRIGGER trg_update_rating_update AFTER UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();
CREATE TRIGGER trg_update_rating_delete AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();


-- ============================================================================
-- 36. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"     ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"   ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"   ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- addresses: users manage their own addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- cart_items: users manage their own cart
CREATE POLICY "Users can manage own cart"      ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- wishlist_items: users manage their own wishlist
CREATE POLICY "Users can manage own wishlist"  ON public.wishlist_items FOR ALL USING (auth.uid() = user_id);

-- orders: users can view their own orders
CREATE POLICY "Users can view own orders"      ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders"    ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- order_items: users can view items from their own orders
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- reviews: anyone can read approved reviews; users can manage their own
CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Users can manage own reviews"     ON public.reviews FOR ALL USING (auth.uid() = user_id);

-- Public read access for catalog tables (no RLS needed, use grant)
GRANT SELECT ON public.products              TO anon, authenticated;
GRANT SELECT ON public.product_images        TO anon, authenticated;
GRANT SELECT ON public.product_sizes         TO anon, authenticated;
GRANT SELECT ON public.product_key_benefits  TO anon, authenticated;
GRANT SELECT ON public.product_highlights    TO anon, authenticated;
GRANT SELECT ON public.product_badges        TO anon, authenticated;
GRANT SELECT ON public.brands               TO anon, authenticated;
GRANT SELECT ON public.categories            TO anon, authenticated;
GRANT SELECT ON public.coupons              TO anon, authenticated;
GRANT SELECT ON public.homepage_sections     TO anon, authenticated;
GRANT SELECT ON public.homepage_section_products TO anon, authenticated;
GRANT SELECT ON public.hero_slides           TO anon, authenticated;
GRANT SELECT ON public.trust_badges          TO anon, authenticated;
GRANT SELECT ON public.departments           TO anon, authenticated;
GRANT SELECT ON public.job_listings          TO anon, authenticated;
GRANT SELECT ON public.company_timeline      TO anon, authenticated;
GRANT SELECT ON public.company_values        TO anon, authenticated;
GRANT SELECT ON public.perks                TO anon, authenticated;
GRANT SELECT ON public.site_settings         TO anon, authenticated;


-- ============================================================================
-- 37. SEED DATA
-- ============================================================================

-- Brands
INSERT INTO public.brands (name, slug, tagline, description, accent_color) VALUES
    ('Bare Anatomy',      'bare-anatomy',      'Personalized hair & skin science',           'India''s first personalized beauty brand. Every product is tailored to your unique hair and skin profile.', '#c9a96e'),
    ('Chemist at Play',   'chemist-at-play',   'Actives that actually work',                 'Clinical-grade active ingredients at honest prices. AHAs, BHAs, Niacinamide, Retinol.', '#6ec9b0'),
    ('Sun Scoop',         'sun-scoop',         'Everyday sun protection, reimagined',        'Lightweight, invisible sunscreens that you''ll actually want to wear.', '#f5c518');

-- Top-level categories
INSERT INTO public.categories (name, slug, description, icon_name) VALUES
    ('Hair Care',    'hair-care',    'Everything your hair needs',     'Scissors'),
    ('Face Care',    'face-care',    'Glow from within',               'Sparkles'),
    ('Body Care',    'body-care',    'Nourish your skin head to toe',  'Heart'),
    ('Sun Care',     'sun-care',     'Shield your skin every day',     'Sun');

-- Sub-categories (Hair Care)
INSERT INTO public.categories (parent_id, name, slug, description)
SELECT id, sub.name, sub.slug, sub."desc"
FROM public.categories AS c,
(VALUES
    ('Shampoo',     'shampoo',     'Cleanse and nourish'),
    ('Conditioner', 'conditioner', 'Smooth and hydrate'),
    ('Hair Oil',    'hair-oil',    'Deep nourishment'),
    ('Hair Serum',  'hair-serum',  'Repair and protect'),
    ('Hair Mask',   'hair-mask',   'Intensive treatment')
) AS sub(name, slug, "desc")
WHERE c.slug = 'hair-care';

-- Sub-categories (Face Care)
INSERT INTO public.categories (parent_id, name, slug, description)
SELECT id, sub.name, sub.slug, sub."desc"
FROM public.categories AS c,
(VALUES
    ('Face Wash',   'face-wash',   'Gentle daily cleansing'),
    ('Moisturizer', 'moisturizer', 'Hydrate and protect'),
    ('Serum',       'serum',       'Targeted treatment'),
    ('Toner',       'toner',       'Balance and prep'),
    ('Face Mask',   'face-mask',   'Weekly pampering')
) AS sub(name, slug, "desc")
WHERE c.slug = 'face-care';

-- Sub-categories (Sun Care)
INSERT INTO public.categories (parent_id, name, slug, description)
SELECT id, sub.name, sub.slug, sub."desc"
FROM public.categories AS c,
(VALUES
    ('Sunscreen',       'sunscreen',       'Broad spectrum SPF protection'),
    ('After Sun',       'after-sun',       'Soothe and repair'),
    ('SPF Moisturizer', 'spf-moisturizer', 'Moisturize with protection'),
    ('Lip SPF',         'lip-spf',         'Protect your lips')
) AS sub(name, slug, "desc")
WHERE c.slug = 'sun-care';

-- Departments (for careers)
INSERT INTO public.departments (name, slug, icon_name, sort_order) VALUES
    ('R&D',         'r-and-d',     'FlaskConical', 1),
    ('Design',      'design',      'Palette',      2),
    ('Marketing',   'marketing',   'Megaphone',    3),
    ('CX',          'cx',          'Headphones',   4),
    ('Engineering', 'engineering', 'Code',         5),
    ('Analytics',   'analytics',   'BarChart3',    6);

-- Coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, minimum_order_value) VALUES
    ('FLAT20',   '20% off on your order',   'percentage',   20, 0),
    ('VALLEY20', '৳20 off on your order',   'fixed_amount', 20, 0),
    ('FLAT25',   '25% off on combo packs',  'percentage',   25, 500),
    ('FLAT35',   '35% off on duo combos',   'percentage',   35, 700);

-- Trust badges
INSERT INTO public.trust_badges (icon_name, label, description, sort_order) VALUES
    ('Truck',       'Free Shipping',    'On orders over ৳499',       1),
    ('ShieldCheck', 'Secure Payment',   '256-bit SSL encryption',    2),
    ('RotateCcw',   'Easy Returns',     '30-day return policy',      3),
    ('Headphones',  '24/7 Support',     'Always here to help',       4);

-- Company timeline
INSERT INTO public.company_timeline (year, event, sort_order) VALUES
    ('2018', 'Bare Anatomy launches as India''s first personalized hair care brand', 1),
    ('2020', 'Chemist at Play disrupts actives-based skincare with honest pricing',  2),
    ('2021', 'Sun Scoop enters the market, redefining everyday sun protection',      3),
    ('2022', 'Crossed 500K+ customers across all brands',                            4),
    ('2023', 'ValleyCentia parent brand unifies the portfolio under one roof',        5),
    ('2024', 'Expanded to 50+ products with an average rating of 4.7 stars',         6);

-- Company values
INSERT INTO public.company_values (icon_name, title, description, sort_order) VALUES
    ('Leaf',   'Clean Beauty',     'Every formula is free from harmful chemicals.', 1),
    ('Shield', 'Science-Backed',   'Cutting-edge dermatological research with potent botanicals.', 2),
    ('Users',  'Community First',  'Built with real feedback from real people.', 3),
    ('Globe',  'Sustainable Impact','From recyclable packaging to cruelty-free testing.', 4);

-- Perks
INSERT INTO public.perks (icon_name, title, description, sort_order) VALUES
    ('Heart',    'Health & Wellness', 'Comprehensive medical insurance, mental health support, and wellness stipends', 1),
    ('Zap',      'Flexible Work',     'Hybrid model — work from home 2 days a week with flexible hours', 2),
    ('BookOpen', 'Learning Budget',   '৳50,000/year for courses, conferences, and professional development', 3),
    ('Coffee',   'Free Products',     'Monthly hampers from Bare Anatomy, Chemist at Play, and Sun Scoop', 4),
    ('Sparkles', 'Growth Path',       'Clear promotion ladders and quarterly performance reviews', 5),
    ('BarChart3','ESOPs',             'Stock options for key roles — grow as the company grows', 6);

-- Site settings
INSERT INTO public.site_settings (key, value, description) VALUES
    ('free_shipping_threshold', '{"amount": 499, "currency": "INR"}', 'Minimum order value for free shipping'),
    ('shipping_fee',            '{"amount": 49,  "currency": "INR"}', 'Standard shipping fee when threshold not met'),
    ('max_cart_quantity',        '{"value": 10}',                      'Maximum quantity per item in cart'),
    ('contact_email',           '{"value": "support@valleycentia.com"}', 'Customer support email'),
    ('careers_email',           '{"value": "careers@valleycentia.com"}', 'Careers application email');

-- Hero slide
INSERT INTO public.hero_slides (title, subtitle, cta_text, cta_link, image_url, sort_order) VALUES
    ('Elevate Your Style', 'Discover curated collections of premium accessories and fashion essentials.', 'Shop Collection', '/shop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80', 1);

-- Homepage sections
INSERT INTO public.homepage_sections (section_type, title, subtitle, badge_text, sort_order) VALUES
    ('best_sellers',      'Best Sellers Across Brands',                'The most-loved essentials, all in one place',            '🔥 Most Loved',  1),
    ('new_launches',      'New Launches',                              'New formulas to love every day',                          '✨ Just Dropped', 2),
    ('power_care_duos',   'Power Care Duos',                           'Essentials that work from root to glow',                  '💪 Power Pairs', 3),
    ('brands_that_lead',  'Brands That Lead. Ingredients That Deliver.','Explore our portfolio of science-backed brands',          NULL,             4);


-- ============================================================================
-- 38. USEFUL VIEWS
-- ============================================================================

-- Full product card view (used for listing pages)
CREATE OR REPLACE VIEW public.v_product_cards AS
SELECT
    p.id,
    p.slug,
    p.name,
    p.subtitle,
    p.short_description,
    p.base_price,
    p.compare_at_price,
    p.discount_percent,
    p.rating_avg,
    p.review_count,
    p.in_stock,
    p.is_featured,
    p.concerns,
    p.tags,
    b.name   AS brand_name,
    b.slug   AS brand_slug,
    c.name   AS category_name,
    c.slug   AS category_slug,
    pi.url   AS primary_image_url,
    (SELECT json_agg(json_build_object('badge', pb.badge, 'label', pb.custom_label, 'color', pb.badge_color))
     FROM public.product_badges pb WHERE pb.product_id = p.id) AS badges
FROM public.products p
LEFT JOIN public.brands b     ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
WHERE p.is_active = TRUE;

-- Full product detail view (used for PDP)
CREATE OR REPLACE VIEW public.v_product_detail AS
SELECT
    p.*,
    b.name   AS brand_name,
    b.slug   AS brand_slug,
    c.name   AS category_name,
    c.slug   AS category_slug,
    (SELECT json_agg(json_build_object('url', pi2.url, 'alt', pi2.alt_text) ORDER BY pi2.sort_order)
     FROM public.product_images pi2 WHERE pi2.product_id = p.id) AS images,
    (SELECT json_agg(json_build_object('id', ps.id, 'label', ps.label, 'ml', ps.ml_value, 'price', ps.price, 'is_default', ps.is_default) ORDER BY ps.sort_order)
     FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.is_active = TRUE) AS sizes,
    (SELECT json_agg(json_build_object('icon', kb.icon_name, 'title', kb.title, 'desc', kb.description) ORDER BY kb.sort_order)
     FROM public.product_key_benefits kb WHERE kb.product_id = p.id) AS key_benefits,
    (SELECT json_agg(ph.highlight ORDER BY ph.sort_order)
     FROM public.product_highlights ph WHERE ph.product_id = p.id) AS highlights
FROM public.products p
LEFT JOIN public.brands b     ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id;

-- Order summary view
CREATE OR REPLACE VIEW public.v_order_summary AS
SELECT
    o.id,
    o.order_number,
    o.user_id,
    o.status,
    o.payment_status,
    o.total_amount,
    o.currency,
    o.created_at,
    o.delivered_at,
    (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_count,
    (SELECT json_agg(json_build_object('name', oi2.product_name, 'image', oi2.product_image, 'qty', oi2.quantity, 'price', oi2.unit_price))
     FROM public.order_items oi2 WHERE oi2.order_id = o.id) AS items
FROM public.orders o;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SCHEMA COMPLETE — Ready for Supabase deployment                           ║
-- ║                                                                            ║
-- ║  To deploy: Run this SQL in Supabase SQL Editor or via migration            ║
-- ║  Total tables : 33                                                          ║
-- ║  Total views  : 3                                                           ║
-- ║  Total funcs  : 3                                                           ║
-- ║  Total triggers: 16                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
