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

drop type if exists public.fact_status;

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
