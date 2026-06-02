alter table public.categories
add column if not exists description_courte text,
add column if not exists description_longue text,
add column if not exists seo_title text,
add column if not exists seo_description text,
add column if not exists keywords text[],
add column if not exists visual_motif text,
add column if not exists gradient_start text,
add column if not exists gradient_middle text,
add column if not exists gradient_end text;

alter table public.categories
drop constraint if exists categories_seo_title_length_check,
add constraint categories_seo_title_length_check
check (seo_title is null or char_length(trim(seo_title)) <= 90);

alter table public.categories
drop constraint if exists categories_seo_description_length_check,
add constraint categories_seo_description_length_check
check (seo_description is null or char_length(trim(seo_description)) <= 220);

alter table public.categories
drop constraint if exists categories_visual_motif_check,
add constraint categories_visual_motif_check
check (
  visual_motif is null
  or visual_motif in (
    'timeline',
    'orbit',
    'projector',
    'soundwave',
    'brush',
    'topography',
    'book',
    'map',
    'architecture',
    'spark',
    'constellation'
  )
);

update public.categories
set
  gradient_start = coalesce(gradient_start, (regexp_match(tone, 'from-\[(#[0-9a-fA-F]{3,8})\]'))[1]),
  gradient_middle = coalesce(gradient_middle, (regexp_match(tone, 'via-\[(#[0-9a-fA-F]{3,8})\]'))[1]),
  gradient_end = coalesce(gradient_end, (regexp_match(tone, 'to-\[(#[0-9a-fA-F]{3,8})\]'))[1])
where tone is not null;
