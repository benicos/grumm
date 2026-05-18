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
  v_username text := public.normalize_username(new.raw_user_meta_data->>'username');
begin
  if v_username is null then
    raise exception 'username_required';
  end if;

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
