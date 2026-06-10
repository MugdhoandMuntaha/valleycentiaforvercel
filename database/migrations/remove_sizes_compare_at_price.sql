-- Migration: Remove compare_at_price from product_sizes
-- Date: 2026-04-07
-- Reason: Discount is now calculated from the product-level discount_percent field.
--         compare_at_price on the products table is auto-calculated on save.

-- 1. Drop the compare_at_price column from product_sizes
ALTER TABLE public.product_sizes DROP COLUMN IF EXISTS compare_at_price;

-- 2. Recreate the v_product_detail view without compare_at_price in sizes JSON
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
