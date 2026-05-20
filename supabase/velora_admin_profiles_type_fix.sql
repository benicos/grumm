create or replace function public.get_admin_profiles(
  p_query text default null,
  p_role text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  username text,
  avatar_url text,
  daily_goal integer,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'users_manage_forbidden'
      using errcode = '42501', message = 'users_manage_forbidden';
  end if;

  return query
  select
    profiles.id,
    users.email::text,
    profiles.username::text,
    profiles.avatar_url::text,
    profiles.daily_goal,
    profiles.role::text,
    profiles.created_at,
    profiles.updated_at,
    count(*) over()::bigint
  from public.profiles as profiles
  left join auth.users as users
    on users.id = profiles.id
  where
    (nullif(trim(coalesce(p_query, '')), '') is null
      or profiles.username::text ilike '%' || trim(p_query) || '%'
      or users.email::text ilike '%' || trim(p_query) || '%'
      or profiles.id::text ilike '%' || trim(p_query) || '%')
    and (nullif(trim(coalesce(p_role, '')), '') is null or profiles.role::text = p_role)
  order by profiles.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

grant execute on function public.get_admin_profiles(text, text, integer, integer) to authenticated;
