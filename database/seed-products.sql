-- ============================================================================
-- VALLEYCENTIA — PRODUCT SEED DATA
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PRODUCTS
-- ============================================================================

-- Get brand/category IDs into variables via CTEs
DO $$
DECLARE
    v_bare_anatomy UUID;
    v_chemist UUID;
    v_sun_scoop UUID;
    v_hair_care UUID;
    v_face_care UUID;
    v_body_care UUID;
    v_sun_care UUID;
    v_shampoo UUID;
    v_conditioner UUID;
    v_hair_oil UUID;
    v_hair_serum UUID;
    v_hair_mask UUID;
    v_face_wash UUID;
    v_moisturizer UUID;
    v_serum UUID;
    v_sunscreen UUID;
    -- product IDs
    p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID;
    p6 UUID; p7 UUID; p8 UUID; p9 UUID; p10 UUID;
    p11 UUID; p12 UUID; p13 UUID; p14 UUID; p15 UUID;
    -- homepage section IDs
    s_best UUID; s_new UUID; s_power UUID;
    -- coupon IDs
    c_flat20 UUID; c_valley20 UUID; c_flat25 UUID; c_flat35 UUID;
BEGIN
    -- Fetch brand IDs
    SELECT id INTO v_bare_anatomy FROM public.brands WHERE slug='bare-anatomy';
    SELECT id INTO v_chemist FROM public.brands WHERE slug='chemist-at-play';
    SELECT id INTO v_sun_scoop FROM public.brands WHERE slug='sun-scoop';

    -- Fetch category IDs
    SELECT id INTO v_hair_care FROM public.categories WHERE slug='hair-care';
    SELECT id INTO v_face_care FROM public.categories WHERE slug='face-care';
    SELECT id INTO v_body_care FROM public.categories WHERE slug='body-care';
    SELECT id INTO v_sun_care FROM public.categories WHERE slug='sun-care';
    SELECT id INTO v_shampoo FROM public.categories WHERE slug='shampoo';
    SELECT id INTO v_conditioner FROM public.categories WHERE slug='conditioner';
    SELECT id INTO v_hair_oil FROM public.categories WHERE slug='hair-oil';
    SELECT id INTO v_hair_serum FROM public.categories WHERE slug='hair-serum';
    SELECT id INTO v_hair_mask FROM public.categories WHERE slug='hair-mask';
    SELECT id INTO v_face_wash FROM public.categories WHERE slug='face-wash';
    SELECT id INTO v_moisturizer FROM public.categories WHERE slug='moisturizer';
    SELECT id INTO v_serum FROM public.categories WHERE slug='serum';
    SELECT id INTO v_sunscreen FROM public.categories WHERE slug='sunscreen';

    -- Fetch coupon IDs
    SELECT id INTO c_flat20 FROM public.coupons WHERE code='FLAT20';
    SELECT id INTO c_valley20 FROM public.coupons WHERE code='VALLEY20';
    SELECT id INTO c_flat25 FROM public.coupons WHERE code='FLAT25';
    SELECT id INTO c_flat35 FROM public.coupons WHERE code='FLAT35';

    -- Fetch homepage section IDs
    SELECT id INTO s_best FROM public.homepage_sections WHERE section_type='best_sellers';
    SELECT id INTO s_new FROM public.homepage_sections WHERE section_type='new_launches';
    SELECT id INTO s_power FROM public.homepage_sections WHERE section_type='power_care_duos';

    -- ── P1: Anti Dandruff Shampoo ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_shampoo,'Anti Dandruff Shampoo with Salicylic Acid & Biotin - 250 ml','anti-dandruff-shampoo','250 ml | For Dandruff-Prone Hair','Reduces Dandruff Up To 100% | Treats Itchy Scalp','A clinically tested anti-dandruff shampoo that combines the power of Salicylic Acid and Biotin to reduce dandruff up to 100%. Gentle enough for daily use while being tough on flakes.','Apply on wet hair. Massage into scalp for 2-3 minutes. Rinse thoroughly. Use 2-3 times a week for best results.','Aqua, Sodium Laureth Sulfate, Salicylic Acid, Biotin, Zinc Pyrithione, Cocamidopropyl Betaine, Glycerin',445,484,8,'BA-SH-001',280,TRUE,150,4.66,1400,ARRAY['shampoo','dandruff','hair','salicylic acid','biotin','hair care'],ARRAY['dandruff','hair-fall'])
    RETURNING id INTO p1;

    -- ── P2: Rosemary & Rice Water Hair Growth Spray ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_hair_serum,'Rosemary & Rice Water Hair Growth Spray','rosemary-rice-water-spray','100 ml | For All Hair Types','Promotes Hair Growth & Reduces Hair Fall','A lightweight hair growth spray infused with Rosemary Oil and fermented Rice Water. Stimulates hair follicles, strengthens roots, and promotes visibly thicker hair.','Spray evenly on scalp and hair after washing. Do not rinse. Style as usual. Use daily for best results.','Aqua, Rosmarinus Officinalis Extract, Oryza Sativa Water, Biotin, Niacinamide, Caffeine',375,399,6,'BA-SP-001',120,TRUE,200,4.78,904,ARRAY['hair growth','rosemary','rice water','spray','hair'],ARRAY['hair-fall'])
    RETURNING id INTO p2;

    -- ── P3: Exfoliating Body Wash ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_chemist,v_body_care,'Exfoliating Body Wash with Lactic Acid & Salicylic Acid','exfoliating-body-wash','200 ml | For All Skin Types','Smoothens Rough & Bumpy Skin','A dual-acid body wash that gently exfoliates dead skin cells. Lactic Acid hydrates while Salicylic Acid unclogs pores for smoother, brighter skin.','Apply on wet skin. Lather and massage gently. Rinse off. Use daily or alternate days.','Aqua, Lactic Acid, Salicylic Acid, Cocamidopropyl Betaine, Glycerin, Aloe Vera Extract',359,399,10,'CP-BW-001',220,TRUE,300,4.67,2882,ARRAY['body wash','exfoliating','lactic acid','salicylic acid','body'],ARRAY['acne','dark-spots'])
    RETURNING id INTO p3;

    -- ── P4: Vitamin C Face Serum ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_chemist,v_serum,'Vitamin C Face Serum with Hyaluronic Acid','vitamin-c-brightening-serum','30 ml | For Glowing Skin','Brightens Skin & Reduces Dark Spots','A potent Vitamin C serum enriched with Hyaluronic Acid. Targets dark spots, uneven skin tone, and dullness for a radiant, glowing complexion.','Apply 3-4 drops on cleansed face. Gently pat until absorbed. Follow with moisturizer and sunscreen.','Ascorbic Acid 15%, Hyaluronic Acid, Niacinamide, Ferulic Acid, Vitamin E',499,599,17,'CP-SR-001',50,TRUE,180,4.74,680,ARRAY['serum','vitamin c','hyaluronic acid','face','skin','glowing','brightening'],ARRAY['dark-spots','anti-aging'])
    RETURNING id INTO p4;

    -- ── P5: Advanced Hair Growth Serum ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_hair_serum,'Advanced Hair Growth Serum with Redensyl & Biotin','hair-growth-serum','50 ml | For Thinning Hair','Clinically Proven to Reduce Hair Fall by 73%','An advanced hair growth serum powered by Redensyl and Biotin. Clinically proven to activate hair follicle stem cells and promote new hair growth.','Apply 8-10 drops directly on scalp. Massage gently for 2 minutes. Leave overnight. Use daily.','Redensyl 3%, Biotin, Capixyl, Procapil, Baicapil, Jojoba Oil',849,849,0,'BA-SR-001',70,TRUE,120,4.82,1200,ARRAY['serum','hair growth','redensyl','biotin','hair'],ARRAY['hair-fall'])
    RETURNING id INTO p5;

    -- ── P6: SPF 50 Sunscreen Gel Cream ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_sun_scoop,v_sunscreen,'SPF 50 Sunscreen Gel Cream - Lightweight','spf50-sunscreen','50 g | For Oily Skin','No White Cast | Lightweight Formula','A lightweight SPF 50 PA++++ sunscreen gel cream designed for oily skin. Zero white cast, non-greasy finish, and broad-spectrum UV protection.','Apply generously 15 minutes before sun exposure. Reapply every 2-3 hours. Use daily.','Aqua, Ethylhexyl Methoxycinnamate, Titanium Dioxide, Niacinamide, Hyaluronic Acid',399,499,20,'SS-SC-001',60,TRUE,250,4.81,3200,ARRAY['sunscreen','spf','sun','gel','oily skin','sun care'],ARRAY['sun-protection'])
    RETURNING id INTO p6;

    -- ── P7: Deep Conditioning Hair Mask ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_hair_mask,'Deep Conditioning Hair Mask with Argan Oil & Keratin','hair-mask-argan','200 g | For Dry & Damaged Hair','Repairs Damage & Restores Shine','A deeply nourishing hair mask enriched with Argan Oil and Keratin Protein. Repairs damage, restores elasticity, and adds intense shine.','Apply on washed, damp hair. Leave for 5-10 minutes. Rinse thoroughly. Use 1-2 times a week.','Argan Oil, Hydrolyzed Keratin, Shea Butter, Coconut Oil, Silk Amino Acids',425,499,15,'BA-HM-001',220,TRUE,100,4.59,760,ARRAY['hair mask','argan oil','keratin','conditioning','hair'],ARRAY['hair-fall'])
    RETURNING id INTO p7;

    -- ── P8: Niacinamide Face Wash ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_chemist,v_face_wash,'Niacinamide Face Wash for Acne & Oil Control','salicylic-acid-face-wash','100 ml | For Oily & Acne-Prone Skin','Controls Oil & Prevents Breakouts','A gentle yet effective face wash with 2% Niacinamide and Salicylic Acid. Controls excess oil, unclogs pores, and prevents acne breakouts.','Wet face. Take a small amount and massage in circular motions. Rinse with water. Use twice daily.','Aqua, Niacinamide 2%, Salicylic Acid 0.5%, Zinc PCA, Tea Tree Oil, Aloe Vera',299,349,14,'CP-FW-001',120,TRUE,220,4.55,1950,ARRAY['face wash','niacinamide','acne','oil control','face','skin'],ARRAY['acne','dark-spots'])
    RETURNING id INTO p8;

    -- ── P9: Coconut Milk Shampoo ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_shampoo,'Coconut Milk Shampoo for Dry & Damaged Hair','coconut-milk-shampoo','250 ml | For Dry Hair','Intense Hydration & Repair','A sulfate-free shampoo infused with coconut milk proteins. Deeply hydrates dry and damaged strands while adding silky softness.','Apply on wet hair. Massage into a gentle lather. Rinse thoroughly. Follow with conditioner.','Aqua, Coconut Milk, Glycerin, Hydrolyzed Wheat Protein, Panthenol, Vitamin E',395,450,12,'BA-SH-002',270,TRUE,160,4.72,540,ARRAY['shampoo','coconut','dry hair','damaged hair','hair','sulfate-free'],ARRAY['hair-fall'])
    RETURNING id INTO p9;

    -- ── P10: Roll On Deodorant ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_chemist,v_body_care,'Roll On Deodorant with Silver Ion Technology','roll-on-deodorant','50 ml | Unisex','48-Hour Odor Protection','An advanced roll-on deodorant powered by Silver Ion technology. Provides long-lasting 48-hour odor protection without blocking pores.','Apply on clean, dry underarms. Allow to dry before dressing. Reapply as needed.','Aqua, Silver Citrate, Aloe Vera, Witch Hazel, Zinc Ricinoleate',199,249,20,'CP-RO-001',65,TRUE,350,4.63,890,ARRAY['roll on','deodorant','body','silver ion'],ARRAY[])
    RETURNING id INTO p10;

    -- ── P11: Keratin Shampoo ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_shampoo,'Keratin Smooth Shampoo for Frizzy Hair','keratin-smooth-shampoo','250 ml | For Frizzy Hair','Smoothens Frizz & Adds Shine','A keratin-infused shampoo that tames frizz, adds brilliant shine, and makes hair salon-smooth from the first wash.','Apply on wet hair. Massage gently on scalp and lengths. Rinse. Use with Keratin Conditioner for best results.','Aqua, Hydrolyzed Keratin, Argan Oil, Silk Proteins, Panthenol',549,649,15,'BA-SH-003',270,TRUE,90,4.71,620,ARRAY['shampoo','keratin','frizzy hair','smooth','hair'],ARRAY['hair-fall'])
    RETURNING id INTO p11;

    -- ── P12: Retinol Night Serum ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_chemist,v_serum,'Retinol Night Serum 0.5% for Anti-Aging','retinol-night-serum','30 ml | For Mature Skin','Reduces Fine Lines & Wrinkles','A potent night repair serum with 0.5% Encapsulated Retinol. Accelerates cell turnover, reduces fine lines, and improves skin texture overnight.','Apply 2-3 drops on cleansed face at night. Avoid eye area. Follow with moisturizer. Always use sunscreen the next morning.','Retinol 0.5%, Squalane, Hyaluronic Acid, Ceramides, Vitamin E',699,799,13,'CP-SR-002',45,TRUE,80,4.69,420,ARRAY['serum','retinol','anti-aging','night','face','skin'],ARRAY['anti-aging','dark-spots'])
    RETURNING id INTO p12;

    -- ── P13: SPF 30 Moisturizer ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_sun_scoop,v_moisturizer,'SPF 30 Daily Moisturizer with Ceramides','spf30-moisturizer','50 g | For All Skin Types','Hydrates + Protects','A dual-action moisturizer that hydrates with ceramides while providing SPF 30 sun protection. Perfect for daily use under makeup.','Apply on cleansed face as the last step of skincare. Reapply every 3-4 hours if outdoors.','Ceramide NP, Ethylhexyl Methoxycinnamate, Hyaluronic Acid, Niacinamide, Shea Butter',349,449,22,'SS-MO-001',65,TRUE,180,4.76,950,ARRAY['moisturizer','spf','ceramides','sun care','daily','face'],ARRAY['sun-protection','anti-aging'])
    RETURNING id INTO p13;

    -- ── P14: Hair Oil ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_bare_anatomy,v_hair_oil,'Expert Strengthening Hair Oil with Onion & Bhringraj','strengthening-hair-oil','200 ml | For Hair Fall Control','Strengthens Roots & Reduces Breakage','A potent hair oil blend combining Onion Oil and Bhringraj for hair fall control. Strengthens hair from root to tip while promoting healthy growth.','Apply warm oil on scalp and lengths. Massage for 5-10 minutes. Leave for 1-2 hours or overnight. Wash with shampoo.','Onion Seed Oil, Bhringraj Extract, Coconut Oil, Castor Oil, Jojoba Oil, Vitamin E',329,399,18,'BA-HO-001',220,TRUE,200,4.68,780,ARRAY['hair oil','onion','bhringraj','strengthening','hair'],ARRAY['hair-fall'])
    RETURNING id INTO p14;

    -- ── P15: Lip SPF Balm ──
    INSERT INTO public.products (brand_id,category_id,name,slug,subtitle,short_description,description,how_to_use,ingredients,base_price,compare_at_price,discount_percent,sku,weight_grams,is_featured,stock_quantity,rating_avg,review_count,tags,concerns)
    VALUES (v_sun_scoop,(SELECT id FROM public.categories WHERE slug='lip-spf'),'Lip SPF 30 Balm with Shea Butter','lip-spf-balm','4.5 g | Unisex','Moisturizes & Protects Lips','A nourishing lip balm with SPF 30 protection. Keeps lips soft, hydrated, and protected from UV damage all day.','Apply generously on lips. Reapply every 2-3 hours or after eating/drinking.','Shea Butter, Beeswax, SPF 30 Filters, Vitamin E, Jojoba Oil, Calendula Extract',199,249,20,'SS-LB-001',10,TRUE,400,4.85,520,ARRAY['lip balm','spf','lip care','sun care'],ARRAY['sun-protection'])
    RETURNING id INTO p15;

    -- ================================================================
    -- 2. PRODUCT IMAGES (3-4 per product)
    -- ================================================================
    INSERT INTO public.product_images (product_id,url,alt_text,is_primary,sort_order) VALUES
    (p1,'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&q=80','Anti Dandruff Shampoo front',TRUE,1),
    (p1,'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80','Anti Dandruff Shampoo back',FALSE,2),
    (p1,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80','Anti Dandruff Shampoo lifestyle',FALSE,3),
    (p2,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80','Hair Growth Spray front',TRUE,1),
    (p2,'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&q=80','Hair Growth Spray usage',FALSE,2),
    (p2,'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80','Hair Growth Spray result',FALSE,3),
    (p3,'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80','Exfoliating Body Wash front',TRUE,1),
    (p3,'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=80','Body Wash texture',FALSE,2),
    (p3,'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80','Body Wash lifestyle',FALSE,3),
    (p4,'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80','Vitamin C Serum front',TRUE,1),
    (p4,'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&q=80','Vitamin C Serum dropper',FALSE,2),
    (p4,'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80','Vitamin C Serum result',FALSE,3),
    (p5,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80','Hair Growth Serum front',TRUE,1),
    (p5,'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80','Hair Growth Serum lifestyle',FALSE,2),
    (p5,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80','Hair Growth Serum result',FALSE,3),
    (p6,'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80','SPF 50 Sunscreen front',TRUE,1),
    (p6,'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&q=80','Sunscreen texture',FALSE,2),
    (p6,'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80','Sunscreen lifestyle',FALSE,3),
    (p7,'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=600&q=80','Hair Mask front',TRUE,1),
    (p7,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80','Hair Mask texture',FALSE,2),
    (p7,'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&q=80','Hair Mask lifestyle',FALSE,3),
    (p8,'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80','Face Wash front',TRUE,1),
    (p8,'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80','Face Wash texture',FALSE,2),
    (p8,'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=80','Face Wash lifestyle',FALSE,3),
    (p9,'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80','Coconut Shampoo front',TRUE,1),
    (p9,'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&q=80','Coconut Shampoo back',FALSE,2),
    (p10,'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80','Roll On front',TRUE,1),
    (p10,'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80','Roll On lifestyle',FALSE,2),
    (p11,'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=600&q=80','Keratin Shampoo front',TRUE,1),
    (p11,'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80','Keratin Shampoo back',FALSE,2),
    (p12,'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80','Retinol Serum front',TRUE,1),
    (p12,'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&q=80','Retinol Serum dropper',FALSE,2),
    (p13,'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80','SPF Moisturizer front',TRUE,1),
    (p13,'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80','SPF Moisturizer texture',FALSE,2),
    (p14,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80','Hair Oil front',TRUE,1),
    (p14,'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&q=80','Hair Oil lifestyle',FALSE,2),
    (p15,'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80','Lip SPF front',TRUE,1),
    (p15,'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80','Lip SPF lifestyle',FALSE,2);

    -- ================================================================
    -- 3. PRODUCT SIZES
    -- ================================================================
    INSERT INTO public.product_sizes (product_id,label,ml_value,price,compare_at_price,is_default,sort_order) VALUES
    (p1,'250 ml','250ml',445,484,TRUE,1),(p1,'500 ml','500ml',799,899,FALSE,2),
    (p2,'100 ml','100ml',375,399,TRUE,1),(p2,'200 ml','200ml',649,699,FALSE,2),
    (p3,'200 ml','200ml',359,399,TRUE,1),(p3,'400 ml','400ml',599,699,FALSE,2),
    (p4,'30 ml','30ml',499,599,TRUE,1),(p4,'15 ml','15ml',299,349,FALSE,2),
    (p5,'50 ml','50ml',849,849,TRUE,1),(p5,'30 ml','30ml',549,549,FALSE,2),
    (p6,'50 g','50g',399,499,TRUE,1),(p6,'80 g','80g',599,749,FALSE,2),
    (p7,'200 g','200g',425,499,TRUE,1),(p7,'100 g','100g',249,299,FALSE,2),
    (p8,'100 ml','100ml',299,349,TRUE,1),(p8,'200 ml','200ml',499,599,FALSE,2),
    (p9,'250 ml','250ml',395,450,TRUE,1),(p9,'500 ml','500ml',699,799,FALSE,2),
    (p10,'50 ml','50ml',199,249,TRUE,1),
    (p11,'250 ml','250ml',549,649,TRUE,1),(p11,'100 ml','100ml',299,349,FALSE,2),
    (p12,'30 ml','30ml',699,799,TRUE,1),(p12,'15 ml','15ml',399,449,FALSE,2),
    (p13,'50 g','50g',349,449,TRUE,1),
    (p14,'200 ml','200ml',329,399,TRUE,1),(p14,'100 ml','100ml',199,249,FALSE,2),
    (p15,'4.5 g','4.5g',199,249,TRUE,1);

    -- ================================================================
    -- 4. PRODUCT KEY BENEFITS
    -- ================================================================
    INSERT INTO public.product_key_benefits (product_id,icon_name,title,description,sort_order) VALUES
    (p1,'Shield','Anti-Dandruff','Reduces dandruff up to 100%',1),(p1,'Droplets','Scalp Care','Soothes itchy & irritated scalp',2),(p1,'Leaf','Gentle Formula','Sulfate-balanced for daily use',3),(p1,'Zap','Fast Acting','Visible results from first wash',4),
    (p2,'Sprout','Growth Boost','Stimulates hair follicle growth',1),(p2,'Shield','Root Strength','Strengthens hair from roots',2),(p2,'Droplets','Nourishing','Rice water nourishes deeply',3),
    (p3,'Sparkles','Smoother Skin','Gentle chemical exfoliation',1),(p3,'Droplets','Hydrating','Lactic acid locks in moisture',2),(p3,'Shield','Pore Care','Unclogs & minimizes pores',3),
    (p4,'Sun','Brightening','Targets dark spots & pigmentation',1),(p4,'Droplets','Hydrating','Hyaluronic acid plumps skin',2),(p4,'Shield','Antioxidant','Protects against free radicals',3),(p4,'Zap','Fast Absorbing','Lightweight non-greasy formula',4),
    (p5,'Sprout','Hair Growth','Activates follicle stem cells',1),(p5,'Shield','Clinically Proven','73% less hair fall in 90 days',2),(p5,'Leaf','Natural Actives','Redensyl + Biotin + Capixyl',3),
    (p6,'Sun','SPF 50 PA++++','Broad spectrum UV protection',1),(p6,'Droplets','Lightweight','Zero white cast formula',2),(p6,'Shield','Non-Greasy','Gel-cream finish for oily skin',3),
    (p7,'Droplets','Deep Repair','Argan Oil repairs damage',1),(p7,'Sparkles','Adds Shine','Keratin restores natural luster',2),(p7,'Leaf','Nourishing','Shea Butter & Coconut Oil',3),
    (p8,'Shield','Oil Control','Niacinamide regulates sebum',1),(p8,'Zap','Anti-Acne','Salicylic acid clears breakouts',2),(p8,'Droplets','Gentle','pH-balanced daily cleanser',3);

    -- ================================================================
    -- 5. PRODUCT HIGHLIGHTS
    -- ================================================================
    INSERT INTO public.product_highlights (product_id,highlight,sort_order) VALUES
    (p1,'Clinically tested - reduces dandruff up to 100%',1),(p1,'Contains Salicylic Acid & Biotin',2),(p1,'Suitable for daily use',3),(p1,'Paraben & sulfate balanced',4),
    (p2,'Promotes visible hair growth in 8 weeks',1),(p2,'Infused with Rosemary Oil & fermented Rice Water',2),(p2,'Lightweight non-sticky formula',3),(p2,'Suitable for all hair types',4),
    (p3,'Dual-acid exfoliating formula',1),(p3,'Smoothens rough & bumpy skin',2),(p3,'Dermatologically tested',3),(p3,'Suitable for daily use',4),
    (p4,'15% Vitamin C with Ferulic Acid',1),(p4,'Brightens skin in 2 weeks',2),(p4,'Oil-free lightweight formula',3),(p4,'Dermatologically tested',4),
    (p5,'Contains Redensyl 3% & Biotin',1),(p5,'Clinically proven results',2),(p5,'Non-greasy leave-on formula',3),(p5,'Suitable for men & women',4),
    (p6,'SPF 50 PA++++ broad spectrum',1),(p6,'Zero white cast technology',2),(p6,'Non-comedogenic for oily skin',3),(p6,'Water-resistant up to 40 min',4),
    (p7,'Deep conditioning repair mask',1),(p7,'Argan Oil & Keratin Protein',2),(p7,'Restores elasticity & shine',3),(p7,'Use 1-2 times per week',4),
    (p8,'2% Niacinamide + Salicylic Acid',1),(p8,'Controls oil for 8+ hours',2),(p8,'Prevents acne breakouts',3),(p8,'pH 5.5 balanced formula',4);

    -- ================================================================
    -- 6. PRODUCT BADGES
    -- ================================================================
    INSERT INTO public.product_badges (product_id,badge,custom_label,badge_color,is_primary) VALUES
    (p1,'best_seller','Best Seller','#2e7d32',TRUE),(p1,'trending',NULL,NULL,FALSE),
    (p2,'best_seller','Best Seller','#2e7d32',TRUE),
    (p3,'best_seller','Best Seller','#2e7d32',TRUE),
    (p4,'trending','Trending','#e67e22',TRUE),
    (p5,'premium','Premium','#6c3483',TRUE),
    (p6,'best_seller','Best Seller','#2e7d32',TRUE),(p6,'selling_fast','Selling Fast','#e74c3c',FALSE),
    (p7,'sale','15% OFF','#e74c3c',TRUE),
    (p8,'best_seller','Best Seller','#2e7d32',TRUE),
    (p9,'new_launch','New Launch','#1e88e5',TRUE),
    (p11,'new_launch','New Launch','#1e88e5',TRUE),
    (p12,'new_launch','New Launch','#1e88e5',TRUE),
    (p13,'new_launch','New Launch','#1e88e5',TRUE),
    (p14,'trending','Trending','#e67e22',TRUE),
    (p15,'new_launch','New Launch','#1e88e5',TRUE);

    -- ================================================================
    -- 7. PRODUCT-COUPON ASSOCIATIONS
    -- ================================================================
    INSERT INTO public.product_coupons (product_id,coupon_id,coupon_price) VALUES
    (p1,c_flat20,359),(p2,c_flat20,300),(p3,c_flat20,287),
    (p4,c_flat20,399),(p6,c_flat20,319),(p8,c_flat20,239),
    (p9,c_valley20,375),(p10,c_valley20,179),
    (p7,c_flat25,319),(p11,c_flat25,412),
    (p14,c_flat35,214);

    -- ================================================================
    -- 8. UPDATE HERO SLIDES (replace single seed with full set)
    -- ================================================================
    DELETE FROM public.hero_slides;
    INSERT INTO public.hero_slides (title,subtitle,cta_text,cta_link,image_url,image_alt,background_color,sort_order) VALUES
    ('Hair Strengthening Spray','Repair, strengthen, and transform your hair','Shop Now','/shop','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1400&q=80','Hair Strengthening Spray','linear-gradient(135deg, #e8d5b7 0%, #f0e4cf 30%, #f5eadb 60%, #eeddc4 100%)',1),
    ('Anti Acne Solutions','Clear skin starts with the right routine','Explore','/shop?concern=acne','https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1400&q=80','Anti Acne Face Wash','linear-gradient(135deg, #d4e8d0 0%, #e2f0de 30%, #eaf5e6 60%, #d8ead4 100%)',2),
    ('Daily Sun Protection','Lightweight SPF that you will actually love wearing','Shop Sunscreens','/shop?type=sunscreen','https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=1400&q=80','Daily Sunscreen SPF 50+','linear-gradient(135deg, #fce4b8 0%, #fdedc8 30%, #fff3d8 60%, #fae5b6 100%)',3),
    ('Salon-Smooth Hair','Keratin powered care for frizz-free perfection','Shop Hair Care','/shop?type=hair-care','https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=1400&q=80','Keratin Smooth Shampoo','linear-gradient(135deg, #e0d4ef 0%, #ebe2f5 30%, #f2ecfa 60%, #ddd0ec 100%)',4),
    ('Night Repair Serum','Wake up to younger looking skin with Retinol','Shop Serums','/shop?type=serum','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1400&q=80','Retinol Night Serum','linear-gradient(135deg, #f5ddd0 0%, #f9e6db 30%, #fcede4 60%, #f3d9cc 100%)',5);

    -- ================================================================
    -- 9. HOMEPAGE SECTION-PRODUCT LINKS
    -- ================================================================
    -- Best Sellers
    INSERT INTO public.homepage_section_products (section_id,product_id,sort_order,custom_badge_text) VALUES
    (s_best,p1,1,'Upto 100% Dandruff Reduction'),(s_best,p2,2,NULL),(s_best,p3,3,NULL),
    (s_best,p6,4,'No White Cast'),(s_best,p8,5,NULL),(s_best,p5,6,NULL);

    -- New Launches
    INSERT INTO public.homepage_section_products (section_id,product_id,sort_order,custom_badge_text) VALUES
    (s_new,p9,1,NULL),(s_new,p11,2,NULL),(s_new,p12,3,NULL),
    (s_new,p13,4,NULL),(s_new,p15,5,NULL),(s_new,p4,6,NULL);

    -- Power Care Duos
    INSERT INTO public.homepage_section_products (section_id,product_id,sort_order,custom_badge_text) VALUES
    (s_power,p1,1,'Root to Tip Care'),(s_power,p7,2,'Deep Repair Duo'),
    (s_power,p14,3,'Strength Duo'),(s_power,p2,4,'Growth Duo'),
    (s_power,p6,5,'Day Protection'),(s_power,p13,6,'SPF Essentials');

    RAISE NOTICE 'Seed data inserted successfully! Products: 15, Images: 38, Sizes: 27, Benefits: 30, Highlights: 32, Badges: 15';
END $$;
