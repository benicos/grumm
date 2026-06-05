drop function if exists public.get_explorer_themes(integer, text);

create or replace function public.get_explorer_themes(
  p_limit integer default 18,
  p_query text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  tone text,
  accent_color text,
  theme_icon text,
  theme_image_url text,
  published_facts_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.slug,
    c.tone,
    c.accent_color,
    c.theme_icon,
    c.theme_image_url,
    count(f.id)::integer as published_facts_count
  from public.categories as c
  left join public.facts as f
    on f.category_id = c.id
   and f.status = 'published'
  where
    nullif(trim(coalesce(p_query, '')), '') is null
    or c.name ilike '%' || trim(p_query) || '%'
    or c.slug ilike '%' || trim(p_query) || '%'
  group by c.id
  order by published_facts_count desc, c.name asc
  limit greatest(1, least(coalesce(p_limit, 18), 60));
$$;

grant execute on function public.get_explorer_themes(integer, text) to anon;
grant execute on function public.get_explorer_themes(integer, text) to authenticated;

