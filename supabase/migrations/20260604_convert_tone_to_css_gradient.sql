-- Migration: Convert all theme tones from Tailwind format to CSS linear-gradient format
-- This ensures consistent gradient rendering across all themes
-- Old format: from-[#111827] via-[#2d3748] to-[#4b5563]
-- New format: linear-gradient(135deg, #111827, #2d3748, #4b5563)

BEGIN;

-- Update tones that have Tailwind gradient format (from-...) to CSS linear-gradient
UPDATE public.categories
SET tone = 'linear-gradient(135deg, ' ||
  COALESCE(
    (regexp_match(tone, 'from-\[(#[0-9a-fA-F]{3,8})\]'))[1],
    '#0b1424'
  ) || ', ' ||
  COALESCE(
    (regexp_match(tone, 'via-\[(#[0-9a-fA-F]{3,8})\]'))[1],
    '#132744'
  ) || ', ' ||
  COALESCE(
    (regexp_match(tone, 'to-\[(#[0-9a-fA-F]{3,8})\]'))[1],
    '#f0a95a'
  ) || ')'
WHERE (tone LIKE 'from-%' OR tone LIKE 'via-%' OR tone LIKE 'to-%')
  AND NOT tone LIKE 'linear-gradient%';

-- Verify no invalid tones remain (those without proper color format)
UPDATE public.categories
SET tone = 'linear-gradient(135deg, #0b1424, #132744, #f0a95a)'
WHERE tone IS NULL
   OR tone = ''
   OR (tone NOT LIKE 'linear-gradient%' AND tone NOT LIKE 'from-%');

COMMIT;
