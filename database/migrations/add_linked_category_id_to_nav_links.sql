-- Migration: Add linked_category_id to nav_links
-- Date: 2026-04-08
-- Reason: Required for dynamic navigation (linking top-level nav items to product categories)

ALTER TABLE public.nav_links
ADD COLUMN IF NOT EXISTS linked_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.nav_links.linked_category_id IS 'If set, this nav link will auto-populate its dropdown with subcategories of this category.';
