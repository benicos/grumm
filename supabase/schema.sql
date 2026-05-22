-- Schema complet Grumm
-- Fichier canonique g?n?r? pour Grumm.
-- ? appliquer sur une base neuve ou une base Grumm deja amorcee.
-- Les mises a niveau ci-dessous ajoutent les objets manquants sans DROP TABLE
-- ni purge. Les changements destructifs restent documentes en commentaire.

-- ==================================================
-- Source consolid?e : schema.sql
-- ==================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent with schema public;

do $$
begin
  if not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'fact_status'
  ) then
    create type public.fact_status as enum ('draft', 'published', 'archived');
  end if;
end;
$$;

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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  accent_color text not null default '#ffd166',
  tone text not null default 'from-[#0b1424] via-[#132744] to-[#f0a95a]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique,
  title text not null,
  hook text not null,
  content text not null,
  long_content text,
  source text not null,
  source_url text,
  status public.fact_status not null default 'draft',
  published_at timestamptz,
  display_order integer not null default 0,
  tone text,
  accent_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_url text,
  daily_goal integer not null default 10 check (daily_goal between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_user_id_fact_id_key unique (user_id, fact_id)
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saves_user_id_fact_id_key unique (user_id, fact_id)
);

create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists public.user_fact_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  constraint user_fact_views_user_id_fact_id_key unique (user_id, fact_id)
);

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

alter table public.categories add column if not exists name text;
alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists accent_color text not null default '#ffd166';
alter table public.categories add column if not exists tone text not null default 'from-[#0b1424] via-[#132744] to-[#f0a95a]';
alter table public.categories add column if not exists created_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();

alter table public.facts add column if not exists category_id uuid;
alter table public.facts add column if not exists slug text;
alter table public.facts add column if not exists title text;
alter table public.facts add column if not exists hook text;
alter table public.facts add column if not exists content text;
alter table public.facts add column if not exists long_content text;
alter table public.facts add column if not exists source text;
alter table public.facts add column if not exists source_url text;
alter table public.facts add column if not exists status public.fact_status not null default 'draft';
alter table public.facts add column if not exists published_at timestamptz;
alter table public.facts add column if not exists display_order integer not null default 0;
alter table public.facts add column if not exists tone text;
alter table public.facts add column if not exists accent_color text;
alter table public.facts add column if not exists created_at timestamptz not null default now();
alter table public.facts add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists daily_goal integer not null default 10;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.likes add column if not exists user_id uuid;
alter table public.likes add column if not exists fact_id uuid;
alter table public.likes add column if not exists created_at timestamptz not null default now();
alter table public.saves add column if not exists user_id uuid;
alter table public.saves add column if not exists fact_id uuid;
alter table public.saves add column if not exists created_at timestamptz not null default now();
alter table public.views add column if not exists user_id uuid;
alter table public.views add column if not exists fact_id uuid;
alter table public.views add column if not exists viewed_at timestamptz not null default now();

alter table public.user_fact_views add column if not exists user_id uuid;
alter table public.user_fact_views add column if not exists fact_id uuid;
alter table public.user_fact_views add column if not exists first_viewed_at timestamptz not null default now();
alter table public.user_daily_progress add column if not exists user_id uuid;
alter table public.user_daily_progress add column if not exists progress_date date;
alter table public.user_daily_progress add column if not exists viewed_fact_ids uuid[] not null default '{}';
alter table public.user_daily_progress add column if not exists facts_read_count integer not null default 0;
alter table public.user_daily_progress add column if not exists daily_goal integer not null default 10;
alter table public.user_daily_progress add column if not exists goal_completed boolean not null default false;
alter table public.user_daily_progress add column if not exists completed_at timestamptz;
alter table public.user_daily_progress add column if not exists created_at timestamptz not null default now();
alter table public.user_daily_progress add column if not exists updated_at timestamptz not null default now();

-- Existing installations with incompatible column types or orphan rows need a
-- reviewed manual migration before adding stricter NOT NULL/FK constraints.

create index if not exists categories_slug_idx on public.categories (slug);
create index if not exists facts_status_published_at_idx on public.facts (status, published_at desc);
create index if not exists facts_slug_idx on public.facts (slug);
create index if not exists facts_category_id_idx on public.facts (category_id);
create index if not exists likes_user_id_idx on public.likes (user_id);
create index if not exists likes_fact_id_idx on public.likes (fact_id);
create index if not exists saves_user_id_idx on public.saves (user_id);
create index if not exists saves_fact_id_idx on public.saves (fact_id);
create index if not exists views_user_id_viewed_at_idx on public.views (user_id, viewed_at desc);
create index if not exists views_fact_id_idx on public.views (fact_id);
create index if not exists user_fact_views_user_id_idx on public.user_fact_views (user_id);
create index if not exists user_fact_views_fact_id_idx on public.user_fact_views (fact_id);
create index if not exists user_daily_progress_user_id_date_idx on public.user_daily_progress (user_id, progress_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists facts_set_updated_at on public.facts;
create trigger facts_set_updated_at
before update on public.facts
for each row execute function public.set_updated_at();

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_daily_progress_set_updated_at on public.user_daily_progress;
create trigger user_daily_progress_set_updated_at
before update on public.user_daily_progress
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      public.normalize_username(new.raw_user_meta_data->>'username'),
      concat('user_', left(replace(new.id::text, '-', ''), 19))
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.categories enable row level security;
alter table public.facts enable row level security;
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.views enable row level security;
alter table public.user_fact_views enable row level security;
alter table public.user_daily_progress enable row level security;

drop policy if exists "Public can read categories" on public.categories;
drop policy if exists "Public can read published facts" on public.facts;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Public can check usernames" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read own likes" on public.likes;
drop policy if exists "Users can create own likes" on public.likes;
drop policy if exists "Users can delete own likes" on public.likes;
drop policy if exists "Users can read own saves" on public.saves;
drop policy if exists "Users can create own saves" on public.saves;
drop policy if exists "Users can delete own saves" on public.saves;
drop policy if exists "Users can read own views" on public.views;
drop policy if exists "Users can create own views" on public.views;
drop policy if exists "Users can delete own views" on public.views;
drop policy if exists "Users can read own fact views" on public.user_fact_views;
drop policy if exists "Users can create own fact views" on public.user_fact_views;
drop policy if exists "Users can read own daily progress" on public.user_daily_progress;
drop policy if exists "Users can create own daily progress" on public.user_daily_progress;
drop policy if exists "Users can update own daily progress" on public.user_daily_progress;

create policy "Public can read categories"
on public.categories for select
using (true);

create policy "Public can read published facts"
on public.facts for select
using (status = 'published');

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Public can check usernames"
on public.profiles for select
using (true);

create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own likes"
on public.likes for select
using (auth.uid() = user_id);

create policy "Users can create own likes"
on public.likes for insert
with check (auth.uid() = user_id);

create policy "Users can delete own likes"
on public.likes for delete
using (auth.uid() = user_id);

create policy "Users can read own saves"
on public.saves for select
using (auth.uid() = user_id);

create policy "Users can create own saves"
on public.saves for insert
with check (auth.uid() = user_id);

create policy "Users can delete own saves"
on public.saves for delete
using (auth.uid() = user_id);

create policy "Users can read own views"
on public.views for select
using (auth.uid() = user_id);

create policy "Users can create own views"
on public.views for insert
with check (auth.uid() = user_id);

create policy "Users can delete own views"
on public.views for delete
using (auth.uid() = user_id);

create policy "Users can read own fact views"
on public.user_fact_views for select
using (auth.uid() = user_id);

create policy "Users can create own fact views"
on public.user_fact_views for insert
with check (auth.uid() = user_id);

create policy "Users can read own daily progress"
on public.user_daily_progress for select
using (auth.uid() = user_id);

create policy "Users can create own daily progress"
on public.user_daily_progress for insert
with check (auth.uid() = user_id);

create policy "Users can update own daily progress"
on public.user_daily_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- PostgreSQL cannot CREATE OR REPLACE a RETURNS TABLE function when a
-- previously applied migration changed its OUT columns. Rebuild this function
-- object from the schema before the consolidated versions below are applied;
-- no table data is touched.
drop function if exists public.record_fact_read(uuid, date, integer);

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


-- ==================================================
-- Source consolid?e : auth.sql
-- ==================================================

create extension if not exists unaccent with schema public;

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

alter table public.profiles
add column if not exists avatar_url text;

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

create unique index if not exists likes_user_id_fact_id_unique_idx
on public.likes (user_id, fact_id);

create unique index if not exists saves_user_id_fact_id_unique_idx
on public.saves (user_id, fact_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := coalesce(
    public.normalize_username(new.raw_user_meta_data->>'username'),
    concat('user_', left(replace(new.id::text, '-', ''), 19))
  );
begin

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

drop policy if exists "Public can check usernames" on public.profiles;
create policy "Public can check usernames"
on public.profiles for select
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own likes" on public.likes;
create policy "Users can read own likes"
on public.likes for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own likes" on public.likes;
create policy "Users can create own likes"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.likes;
create policy "Users can delete own likes"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own saves" on public.saves;
create policy "Users can read own saves"
on public.saves for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own saves" on public.saves;
create policy "Users can create own saves"
on public.saves for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saves" on public.saves;
create policy "Users can delete own saves"
on public.saves for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own views" on public.views;
create policy "Users can read own views"
on public.views for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own views" on public.views;
create policy "Users can create own views"
on public.views for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own views" on public.views;
create policy "Users can delete own views"
on public.views for delete
using (auth.uid() = user_id);


-- ==================================================
-- Source consolid?e : grumm_urls_progress.sql
-- ==================================================

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
  v_username text := coalesce(
    public.normalize_username(new.raw_user_meta_data->>'username'),
    concat('user_', left(replace(new.id::text, '-', ''), 19))
  );
begin

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


-- ==================================================
-- Source consolid?e : grumm_roles_profile_admin.sql
-- ==================================================

alter table public.profiles
add column if not exists role text not null default 'membre';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('membre', 'redacteur', 'administrateur'));

alter table public.facts
add column if not exists author_id uuid references auth.users(id) on delete set null;

create index if not exists facts_author_id_idx
on public.facts (author_id);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'membre'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'administrateur';
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('redacteur', 'administrateur');
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_editor_or_admin() to authenticated;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username = public.normalize_username(p_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon;
grant execute on function public.is_username_available(text) to authenticated;

drop policy if exists "Public can check usernames" on public.profiles;

create or replace function public.set_fact_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is null and auth.uid() is not null then
    new.author_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists facts_set_author on public.facts;
create trigger facts_set_author
before insert on public.facts
for each row execute function public.set_fact_author();

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_request_role text := coalesce(auth.role(), '');
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Direct SQL migrations and Supabase maintenance contexts do not carry a JWT
  -- user. They still need to be able to backfill or bootstrap roles.
  if v_request_user_id is null and v_request_role = '' then
    return new;
  end if;

  -- Service role bypasses RLS in Supabase, but triggers still run.
  if v_request_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'role_update_forbidden'
    using errcode = '42501', message = 'role_update_forbidden';

  return new;
end;
$$;

drop trigger if exists profiles_protect_role_change on public.profiles;
create trigger profiles_protect_role_change
before update on public.profiles
for each row execute function public.protect_profile_role_change();

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Editors can read all facts" on public.facts;
create policy "Editors can read all facts"
on public.facts for select
using (public.is_editor_or_admin());

drop policy if exists "Editors can create facts" on public.facts;
create policy "Editors can create facts"
on public.facts for insert
with check (
  public.is_admin()
  or (
    public.is_editor_or_admin()
    and coalesce(author_id, auth.uid()) = auth.uid()
  )
);

drop policy if exists "Editors can update own facts" on public.facts;
create policy "Editors can update own facts"
on public.facts for update
using (
  public.is_admin()
  or (
    public.current_user_role() = 'redacteur'
    and author_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'redacteur'
    and author_id = auth.uid()
  )
);

drop policy if exists "Editors can delete own facts" on public.facts;
create policy "Editors can delete own facts"
on public.facts for delete
using (
  public.is_admin()
  or (
    public.current_user_role() = 'redacteur'
    and author_id = auth.uid()
  )
);

drop policy if exists "Users can delete own fact views" on public.user_fact_views;
create policy "Users can delete own fact views"
on public.user_fact_views for delete
using (auth.uid() = user_id);

drop policy if exists "Users can delete own daily progress" on public.user_daily_progress;
create policy "Users can delete own daily progress"
on public.user_daily_progress for delete
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := coalesce(
    public.normalize_username(new.raw_user_meta_data->>'username'),
    concat('user_', left(replace(new.id::text, '-', ''), 19))
  );
begin

  insert into public.profiles (id, username, avatar_url, role)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'membre'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop function if exists public.record_fact_read(uuid, date, integer);

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
  unique_view_created boolean,
  completed_goals_count integer
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
    v_unique_view_created,
    (
      select count(*)::integer
      from public.user_daily_progress as goals
      where goals.user_id = v_user_id
        and goals.goal_completed = true
    )
  from public.user_daily_progress as progress
  where progress.user_id = v_user_id
    and progress.progress_date = p_progress_date;

end;
$$;

grant execute on function public.record_fact_read(uuid, date, integer) to authenticated;

-- First administrator setup:
-- Run this manually once with a trusted Supabase SQL editor session, replacing the UUID:
-- update public.profiles set role = 'administrateur' where id = '00000000-0000-0000-0000-000000000000';


-- ==================================================
-- Source consolid?e : grumm_role_trigger_fix.sql
-- ==================================================

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_request_role text := coalesce(auth.role(), '');
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Direct SQL migrations and Supabase maintenance contexts do not carry a JWT
  -- user. They still need to be able to backfill or bootstrap roles.
  if v_request_user_id is null and v_request_role = '' then
    return new;
  end if;

  -- Service role bypasses RLS in Supabase, but triggers still run.
  if v_request_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'role_update_forbidden'
    using errcode = '42501', message = 'role_update_forbidden';

  return new;
end;
$$;

drop trigger if exists profiles_protect_role_change on public.profiles;
create trigger profiles_protect_role_change
before update on public.profiles
for each row execute function public.protect_profile_role_change();


-- ==================================================
-- Source consolid?e : grumm_fact_review_feed.sql
-- ==================================================

alter table public.profiles
add column if not exists role text not null default 'membre';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('membre', 'redacteur', 'administrateur'));

alter table public.facts
add column if not exists author_id uuid references auth.users(id) on delete set null;

create index if not exists facts_author_id_idx
on public.facts (author_id);

drop policy if exists "Public can read published facts" on public.facts;
drop policy if exists "Editors can read all facts" on public.facts;
drop policy if exists "Admins can read all facts" on public.facts;
drop policy if exists "Editors can read own facts" on public.facts;
drop policy if exists "Editors can create facts" on public.facts;
drop policy if exists "Admins can create facts" on public.facts;
drop policy if exists "Editors can submit facts" on public.facts;
drop policy if exists "Editors can update own facts" on public.facts;
drop policy if exists "Admins can update facts" on public.facts;
drop policy if exists "Editors can update own review facts" on public.facts;
drop policy if exists "Editors can delete own facts" on public.facts;
drop policy if exists "Admins can delete facts" on public.facts;

alter table public.facts
alter column status drop default;

alter table public.facts
drop constraint if exists facts_status_check;

alter table public.facts
alter column status type text using status::text;

-- Keep public.fact_status when upgrading existing databases. Facts are migrated
-- to text below; removing a type automatically is unnecessary and destructive
-- for any external view/function that still references the enum.

alter table public.facts
alter column status set default 'draft';

alter table public.facts
add constraint facts_status_check
check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived'));

update public.facts
set published_at = coalesce(published_at, created_at)
where status = 'published'
  and published_at is null;

create index if not exists facts_status_category_idx
on public.facts (status, category_id);

create index if not exists facts_author_status_idx
on public.facts (author_id, status);

revoke select on public.facts from anon, authenticated;
grant select (
  id,
  category_id,
  slug,
  title,
  hook,
  content,
  long_content,
  source,
  source_url,
  status,
  published_at,
  display_order,
  tone,
  accent_color,
  created_at,
  updated_at
) on public.facts to anon, authenticated;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'membre'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'administrateur';
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('redacteur', 'administrateur');
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_editor_or_admin() to authenticated;

create or replace function public.enforce_fact_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_role text := coalesce(auth.role(), '');
  v_app_role text := public.current_user_role();
begin
  if tg_op = 'INSERT' and new.author_id is null and v_user_id is not null then
    new.author_id := v_user_id;
  end if;

  if v_auth_role = 'service_role' or v_user_id is null then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    elsif new.status <> 'published' then
      new.published_at := null;
    end if;

    return new;
  end if;

  if v_app_role = 'administrateur' then
    if new.status = 'published' then
      new.published_at := coalesce(
        new.published_at,
        case when tg_op = 'UPDATE' then old.published_at else null end,
        now()
      );
    else
      new.published_at := null;
    end if;

    return new;
  end if;

  if v_app_role = 'redacteur' then
    if tg_op = 'INSERT' then
      new.author_id := v_user_id;
      new.status := 'pending_review';
      new.published_at := null;
      return new;
    end if;

    if new.author_id is distinct from old.author_id then
      raise exception 'fact_author_update_forbidden'
        using errcode = '42501', message = 'fact_author_update_forbidden';
    end if;

    if old.status = 'published' then
      raise exception 'published_fact_update_forbidden'
        using errcode = '42501', message = 'published_fact_update_forbidden';
    end if;

    if new.status not in ('draft', 'pending_review') then
      raise exception 'fact_status_update_forbidden'
        using errcode = '42501', message = 'fact_status_update_forbidden';
    end if;

    new.published_at := null;
    return new;
  end if;

  raise exception 'fact_write_forbidden'
    using errcode = '42501', message = 'fact_write_forbidden';
end;
$$;

drop trigger if exists facts_set_author on public.facts;
drop trigger if exists facts_enforce_workflow on public.facts;

create trigger facts_enforce_workflow
before insert or update on public.facts
for each row execute function public.enforce_fact_workflow();

create policy "Public can read published facts"
on public.facts for select
using (status = 'published');

create policy "Admins can read all facts"
on public.facts for select
using (public.is_admin());

create policy "Editors can read own facts"
on public.facts for select
using (
  public.current_user_role() = 'redacteur'
  and author_id = auth.uid()
);

create policy "Admins can create facts"
on public.facts for insert
with check (public.is_admin());

create policy "Editors can submit facts"
on public.facts for insert
with check (
  public.current_user_role() = 'redacteur'
  and author_id = auth.uid()
  and status = 'pending_review'
);

create policy "Admins can update facts"
on public.facts for update
using (public.is_admin())
with check (public.is_admin());

create policy "Editors can update own review facts"
on public.facts for update
using (
  public.current_user_role() = 'redacteur'
  and author_id = auth.uid()
  and status in ('draft', 'pending_review', 'rejected')
)
with check (
  public.current_user_role() = 'redacteur'
  and author_id = auth.uid()
  and status in ('draft', 'pending_review')
);

create policy "Admins can delete facts"
on public.facts for delete
using (public.is_admin());

drop policy if exists "Public can check usernames" on public.profiles;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
using (public.is_admin());

drop policy if exists "Users can create own likes" on public.likes;
create policy "Users can create own likes"
on public.likes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.facts
    where facts.id = fact_id
      and facts.status = 'published'
  )
);

drop policy if exists "Users can create own saves" on public.saves;
create policy "Users can create own saves"
on public.saves for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.facts
    where facts.id = fact_id
      and facts.status = 'published'
  )
);

drop policy if exists "Users can create own fact views" on public.user_fact_views;
create policy "Users can create own fact views"
on public.user_fact_views for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.facts
    where facts.id = fact_id
      and facts.status = 'published'
  )
);

drop function if exists public.record_fact_read(uuid, date, integer);

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
  unique_view_created boolean,
  completed_goals_count integer
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

  if not exists (
    select 1
    from public.facts
    where id = p_fact_id
      and status = 'published'
  ) then
    raise exception 'fact_not_published'
      using errcode = '42501', message = 'fact_not_published';
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
    v_unique_view_created,
    (
      select count(*)::integer
      from public.user_daily_progress as goals
      where goals.user_id = v_user_id
        and goals.goal_completed = true
    )
  from public.user_daily_progress as progress
  where progress.user_id = v_user_id
    and progress.progress_date = p_progress_date;
end;
$$;

grant execute on function public.record_fact_read(uuid, date, integer) to authenticated;

create or replace function public.get_admin_fact_authors(
  p_fact_ids uuid[] default '{}'
)
returns table (
  fact_id uuid,
  author_id uuid,
  username text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    facts.id as fact_id,
    facts.author_id,
    profiles.username,
    profiles.role
  from public.facts
  left join public.profiles
    on profiles.id = facts.author_id
  where facts.id = any(coalesce(p_fact_ids, '{}'))
    and (
      public.is_admin()
      or (
        public.current_user_role() = 'redacteur'
        and facts.author_id = auth.uid()
      )
    );
$$;

grant execute on function public.get_admin_fact_authors(uuid[]) to authenticated;

create or replace function public.get_discover_feed(
  p_limit integer default 18,
  p_theme_slug text default null,
  p_exclude_ids uuid[] default '{}'
)
returns table (
  id uuid,
  slug text,
  title text,
  hook text,
  content text,
  source text,
  source_url text,
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
  v_unseen_count integer := 0;
  v_seen_count integer := 0;
  v_unseen_target integer := 0;
  v_seen_target integer := 0;
begin
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
      order by random()
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
    order by random()
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
    order by random()
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

grant execute on function public.get_discover_feed(integer, text, uuid[]) to anon;
grant execute on function public.get_discover_feed(integer, text, uuid[]) to authenticated;


-- ==================================================
-- Source consolid?e : grumm_admin_profiles_type_fix.sql
-- ==================================================

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


-- ==================================================
-- Source consolid?e : grumm_admin_explorer_roles_grades.sql
-- ==================================================

create table if not exists public.roles (
  slug text primary key check (slug ~ '^[a-z0-9_]{3,40}$'),
  name text not null,
  description text,
  permissions jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  name text not null,
  required_goals integer not null check (required_goals >= 0),
  description text,
  badge text,
  display_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.roles (slug, name, description, permissions, is_system)
values
  (
    'membre',
    'Membre',
    'Lecture, progression personnelle et interactions.',
    '["facts.read","profile.manage","interactions.manage"]'::jsonb,
    true
  ),
  (
    'redacteur',
    'Redacteur',
    'Creation de faits soumis a validation.',
    '["facts.read","profile.manage","interactions.manage","admin.access","facts.create","facts.manage_own"]'::jsonb,
    true
  ),
  (
    'administrateur',
    'Administrateur',
    'Acces complet a l''administration Grumm.',
    '["facts.read","profile.manage","interactions.manage","admin.access","facts.create","facts.manage","facts.publish","themes.manage","users.manage","users.delete","roles.manage","grades.manage"]'::jsonb,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  permissions = excluded.permissions,
  is_system = true;

insert into public.grades (slug, name, required_goals, description, badge, display_order, is_system)
values
  ('curieux-debutant', 'Curieux debutant', 0, 'Premier palier de curiosite.', 'spark', 10, true),
  ('explorateur-regulier', 'Explorateur regulier', 2, 'La routine de lecture s''installe.', 'compass', 20, true),
  ('esprit-assidu', 'Esprit assidu', 10, 'Une vraie regularite de progression.', 'flame', 30, true),
  ('maitre-curiosite', 'Maitre de la curiosite', 50, 'Objectifs atteints avec constance.', 'medal', 40, true),
  ('legende-savoir', 'Legende du savoir', 100, 'Dernier palier de progression.', 'crown', 50, true)
on conflict (slug) do update
set
  name = excluded.name,
  required_goals = excluded.required_goals,
  description = excluded.description,
  badge = excluded.badge,
  display_order = excluded.display_order,
  is_system = true;

alter table public.profiles
add column if not exists role text not null default 'membre';

alter table public.profiles
drop constraint if exists profiles_role_check;

update public.profiles as profiles
set role = 'membre'
where not exists (
  select 1
  from public.roles as roles
  where roles.slug = profiles.role
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_fkey
    foreign key (role)
    references public.roles(slug)
    on update cascade
    on delete restrict;
  end if;
end;
$$;

create index if not exists roles_created_at_idx on public.roles (created_at desc);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists grades_required_goals_idx on public.grades (required_goals, display_order);
create index if not exists likes_created_fact_idx on public.likes (created_at, fact_id);
create index if not exists saves_created_fact_idx on public.saves (created_at, fact_id);
create index if not exists facts_search_simple_idx
on public.facts using gin (
  to_tsvector(
    'simple',
    coalesce(title, '') || ' ' ||
    coalesce(hook, '') || ' ' ||
    coalesce(content, '') || ' ' ||
    coalesce(source, '') || ' ' ||
    coalesce(source_url, '')
  )
);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists grades_set_updated_at on public.grades;
create trigger grades_set_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

create or replace function public.role_has_permission(
  p_role text,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.roles as roles
    where roles.slug = p_role
      and (
        roles.slug = 'administrateur'
        or roles.permissions ? p_permission
      )
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profiles.role from public.profiles as profiles where profiles.id = auth.uid()),
    'membre'
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.role_has_permission(public.current_user_role(), p_permission);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'administrateur';
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('facts.manage')
    or public.has_permission('facts.create')
    or public.has_permission('facts.manage_own');
$$;

grant execute on function public.role_has_permission(text, text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_editor_or_admin() to authenticated;

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_request_role text := coalesce(auth.role(), '');
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  if v_request_user_id is null and v_request_role = '' then
    return new;
  end if;

  if v_request_role = 'service_role' then
    return new;
  end if;

  if public.has_permission('users.manage') then
    return new;
  end if;

  raise exception 'role_update_forbidden'
    using errcode = '42501', message = 'role_update_forbidden';
end;
$$;

drop trigger if exists profiles_protect_role_change on public.profiles;
create trigger profiles_protect_role_change
before update on public.profiles
for each row execute function public.protect_profile_role_change();

create or replace function public.enforce_fact_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_role text := coalesce(auth.role(), '');
  v_can_create boolean := public.has_permission('facts.create');
  v_can_manage boolean := public.has_permission('facts.manage');
  v_can_manage_own boolean := public.has_permission('facts.manage_own');
  v_can_publish boolean := public.has_permission('facts.publish');
begin
  if tg_op = 'INSERT' and new.author_id is null and v_user_id is not null then
    new.author_id := v_user_id;
  end if;

  if v_auth_role = 'service_role' or v_user_id is null then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    elsif new.status <> 'published' then
      new.published_at := null;
    end if;

    return new;
  end if;

  if v_can_manage then
    if new.status = 'published' then
      new.published_at := coalesce(
        new.published_at,
        case when tg_op = 'UPDATE' then old.published_at else null end,
        now()
      );
    else
      new.published_at := null;
    end if;

    return new;
  end if;

  if v_can_publish and tg_op = 'UPDATE' then
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, old.published_at, now());
    else
      new.published_at := null;
    end if;

    return new;
  end if;

  if v_can_create or v_can_manage_own then
    if tg_op = 'INSERT' then
      new.author_id := v_user_id;
      new.status := 'pending_review';
      new.published_at := null;
      return new;
    end if;

    if new.author_id is distinct from old.author_id then
      raise exception 'fact_author_update_forbidden'
        using errcode = '42501', message = 'fact_author_update_forbidden';
    end if;

    if old.status = 'published' then
      raise exception 'published_fact_update_forbidden'
        using errcode = '42501', message = 'published_fact_update_forbidden';
    end if;

    if new.status not in ('draft', 'pending_review') then
      raise exception 'fact_status_update_forbidden'
        using errcode = '42501', message = 'fact_status_update_forbidden';
    end if;

    new.published_at := null;
    return new;
  end if;

  raise exception 'fact_write_forbidden'
    using errcode = '42501', message = 'fact_write_forbidden';
end;
$$;

drop trigger if exists facts_enforce_workflow on public.facts;
create trigger facts_enforce_workflow
before insert or update on public.facts
for each row execute function public.enforce_fact_workflow();

create or replace function public.protect_role_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.slug = 'administrateur' or old.is_system then
      raise exception 'system_role_delete_forbidden'
        using errcode = '42501', message = 'system_role_delete_forbidden';
    end if;

    return old;
  end if;

  if new.slug = 'administrateur' then
    new.is_system := true;

    if not (
      new.permissions ? 'admin.access'
      and new.permissions ? 'roles.manage'
      and new.permissions ? 'users.manage'
      and new.permissions ? 'users.delete'
    ) then
      raise exception 'administrator_permissions_required'
        using errcode = '42501', message = 'administrator_permissions_required';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.is_system and old.slug <> new.slug then
    raise exception 'system_role_slug_update_forbidden'
      using errcode = '42501', message = 'system_role_slug_update_forbidden';
  end if;

  return new;
end;
$$;

drop trigger if exists roles_protect_write on public.roles;
create trigger roles_protect_write
before update or delete on public.roles
for each row execute function public.protect_role_write();

alter table public.roles enable row level security;
alter table public.grades enable row level security;

drop policy if exists "Authenticated can read roles" on public.roles;
create policy "Authenticated can read roles"
on public.roles for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage roles" on public.roles;
create policy "Admins can manage roles"
on public.roles for all
using (public.has_permission('roles.manage'))
with check (public.has_permission('roles.manage'));

drop policy if exists "Public can read grades" on public.grades;
create policy "Public can read grades"
on public.grades for select
using (true);

drop policy if exists "Admins can manage grades" on public.grades;
create policy "Admins can manage grades"
on public.grades for all
using (public.has_permission('grades.manage'))
with check (public.has_permission('grades.manage'));

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
on public.categories for all
using (public.has_permission('themes.manage'))
with check (public.has_permission('themes.manage'));

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
using (
  public.has_permission('users.manage')
  or public.has_permission('roles.manage')
);

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
using (public.has_permission('users.manage'))
with check (public.has_permission('users.manage'));

drop policy if exists "Admins can read all facts" on public.facts;
create policy "Admins can read all facts"
on public.facts for select
using (public.has_permission('facts.manage') or public.has_permission('facts.publish'));

drop policy if exists "Editors can read own facts" on public.facts;
create policy "Editors can read own facts"
on public.facts for select
using (
  public.has_permission('facts.manage_own')
  and author_id = auth.uid()
);

drop policy if exists "Admins can create facts" on public.facts;
create policy "Admins can create facts"
on public.facts for insert
with check (public.has_permission('facts.manage'));

drop policy if exists "Editors can submit facts" on public.facts;
create policy "Editors can submit facts"
on public.facts for insert
with check (
  public.has_permission('facts.create')
  and author_id = auth.uid()
  and status = 'pending_review'
);

drop policy if exists "Admins can update facts" on public.facts;
create policy "Admins can update facts"
on public.facts for update
using (public.has_permission('facts.manage') or public.has_permission('facts.publish'))
with check (public.has_permission('facts.manage') or public.has_permission('facts.publish'));

drop policy if exists "Editors can update own review facts" on public.facts;
create policy "Editors can update own review facts"
on public.facts for update
using (
  public.has_permission('facts.manage_own')
  and author_id = auth.uid()
  and status in ('draft', 'pending_review', 'rejected')
)
with check (
  public.has_permission('facts.manage_own')
  and author_id = auth.uid()
  and status in ('draft', 'pending_review')
);

drop policy if exists "Admins can delete facts" on public.facts;
create policy "Admins can delete facts"
on public.facts for delete
using (public.has_permission('facts.manage'));

drop policy if exists "Editors can delete own facts" on public.facts;
create policy "Editors can delete own facts"
on public.facts for delete
using (
  public.has_permission('facts.manage_own')
  and author_id = auth.uid()
  and status in ('draft', 'pending_review', 'rejected')
);

grant select, insert, update, delete on public.roles to authenticated;
grant select on public.grades to anon, authenticated;
grant insert, update, delete on public.grades to authenticated;

drop function if exists public.record_fact_read(uuid, date, integer);

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
  unique_view_created boolean,
  completed_goals_count integer
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

  if not exists (
    select 1
    from public.facts as published_fact
    where published_fact.id = p_fact_id
      and published_fact.status = 'published'
  ) then
    raise exception 'fact_not_published'
      using errcode = '42501', message = 'fact_not_published';
  end if;

  insert into public.user_fact_views (user_id, fact_id)
  values (v_user_id, p_fact_id)
  on conflict (user_id, fact_id) do nothing;

  get diagnostics v_inserted_count = row_count;
  v_unique_view_created := v_inserted_count > 0;

  select coalesce(progress.goal_completed, false)
  into v_completed_before
  from public.user_daily_progress as progress
  where progress.user_id = v_user_id
    and progress.progress_date = p_progress_date;

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
    v_unique_view_created,
    (
      select count(*)::integer
      from public.user_daily_progress as goals
      where goals.user_id = v_user_id
        and goals.goal_completed is true
    )
  from public.user_daily_progress as progress
  where progress.user_id = v_user_id
    and progress.progress_date = p_progress_date;
end;
$$;

grant execute on function public.record_fact_read(uuid, date, integer) to authenticated;

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
  published_facts_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    categories.id,
    categories.name,
    categories.slug,
    categories.tone,
    categories.accent_color,
    count(facts.id)::integer as published_facts_count
  from public.categories as categories
  left join public.facts as facts
    on facts.category_id = categories.id
   and facts.status = 'published'
  where
    nullif(trim(coalesce(p_query, '')), '') is null
    or categories.name ilike '%' || trim(p_query) || '%'
    or categories.slug ilike '%' || trim(p_query) || '%'
  group by categories.id
  order by published_facts_count desc, categories.name asc
  limit greatest(1, least(coalesce(p_limit, 18), 60));
$$;

grant execute on function public.get_explorer_themes(integer, text) to anon;
grant execute on function public.get_explorer_themes(integer, text) to authenticated;

create or replace function public.search_published_facts(
  p_query text,
  p_limit integer default 30
)
returns table (
  id uuid,
  slug text,
  title text,
  hook text,
  content text,
  source text,
  source_url text,
  tone text,
  accent_color text,
  category_id uuid,
  category_name text,
  category_slug text,
  category_tone text,
  category_accent_color text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(trim(coalesce(p_query, '')), '') as query_text
  ),
  search_query as (
    select
      query_text,
      websearch_to_tsquery('simple', query_text) as ts_query
    from normalized
    where query_text is not null
  )
  select
    facts.id,
    facts.slug,
    facts.title,
    facts.hook,
    facts.content,
    facts.source,
    facts.source_url,
    facts.tone,
    facts.accent_color,
    facts.category_id,
    categories.name as category_name,
    categories.slug as category_slug,
    categories.tone as category_tone,
    categories.accent_color as category_accent_color,
    ts_rank_cd(
      to_tsvector(
        'simple',
        coalesce(facts.title, '') || ' ' ||
        coalesce(facts.hook, '') || ' ' ||
        coalesce(facts.content, '') || ' ' ||
        coalesce(facts.source, '') || ' ' ||
        coalesce(facts.source_url, '') || ' ' ||
        coalesce(categories.name, '')
      ),
      search_query.ts_query
    ) as rank
  from search_query
  join public.facts as facts
    on facts.status = 'published'
  join public.categories as categories
    on categories.id = facts.category_id
  where
    to_tsvector(
      'simple',
      coalesce(facts.title, '') || ' ' ||
      coalesce(facts.hook, '') || ' ' ||
      coalesce(facts.content, '') || ' ' ||
      coalesce(facts.source, '') || ' ' ||
      coalesce(facts.source_url, '') || ' ' ||
      coalesce(categories.name, '')
    ) @@ search_query.ts_query
    or facts.title ilike '%' || search_query.query_text || '%'
    or facts.hook ilike '%' || search_query.query_text || '%'
    or facts.content ilike '%' || search_query.query_text || '%'
    or facts.source ilike '%' || search_query.query_text || '%'
    or facts.source_url ilike '%' || search_query.query_text || '%'
    or categories.name ilike '%' || search_query.query_text || '%'
  order by rank desc, facts.published_at desc nulls last, facts.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

grant execute on function public.search_published_facts(text, integer) to anon;
grant execute on function public.search_published_facts(text, integer) to authenticated;

create or replace function public.get_fact_of_the_day()
returns table (
  id uuid,
  slug text,
  title text,
  hook text,
  content text,
  source text,
  source_url text,
  tone text,
  accent_color text,
  category_id uuid,
  category_name text,
  category_slug text,
  category_tone text,
  category_accent_color text,
  interaction_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with day_bounds as (
    select current_date::timestamptz as starts_at,
           (current_date + 1)::timestamptz as ends_at
  ),
  likes_today as (
    select likes.fact_id, count(*)::integer as count
    from public.likes as likes
    cross join day_bounds
    where likes.created_at >= day_bounds.starts_at
      and likes.created_at < day_bounds.ends_at
    group by likes.fact_id
  ),
  saves_today as (
    select saves.fact_id, count(*)::integer as count
    from public.saves as saves
    cross join day_bounds
    where saves.created_at >= day_bounds.starts_at
      and saves.created_at < day_bounds.ends_at
    group by saves.fact_id
  ),
  scored as (
    select
      facts.id,
      facts.slug,
      facts.title,
      facts.hook,
      facts.content,
      facts.source,
      facts.source_url,
      facts.tone,
      facts.accent_color,
      facts.category_id,
      categories.name as category_name,
      categories.slug as category_slug,
      categories.tone as category_tone,
      categories.accent_color as category_accent_color,
      coalesce(likes_today.count, 0) + coalesce(saves_today.count, 0) as interaction_count
    from public.facts as facts
    join public.categories as categories
      on categories.id = facts.category_id
    left join likes_today on likes_today.fact_id = facts.id
    left join saves_today on saves_today.fact_id = facts.id
    where facts.status = 'published'
  ),
  max_score as (
    select max(scored.interaction_count) as value
    from scored
  )
  select scored.*
  from scored, max_score
  where
    (max_score.value > 0 and scored.interaction_count = max_score.value)
    or max_score.value = 0
  order by random()
  limit 1;
$$;

grant execute on function public.get_fact_of_the_day() to anon;
grant execute on function public.get_fact_of_the_day() to authenticated;

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

create or replace function public.delete_admin_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request_user_id uuid := auth.uid();
begin
  if not public.has_permission('users.delete') then
    raise exception 'user_delete_forbidden'
      using errcode = '42501', message = 'user_delete_forbidden';
  end if;

  if p_user_id is null then
    raise exception 'user_id_required'
      using errcode = '22023', message = 'user_id_required';
  end if;

  if p_user_id = v_request_user_id then
    raise exception 'self_delete_forbidden'
      using errcode = '42501', message = 'self_delete_forbidden';
  end if;

  delete from public.likes where likes.user_id = p_user_id;
  delete from public.saves where saves.user_id = p_user_id;
  delete from public.views where views.user_id = p_user_id;
  delete from public.user_fact_views where user_fact_views.user_id = p_user_id;
  delete from public.user_daily_progress where user_daily_progress.user_id = p_user_id;

  update public.facts
  set author_id = null
  where facts.author_id = p_user_id;

  delete from public.profiles where profiles.id = p_user_id;
  delete from auth.users where users.id = p_user_id;

  return true;
end;
$$;

grant execute on function public.delete_admin_user(uuid) to authenticated;

create or replace function public.get_admin_fact_authors(
  p_fact_ids uuid[] default '{}'
)
returns table (
  fact_id uuid,
  author_id uuid,
  username text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    facts.id as fact_id,
    facts.author_id,
    profiles.username,
    profiles.role
  from public.facts as facts
  left join public.profiles as profiles
    on profiles.id = facts.author_id
  where facts.id = any(coalesce(p_fact_ids, '{}'))
    and (
      public.has_permission('facts.manage')
      or public.has_permission('facts.publish')
      or (
        public.has_permission('facts.manage_own')
        and facts.author_id = auth.uid()
      )
    );
$$;

grant execute on function public.get_admin_fact_authors(uuid[]) to authenticated;


-- ==================================================
-- Source consolid?e : grumm_analytics.sql
-- ==================================================

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  platform text not null check (platform in ('web', 'ios')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  pages_viewed integer not null default 0 check (pages_viewed >= 0),
  facts_viewed integer not null default 0 check (facts_viewed >= 0),
  created_at timestamptz not null default now(),
  constraint analytics_sessions_identity_check check (
    user_id is not null or anonymous_id is not null
  )
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.analytics_sessions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  platform text not null check (platform in ('web', 'ios')),
  created_at timestamptz not null default now(),
  constraint analytics_events_identity_check check (
    user_id is not null or anonymous_id is not null
  )
);

create table if not exists public.fact_read_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.analytics_sessions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  fact_id uuid not null references public.facts(id) on delete cascade,
  platform text not null check (platform in ('web', 'ios')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint fact_read_events_identity_check check (
    user_id is not null or anonymous_id is not null
  )
);

create index if not exists analytics_sessions_started_at_idx
on public.analytics_sessions (started_at desc);

create index if not exists analytics_sessions_user_id_idx
on public.analytics_sessions (user_id);

create index if not exists analytics_sessions_anonymous_id_idx
on public.analytics_sessions (anonymous_id);

create index if not exists analytics_sessions_platform_idx
on public.analytics_sessions (platform);

create index if not exists analytics_events_created_at_idx
on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_name_idx
on public.analytics_events (event_name);

create index if not exists analytics_events_user_id_idx
on public.analytics_events (user_id);

create index if not exists analytics_events_session_id_idx
on public.analytics_events (session_id);

create index if not exists analytics_events_entity_idx
on public.analytics_events (entity_type, entity_id);

create index if not exists fact_read_events_fact_id_idx
on public.fact_read_events (fact_id);

create index if not exists fact_read_events_session_id_idx
on public.fact_read_events (session_id);

create index if not exists fact_read_events_user_id_idx
on public.fact_read_events (user_id);

create index if not exists fact_read_events_created_at_idx
on public.fact_read_events (created_at desc);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.fact_read_events enable row level security;

drop policy if exists "Clients can create analytics sessions" on public.analytics_sessions;
create policy "Clients can create analytics sessions"
on public.analytics_sessions for insert
to anon, authenticated
with check (
  platform in ('web', 'ios')
  and (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and anonymous_id is not null)
  )
);

drop policy if exists "Clients can update analytics sessions" on public.analytics_sessions;
create policy "Clients can update analytics sessions"
on public.analytics_sessions for update
to anon, authenticated
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (user_id is null and anonymous_id is not null)
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (user_id is null and anonymous_id is not null)
);

drop policy if exists "Admins can read analytics sessions" on public.analytics_sessions;
create policy "Admins can read analytics sessions"
on public.analytics_sessions for select
to authenticated
using (public.is_admin());

drop policy if exists "Clients can create analytics events" on public.analytics_events;
create policy "Clients can create analytics events"
on public.analytics_events for insert
to anon, authenticated
with check (
  platform in ('web', 'ios')
  and jsonb_typeof(metadata) = 'object'
  and (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and anonymous_id is not null)
  )
);

drop policy if exists "Admins can read analytics events" on public.analytics_events;
create policy "Admins can read analytics events"
on public.analytics_events for select
to authenticated
using (public.is_admin());

drop policy if exists "Clients can create fact read events" on public.fact_read_events;
create policy "Clients can create fact read events"
on public.fact_read_events for insert
to anon, authenticated
with check (
  platform in ('web', 'ios')
  and (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and anonymous_id is not null)
  )
);

drop policy if exists "Clients can update fact read events" on public.fact_read_events;
create policy "Clients can update fact read events"
on public.fact_read_events for update
to anon, authenticated
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (user_id is null and anonymous_id is not null)
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (user_id is null and anonymous_id is not null)
);

drop policy if exists "Admins can read fact read events" on public.fact_read_events;
create policy "Admins can read fact read events"
on public.fact_read_events for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all likes" on public.likes;
create policy "Admins can read all likes"
on public.likes for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all saves" on public.saves;
create policy "Admins can read all saves"
on public.saves for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all views" on public.views;
create policy "Admins can read all views"
on public.views for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all fact views" on public.user_fact_views;
create policy "Admins can read all fact views"
on public.user_fact_views for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all daily progress" on public.user_daily_progress;
create policy "Admins can read all daily progress"
on public.user_daily_progress for select
to authenticated
using (public.is_admin());
