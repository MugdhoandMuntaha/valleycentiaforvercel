-- ============================================================================
-- ABOUT CONTENT TABLE
-- Stores each section of the About page as a JSON blob.
-- ============================================================================

CREATE TABLE IF NOT EXISTS about_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE about_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "About content is publicly readable"
    ON about_content FOR SELECT
    USING (true);

-- Admin write access
CREATE POLICY "Admins can manage about content"
    ON about_content FOR ALL
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- SEED DEFAULT DATA (matches the current hardcoded About page)
-- ============================================================================

INSERT INTO about_content (section_key, content) VALUES
('hero', '{
    "badge": "About Us",
    "title": "Beauty rooted in <accent>science</accent>,<br/>driven by <accent>purpose</accent>.",
    "description": "ValleyCentia is the home of three distinct brands united by one belief: everyone deserves personal care that is honest, effective, and kind to the planet."
}'::jsonb),

('stats', '[
    {"value": "3+", "label": "Premium Brands", "icon": "Award"},
    {"value": "50+", "label": "Curated Products", "icon": "Sparkles"},
    {"value": "1M+", "label": "Happy Customers", "icon": "Heart"},
    {"value": "4.7", "label": "Avg Rating", "icon": "TrendingUp"}
]'::jsonb),

('values', '[
    {"icon": "Leaf", "title": "Clean Beauty", "text": "Every formula is free from harmful chemicals. We believe what you put on your body matters as much as what you put in it."},
    {"icon": "Shield", "title": "Science-Backed", "text": "Our R&D lab combines cutting-edge dermatological research with potent botanicals for results you can see and feel."},
    {"icon": "Users", "title": "Community First", "text": "Built with real feedback from real people. Our community of 1M+ drives every product decision we make."},
    {"icon": "Globe", "title": "Sustainable Impact", "text": "From recyclable packaging to cruelty-free testing, sustainability is not a buzzword — it is our baseline."}
]'::jsonb),

('brands', '[
    {"name": "Bare Anatomy", "tagline": "Personalized hair & skin science", "description": "India''s first personalized beauty brand. Every product is tailored to your unique hair and skin profile using our proprietary diagnostic quiz.", "color": "#c9a96e"},
    {"name": "Chemist at Play", "tagline": "Actives that actually work", "description": "Clinical-grade active ingredients at honest prices. AHAs, BHAs, Niacinamide, Retinol — formulated for real results without the premium markup.", "color": "#6ec9b0"},
    {"name": "Sun Scoop", "tagline": "Everyday sun protection, reimagined", "description": "Lightweight, invisible sunscreens that you''ll actually want to wear. No white cast, no greasiness — just broad-spectrum protection all day.", "color": "#f5c518"}
]'::jsonb),

('timeline', '[
    {"year": "2018", "event": "Bare Anatomy launches as India''s first personalized hair care brand"},
    {"year": "2020", "event": "Chemist at Play disrupts actives-based skincare with honest pricing"},
    {"year": "2021", "event": "Sun Scoop enters the market, redefining everyday sun protection"},
    {"year": "2022", "event": "Crossed 500K+ customers across all brands"},
    {"year": "2023", "event": "ValleyCentia parent brand unifies the portfolio under one roof"},
    {"year": "2024", "event": "Expanded to 50+ products with an average rating of 4.7 stars"}
]'::jsonb),

('cta', '{
    "title": "Join the ValleyCentia family",
    "description": "Whether you are shopping our products or exploring a career with us, we would love to have you.",
    "primary_btn_text": "Shop Now",
    "primary_btn_link": "/shop",
    "secondary_btn_text": "View Careers",
    "secondary_btn_link": "/careers"
}'::jsonb)

ON CONFLICT (section_key) DO NOTHING;
