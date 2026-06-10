-- Migration: Update shipping_fee setting to two-tier format (Inside Dhaka / Outside Dhaka)
-- Run this in your Supabase SQL Editor

-- Update shipping_fee value from old format { "amount": N } to new format { "dhaka": N, "outside_dhaka": N }
UPDATE site_settings 
SET value = jsonb_build_object(
    'dhaka', COALESCE((value->>'amount')::numeric, 80),
    'outside_dhaka', 150
),
updated_at = now()
WHERE key = 'shipping_fee';

-- Verify the update
SELECT key, value FROM site_settings WHERE key = 'shipping_fee';
