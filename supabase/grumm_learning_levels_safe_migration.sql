-- Grumm learning levels and read-table clarification.
-- Safe to apply on an existing Grumm database: additive columns, data backfill,
-- function replacement, no table drop and no data purge.

alter table public.facts alter column source drop not null;
alter table public.facts add column if not exists difficulty_level text;

update public.facts
set
  difficulty_level = case
    when difficulty_level in ('basic', 'intermediate', 'advanced') then difficulty_level
    else 'intermediate'
  end,
  source = nullif(btrim(source), '')
where
  difficulty_level is null
  or difficulty_level not in ('basic', 'intermediate', 'advanced')
  or source is not null;

alter table public.facts alter column difficulty_level set default 'intermediate';
alter table public.facts alter column difficulty_level set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'facts_difficulty_level_check'
      and conrelid = 'public.facts'::regclass
  ) then
    alter table public.facts
      add constraint facts_difficulty_level_check
      check (difficulty_level in ('basic', 'intermediate', 'advanced'));
  end if;
end;
$$;

alter table public.profiles add column if not exists learning_goal text;

update public.profiles
set learning_goal = case
  when learning_goal in ('basics', 'strengthen', 'advanced') then learning_goal
  else 'strengthen'
end
where learning_goal is null
  or learning_goal not in ('basics', 'strengthen', 'advanced');

alter table public.profiles alter column learning_goal set default 'strengthen';
alter table public.profiles alter column learning_goal set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_learning_goal_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_learning_goal_check
      check (learning_goal in ('basics', 'strengthen', 'advanced'));
  end if;
end;
$$;

-- Migrate legacy unique views into the canonical unique user/fact table.
insert into public.user_fact_views (user_id, fact_id, first_viewed_at)
select views.user_id, views.fact_id, min(views.viewed_at)
from public.views
where views.user_id is not null
  and views.fact_id is not null
group by views.user_id, views.fact_id
on conflict (user_id, fact_id) do nothing;

comment on table public.views is
  'Deprecated legacy read table. New product code uses user_fact_views for unique user/fact reads and fact_read_events for detailed analytics. Kept to avoid data loss and rollback risk.';
comment on table public.user_fact_views is
  'Canonical unique user/fact read table used by progression, profile, feed seen-state and admin unique-read counts.';
comment on table public.fact_read_events is
  'Detailed lightweight read analytics table used for duration, swipe and dashboard engagement metrics.';

create or replace function public.set_fact_slug()
returns trigger
language plpgsql
as $$
declare
  v_base_slug text;
  v_candidate text;
  v_suffix integer := 2;
begin
  v_base_slug := public.slugify_text(new.title);
  v_candidate := v_base_slug;

  while exists (
    select 1
    from public.facts
    where slug = v_candidate and id <> new.id
  ) loop
    v_candidate := concat(v_base_slug, '-', v_suffix);
    v_suffix := v_suffix + 1;
  end loop;

  new.slug = v_candidate;
  return new;
end;
$$;

drop trigger if exists facts_set_slug on public.facts;
create trigger facts_set_slug
before insert or update of title, slug on public.facts
for each row execute function public.set_fact_slug();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url, learning_goal)
  values (
    new.id,
    coalesce(
      public.normalize_username(new.raw_user_meta_data->>'username'),
      concat('user_', left(replace(new.id::text, '-', ''), 19))
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    case
      when new.raw_user_meta_data->>'learning_goal' in ('basics', 'strengthen', 'advanced')
        then new.raw_user_meta_data->>'learning_goal'
      else 'strengthen'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.learning_difficulty_weight(
  p_learning_goal text,
  p_difficulty_level text
)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_learning_goal, 'strengthen') = 'basics' then
      case p_difficulty_level
        when 'basic' then 0
        when 'intermediate' then 0.35
        else 1.1
      end
    when coalesce(p_learning_goal, 'strengthen') = 'advanced' then
      case p_difficulty_level
        when 'advanced' then 0
        when 'intermediate' then 0.35
        else 1.1
      end
    else
      case p_difficulty_level
        when 'intermediate' then 0
        else 0.55
      end
  end;
$$;

drop function if exists public.get_discover_feed(integer, text, uuid[]);

create or replace function public.get_discover_feed(
  p_limit integer default 18,
  p_theme_slug text default null,
  p_exclude_ids uuid[] default '{}',
  p_learning_goal text default null
)
returns table (
  id uuid,
  slug text,
  title text,
  hook text,
  content text,
  source text,
  source_url text,
  difficulty_level text,
  tone text,
  accent_color text,
  category_id uuid,
  category_name text,
  category_slug text,
  category_tone text,
  category_accent_color text,
  seen_by_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 18), 50));
  v_exclude_ids uuid[] := coalesce(p_exclude_ids, '{}');
  v_learning_goal text := case
    when p_learning_goal in ('basics', 'strengthen', 'advanced') then p_learning_goal
    else null
  end;
  v_unseen_count integer := 0;
  v_seen_count integer := 0;
  v_unseen_target integer := 0;
  v_seen_target integer := 0;
begin
  if v_user_id is not null and v_learning_goal is null then
    select profiles.learning_goal
    into v_learning_goal
    from public.profiles
    where profiles.id = v_user_id;
  end if;

  if v_learning_goal not in ('basics', 'strengthen', 'advanced') then
    v_learning_goal := 'strengthen';
  end if;

  if v_user_id is null then
    return query
    select
      feed.id,
      feed.slug,
      feed.title,
      feed.hook,
      feed.content,
      feed.source,
      feed.source_url,
      feed.difficulty_level,
      feed.tone,
      feed.accent_color,
      feed.category_id,
      feed.category_name,
      feed.category_slug,
      feed.category_tone,
      feed.category_accent_color,
      false as seen_by_user
    from (
      select
        facts.id,
        facts.slug,
        facts.title,
        facts.hook,
        facts.content,
        facts.source,
        facts.source_url,
        facts.difficulty_level,
        facts.tone,
        facts.accent_color,
        facts.category_id,
        categories.name as category_name,
        categories.slug as category_slug,
        categories.tone as category_tone,
        categories.accent_color as category_accent_color
      from public.facts
      join public.categories on categories.id = facts.category_id
      where facts.status = 'published'
        and (p_theme_slug is null or categories.slug = p_theme_slug)
        and not (facts.id = any(v_exclude_ids))
      order by public.learning_difficulty_weight(v_learning_goal, facts.difficulty_level) + random()
      limit v_limit
    ) as feed;

    return;
  end if;

  select count(*)::integer
  into v_unseen_count
  from public.facts
  join public.categories on categories.id = facts.category_id
  where facts.status = 'published'
    and (p_theme_slug is null or categories.slug = p_theme_slug)
    and not (facts.id = any(v_exclude_ids))
    and not exists (
      select 1
      from public.user_fact_views
      where user_fact_views.user_id = v_user_id
        and user_fact_views.fact_id = facts.id
    );

  select count(*)::integer
  into v_seen_count
  from public.facts
  join public.categories on categories.id = facts.category_id
  where facts.status = 'published'
    and (p_theme_slug is null or categories.slug = p_theme_slug)
    and not (facts.id = any(v_exclude_ids))
    and exists (
      select 1
      from public.user_fact_views
      where user_fact_views.user_id = v_user_id
        and user_fact_views.fact_id = facts.id
    );

  v_seen_target := least(v_seen_count, floor(v_limit * 0.25)::integer);
  v_unseen_target := least(v_unseen_count, v_limit - v_seen_target);

  if v_unseen_target + v_seen_target < v_limit then
    v_seen_target := least(v_seen_count, v_limit - v_unseen_target);
  end if;

  if v_unseen_target + v_seen_target < v_limit then
    v_unseen_target := least(v_unseen_count, v_limit - v_seen_target);
  end if;

  return query
  with unseen as (
    select
      facts.id,
      facts.slug,
      facts.title,
      facts.hook,
      facts.content,
      facts.source,
      facts.source_url,
      facts.difficulty_level,
      facts.tone,
      facts.accent_color,
      facts.category_id,
      categories.name as category_name,
      categories.slug as category_slug,
      categories.tone as category_tone,
      categories.accent_color as category_accent_color,
      false as seen_by_user
    from public.facts
    join public.categories on categories.id = facts.category_id
    where facts.status = 'published'
      and (p_theme_slug is null or categories.slug = p_theme_slug)
      and not (facts.id = any(v_exclude_ids))
      and not exists (
        select 1
        from public.user_fact_views
        where user_fact_views.user_id = v_user_id
          and user_fact_views.fact_id = facts.id
      )
    order by public.learning_difficulty_weight(v_learning_goal, facts.difficulty_level) + random()
    limit v_unseen_target
  ),
  seen as (
    select
      facts.id,
      facts.slug,
      facts.title,
      facts.hook,
      facts.content,
      facts.source,
      facts.source_url,
      facts.difficulty_level,
      facts.tone,
      facts.accent_color,
      facts.category_id,
      categories.name as category_name,
      categories.slug as category_slug,
      categories.tone as category_tone,
      categories.accent_color as category_accent_color,
      true as seen_by_user
    from public.facts
    join public.categories on categories.id = facts.category_id
    where facts.status = 'published'
      and (p_theme_slug is null or categories.slug = p_theme_slug)
      and not (facts.id = any(v_exclude_ids))
      and exists (
        select 1
        from public.user_fact_views
        where user_fact_views.user_id = v_user_id
          and user_fact_views.fact_id = facts.id
      )
    order by public.learning_difficulty_weight(v_learning_goal, facts.difficulty_level) + random()
    limit v_seen_target
  )
  select *
  from (
    select * from unseen
    union all
    select * from seen
  ) as weighted_feed
  order by random();
end;
$$;

grant execute on function public.get_discover_feed(integer, text, uuid[], text) to anon;
grant execute on function public.get_discover_feed(integer, text, uuid[], text) to authenticated;

drop function if exists public.get_admin_profiles(text, text, integer, integer);

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
  learning_goal text,
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
    profiles.learning_goal::text,
    profiles.role::text,
    profiles.created_at,
    profiles.updated_at,
    count(*) over()::bigint as total_count
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
