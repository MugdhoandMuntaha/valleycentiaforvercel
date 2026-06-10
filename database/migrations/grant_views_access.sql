-- ============================================================================
-- Fix: Grant SELECT access on views to anon and authenticated roles
-- The v_product_cards and other views were missing GRANT permissions,
-- causing "Error fetching product cards: {}" in the browser console.
-- Run this in the Supabase SQL Editor.
-- ============================================================================

GRANT SELECT ON public.v_product_cards  TO anon, authenticated;
GRANT SELECT ON public.v_product_detail TO anon, authenticated;
GRANT SELECT ON public.v_order_summary  TO anon, authenticated;
