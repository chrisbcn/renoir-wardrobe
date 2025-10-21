-- Migration: Add recreation tracking columns to wardrobe_items table
-- Run this in your Supabase SQL Editor

-- Add columns for recreation tracking
ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS is_recreated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_image_url text,
ADD COLUMN IF NOT EXISTS recreated_image_url text,
ADD COLUMN IF NOT EXISTS recreation_metadata jsonb;

-- Add helpful comments
COMMENT ON COLUMN wardrobe_items.is_recreated IS 'Flag indicating if this item has been recreated with AI';
COMMENT ON COLUMN wardrobe_items.original_image_url IS 'Original uploaded/detected image';
COMMENT ON COLUMN wardrobe_items.recreated_image_url IS 'AI-generated product photo';
COMMENT ON COLUMN wardrobe_items.recreation_metadata IS 'Metadata about recreation: model, timestamp, etc';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wardrobe_items'
  AND column_name IN ('is_recreated', 'original_image_url', 'recreated_image_url', 'recreation_metadata')
ORDER BY column_name;

