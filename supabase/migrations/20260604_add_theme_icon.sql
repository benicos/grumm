alter table public.categories
add column if not exists theme_icon text;

alter table public.categories
drop constraint if exists categories_theme_icon_length,
add constraint categories_theme_icon_length
check (theme_icon is null or char_length(theme_icon) <= 80);
