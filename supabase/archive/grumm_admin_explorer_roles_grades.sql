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
