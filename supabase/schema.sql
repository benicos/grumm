create extension if not exists pgcrypto;
create extension if not exists unaccent with schema public;

create type public.fact_status as enum ('draft', 'published', 'archived');

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

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  accent_color text not null default '#ffd166',
  tone text not null default 'from-[#0b1424] via-[#132744] to-[#f0a95a]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique,
  title text not null,
  hook text not null,
  content text not null,
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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_url text,
  daily_goal integer not null default 10 check (daily_goal between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_user_id_fact_id_key unique (user_id, fact_id)
);

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saves_user_id_fact_id_key unique (user_id, fact_id)
);

create table public.views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table public.user_fact_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  constraint user_fact_views_user_id_fact_id_key unique (user_id, fact_id)
);

create table public.user_daily_progress (
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

create index categories_slug_idx on public.categories (slug);
create index facts_status_published_at_idx on public.facts (status, published_at desc);
create index facts_slug_idx on public.facts (slug);
create index facts_category_id_idx on public.facts (category_id);
create index likes_user_id_idx on public.likes (user_id);
create index likes_fact_id_idx on public.likes (fact_id);
create index saves_user_id_idx on public.saves (user_id);
create index saves_fact_id_idx on public.saves (fact_id);
create index views_user_id_viewed_at_idx on public.views (user_id, viewed_at desc);
create index views_fact_id_idx on public.views (fact_id);
create index user_fact_views_user_id_idx on public.user_fact_views (user_id);
create index user_fact_views_fact_id_idx on public.user_fact_views (fact_id);
create index user_daily_progress_user_id_date_idx on public.user_daily_progress (user_id, progress_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

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

create trigger facts_set_slug
before insert or update of title, slug on public.facts
for each row execute function public.set_fact_slug();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

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
  if public.normalize_username(new.raw_user_meta_data->>'username') is null then
    raise exception 'username_required';
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    public.normalize_username(new.raw_user_meta_data->>'username'),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

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
