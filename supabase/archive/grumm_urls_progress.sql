create extension if not exists unaccent with schema public;

create or replace function public.slugify_text(value text)
returns text
language sql
volatile
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(regexp_replace(lower(public.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g')),
      ''
    ),
    encode(gen_random_bytes(6), 'hex')
  );
$$;

create or replace function public.normalize_username(value text)
returns text
language sql
stable
as $$
  select nullif(
    trim(both '_' from regexp_replace(regexp_replace(lower(public.unaccent(coalesce(value, ''))), '[^a-z0-9_]+', '_', 'g'), '_+', '_', 'g')),
    ''
  );
$$;

alter table public.facts
add column if not exists slug text;

update public.facts
set slug = public.slugify_text(title)
where slug is null or trim(slug) = '';

with ranked_slugs as (
  select
    id,
    slug,
    row_number() over (partition by slug order by created_at, id) as slug_rank
  from public.facts
)
update public.facts
set slug = concat(ranked_slugs.slug, '-', ranked_slugs.slug_rank)
from ranked_slugs
where public.facts.id = ranked_slugs.id
  and ranked_slugs.slug_rank > 1;

alter table public.facts
alter column slug set not null;

create unique index if not exists facts_slug_unique_idx
on public.facts (slug);

create index if not exists facts_slug_idx
on public.facts (slug);

create or replace function public.set_fact_slug()
returns trigger
language plpgsql
as $$
declare
  v_base_slug text;
  v_candidate text;
  v_suffix integer := 2;
begin
  v_base_slug := public.slugify_text(coalesce(nullif(new.slug, ''), new.title));
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

update public.profiles
set username = concat('user_', replace(id::text, '-', ''))
where username is null or trim(username) = '';

update public.profiles
set username = public.normalize_username(username)
where username <> public.normalize_username(username);

update public.profiles
set username = concat('user_', left(replace(id::text, '-', ''), 19))
where username !~ '^[a-z0-9_]{3,24}$';

with ranked_usernames as (
  select
    id,
    row_number() over (partition by lower(username) order by created_at, id) as username_rank
  from public.profiles
)
update public.profiles
set username = concat('user_', left(replace(public.profiles.id::text, '-', ''), 19))
from ranked_usernames
where public.profiles.id = ranked_usernames.id
  and ranked_usernames.username_rank > 1;

alter table public.profiles
alter column username set not null;

alter table public.profiles
drop constraint if exists profiles_username_check;

alter table public.profiles
add constraint profiles_username_check check (username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_lower_unique_idx
on public.profiles (lower(username));

create table if not exists public.user_fact_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  constraint user_fact_views_user_id_fact_id_key unique (user_id, fact_id)
);

insert into public.user_fact_views (user_id, fact_id, first_viewed_at)
select user_id, fact_id, min(viewed_at)
from public.views
group by user_id, fact_id
on conflict (user_id, fact_id) do nothing;

create table if not exists public.user_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_date date not null,
  viewed_fact_ids uuid[] not null default '{}',
  facts_read_count integer not null default 0 check (facts_read_count >= 0),
  daily_goal integer not null default 10 check (daily_goal between 1 and 100),
  goal_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_daily_progress_user_id_date_key unique (user_id, progress_date)
);

create index if not exists user_fact_views_user_id_idx
on public.user_fact_views (user_id);

create index if not exists user_fact_views_fact_id_idx
on public.user_fact_views (fact_id);

create index if not exists user_daily_progress_user_id_date_idx
on public.user_daily_progress (user_id, progress_date desc);

drop trigger if exists user_daily_progress_set_updated_at on public.user_daily_progress;
create trigger user_daily_progress_set_updated_at
before update on public.user_daily_progress
for each row execute function public.set_updated_at();

alter table public.user_fact_views enable row level security;
alter table public.user_daily_progress enable row level security;

drop policy if exists "Public can check usernames" on public.profiles;
create policy "Public can check usernames"
on public.profiles for select
using (true);

drop policy if exists "Users can read own fact views" on public.user_fact_views;
create policy "Users can read own fact views"
on public.user_fact_views for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own fact views" on public.user_fact_views;
create policy "Users can create own fact views"
on public.user_fact_views for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can read own daily progress" on public.user_daily_progress;
create policy "Users can read own daily progress"
on public.user_daily_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own daily progress" on public.user_daily_progress;
create policy "Users can create own daily progress"
on public.user_daily_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily progress" on public.user_daily_progress;
create policy "Users can update own daily progress"
on public.user_daily_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := public.normalize_username(new.raw_user_meta_data->>'username');
begin
  if v_username is null then
    raise exception 'username_required';
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.record_fact_read(
  p_fact_id uuid,
  p_progress_date date,
  p_daily_goal integer default 10
)
returns table (
  facts_read_count integer,
  daily_goal integer,
  goal_completed boolean,
  completed_today boolean,
  unique_view_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal integer := greatest(1, least(coalesce(p_daily_goal, 10), 100));
  v_unique_view_created boolean := false;
  v_inserted_count integer := 0;
  v_completed_before boolean := false;
begin
  if v_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.user_fact_views (user_id, fact_id)
  values (v_user_id, p_fact_id)
  on conflict (user_id, fact_id) do nothing;

  get diagnostics v_inserted_count = row_count;
  v_unique_view_created := v_inserted_count > 0;

  select coalesce(goal_completed, false)
  into v_completed_before
  from public.user_daily_progress
  where user_id = v_user_id and progress_date = p_progress_date;

  insert into public.user_daily_progress (
    user_id,
    progress_date,
    viewed_fact_ids,
    facts_read_count,
    daily_goal,
    goal_completed,
    completed_at
  )
  values (
    v_user_id,
    p_progress_date,
    array[p_fact_id],
    1,
    v_goal,
    1 >= v_goal,
    case when 1 >= v_goal then now() else null end
  )
  on conflict (user_id, progress_date) do update
  set
    viewed_fact_ids = case
      when not public.user_daily_progress.viewed_fact_ids @> array[p_fact_id]
      then array_append(public.user_daily_progress.viewed_fact_ids, p_fact_id)
      else public.user_daily_progress.viewed_fact_ids
    end,
    facts_read_count = case
      when not public.user_daily_progress.viewed_fact_ids @> array[p_fact_id]
      then public.user_daily_progress.facts_read_count + 1
      else public.user_daily_progress.facts_read_count
    end,
    daily_goal = v_goal,
    goal_completed = public.user_daily_progress.goal_completed or (
      case
        when not public.user_daily_progress.viewed_fact_ids @> array[p_fact_id]
        then public.user_daily_progress.facts_read_count + 1
        else public.user_daily_progress.facts_read_count
      end
    ) >= v_goal,
    completed_at = case
      when public.user_daily_progress.goal_completed then public.user_daily_progress.completed_at
      when (
        case
          when not public.user_daily_progress.viewed_fact_ids @> array[p_fact_id]
          then public.user_daily_progress.facts_read_count + 1
          else public.user_daily_progress.facts_read_count
        end
      ) >= v_goal then now()
      else public.user_daily_progress.completed_at
    end;

  return query
  select
    progress.facts_read_count,
    progress.daily_goal,
    progress.goal_completed,
    progress.goal_completed and not coalesce(v_completed_before, false),
    v_unique_view_created
  from public.user_daily_progress as progress
  where progress.user_id = v_user_id
    and progress.progress_date = p_progress_date;

end;
$$;

grant execute on function public.record_fact_read(uuid, date, integer) to authenticated;
