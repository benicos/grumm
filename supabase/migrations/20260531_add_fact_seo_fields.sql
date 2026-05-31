alter table public.facts
add column if not exists seo_title text,
add column if not exists seo_description text;

alter table public.facts
drop constraint if exists facts_seo_title_length_check;

alter table public.facts
add constraint facts_seo_title_length_check
check (seo_title is null or char_length(trim(seo_title)) <= 90);

alter table public.facts
drop constraint if exists facts_seo_description_length_check;

alter table public.facts
add constraint facts_seo_description_length_check
check (seo_description is null or char_length(trim(seo_description)) <= 220);
