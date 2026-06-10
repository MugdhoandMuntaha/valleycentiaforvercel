-- ============================================================================
-- VALLEYCENTIA — MOCK PRODUCT GENERATOR (100+ PRODUCTS)
-- Run in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
    -- Brands
    v_bare_anatomy UUID;
    v_chemist UUID;
    v_sun_scoop UUID;
    
    -- Categories
    v_shampoo UUID;
    v_serum UUID;
    v_sunscreen UUID;
    v_moisturizer UUID;
    v_face_wash UUID;
    v_body_care UUID;
    v_hair_oil UUID;
    v_hair_serum UUID;
    
    -- Sections
    s_best UUID;
    s_new UUID;
    s_power UUID;

    -- Local loop variables
    i INT;
    b_id UUID;
    c_id UUID;
    p_id UUID;
    
    v_name TEXT;
    v_slug TEXT;
    v_price NUMERIC;
    v_comp_price NUMERIC;
    
    -- Data Arrays for variety
    adj TEXT[] := ARRAY['Nourishing', 'Advanced', 'Ultra', 'Daily', 'Revitalizing', 'Deep', 'Smooth', 'Radiant', 'Hydrating', 'Expert', 'Pro-Active', 'Intense', 'Silk', 'Clear', 'Pure'];
    noun TEXT[] := ARRAY['Solution', 'Formula', 'Bliss', 'Care', 'Therapy', 'Essence', 'Complex', 'Glow', 'Repair', 'Protect', 'Moisture', 'Serum', 'Wash', 'Mist', 'Shield'];
    v_suffixes TEXT[] := ARRAY['100 ml', '250 ml', '500 ml', '50 g', '100 g', '20 ml', '30 ml'];
    
    -- Image placeholders
    v_images TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
        'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80',
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80',
        'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80',
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80',
        'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80',
        'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=800&q=80'
    ];

BEGIN
    -- Fetch Brand IDs
    SELECT id INTO v_bare_anatomy FROM public.brands WHERE slug='bare-anatomy';
    SELECT id INTO v_chemist FROM public.brands WHERE slug='chemist-at-play';
    SELECT id INTO v_sun_scoop FROM public.brands WHERE slug='sun-scoop';
    
    -- Fetch Category IDs
    SELECT id INTO v_shampoo FROM public.categories WHERE slug='shampoo';
    SELECT id INTO v_serum FROM public.categories WHERE slug='serum';
    SELECT id INTO v_sunscreen FROM public.categories WHERE slug='sunscreen';
    SELECT id INTO v_moisturizer FROM public.categories WHERE slug='moisturizer';
    SELECT id INTO v_face_wash FROM public.categories WHERE slug='face-wash';
    SELECT id INTO v_body_care FROM public.categories WHERE slug='body-care';
    SELECT id INTO v_hair_oil FROM public.categories WHERE slug='hair-oil';
    SELECT id INTO v_hair_serum FROM public.categories WHERE slug='hair-serum';

    -- Fetch Section IDs
    SELECT id INTO s_best FROM public.homepage_sections WHERE section_type='best_sellers';
    SELECT id INTO s_new FROM public.homepage_sections WHERE section_type='new_launches';
    SELECT id INTO s_power FROM public.homepage_sections WHERE section_type='power_care_duos';

    -- Start Generation Loop (105 products)
    FOR i IN 1..105 LOOP
        -- Distribute brands
        IF i <= 35 THEN b_id := v_bare_anatomy;
        ELSIF i <= 70 THEN b_id := v_chemist;
        ELSE b_id := v_sun_scoop;
        END IF;

        -- Pick category based on brand focus
        IF b_id = v_bare_anatomy THEN
            CASE floor(random() * 4)::INT
                WHEN 0 THEN c_id := v_shampoo;
                WHEN 1 THEN c_id := v_hair_oil;
                WHEN 2 THEN c_id := v_hair_serum;
                ELSE c_id := v_moisturizer;
            END CASE;
        ELSIF b_id = v_chemist THEN
            CASE floor(random() * 4)::INT
                WHEN 0 THEN c_id := v_serum;
                WHEN 1 THEN c_id := v_face_wash;
                WHEN 2 THEN c_id := v_body_care;
                ELSE c_id := v_moisturizer;
            END CASE;
        ELSE
            CASE floor(random() * 2)::INT
                WHEN 0 THEN c_id := v_sunscreen;
                ELSE c_id := v_moisturizer;
            END CASE;
        END IF;

        -- Generate random pricing
        v_price := floor(199 + (random() * 800));
        v_comp_price := v_price + floor(50 + (random() * 200));
        
        -- Generate name and slug
        v_name := adj[1 + floor(random() * array_length(adj, 1))::INT] || ' ' || 
                 noun[1 + floor(random() * array_length(noun, 1))::INT] || ' ' || 
                 (CASE WHEN i % 2 = 0 THEN 'X-' ELSE 'Plus-' END) || i;
        v_slug := lower(replace(v_name, ' ', '-'));

        -- 1. Insert Product
        INSERT INTO public.products (
            brand_id, category_id, name, slug, subtitle, 
            short_description, description, base_price, 
            compare_at_price, discount_percent, sku, 
            stock_quantity, rating_avg, review_count, 
            tags, concerns, is_active, is_featured
        ) VALUES (
            b_id, c_id, v_name, v_slug,
            v_suffixes[1 + floor(random() * array_length(v_suffixes, 1))::INT] || ' | For Better Results',
            'Clinically tested formula for visible results. Effective and gentle for daily use.',
            'This mock product is generated for testing the Valleycentia platform. It features a advanced ' || v_name || ' formula designed to improve your daily routine. Contains high-quality ingredients sourced from natural extracts.',
            v_price, v_comp_price, floor(((v_comp_price - v_price)/v_comp_price) * 100),
            'MK-' || i || '-' || floor(random()*1000),
            50 + floor(random() * 450),
            4.0 + (random() * 1.0),
            50 + floor(random() * 5000),
            ARRAY['mock', 'testing', lower(adj[1 + floor(random()*5)::INT])],
            CASE WHEN i % 3 = 0 THEN ARRAY['dryness', 'acne'] ELSE ARRAY['sun-protection'] END,
            TRUE,
            (random() > 0.8)
        ) RETURNING id INTO p_id;

        -- 2. Insert Images (Primary + 1 Gallery)
        INSERT INTO public.product_images (product_id, url, alt_text, is_primary, sort_order)
        VALUES (p_id, v_images[1 + floor(random() * array_length(v_images, 1))::INT], v_name, TRUE, 1);
        
        INSERT INTO public.product_images (product_id, url, alt_text, is_primary, sort_order)
        VALUES (p_id, v_images[1 + floor(random() * array_length(v_images, 1))::INT], v_name || ' texture', FALSE, 2);

        -- 3. Insert Default Size
        INSERT INTO public.product_sizes (product_id, label, ml_value, price, compare_at_price, is_default, sort_order)
        VALUES (p_id, 'Standard', '100ml', v_price, v_comp_price, TRUE, 1);

        -- 4. Insert Highlights
        INSERT INTO public.product_highlights (product_id, highlight, sort_order) VALUES
        (p_id, 'Dermatologically Tested', 1),
        (p_id, 'No Harsh Chemicals', 2),
        (p_id, 'Visible Results in 4 weeks', 3);

        -- 5. Randomly Add to Homepage Sections (approx 10 products per section)
        IF random() < 0.1 THEN
            INSERT INTO public.homepage_section_products (section_id, product_id, sort_order)
            VALUES (s_best, p_id, i) ON CONFLICT DO NOTHING;
        END IF;

        IF random() < 0.1 THEN
            INSERT INTO public.homepage_section_products (section_id, product_id, sort_order)
            VALUES (s_new, p_id, i) ON CONFLICT DO NOTHING;
        END IF;

    END LOOP;

    RAISE NOTICE '105 Mock Products Generated Successfully!';
END $$;
