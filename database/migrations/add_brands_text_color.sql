-- Migration: Add text_color column to brands table
-- Run this in your Supabase SQL editor

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT NULL;

COMMENT ON COLUMN public.brands.text_color IS 'Hex color for brand name text on homepage card (e.g. #1a1512)';
