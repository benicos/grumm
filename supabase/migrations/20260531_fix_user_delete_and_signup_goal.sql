create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_goal integer := 10;
  v_raw_daily_goal integer;
  v_learning_goal text := 'strengthen';
  v_username text := coalesce(
    public.normalize_username(new.raw_user_meta_data->>'username'),
    concat('user_', left(replace(new.id::text, '-', ''), 19))
  );
begin
  -- The signup form stores product preferences in Auth metadata first because
  -- email-confirmation flows cannot always write the profile from the browser.
  begin
    v_raw_daily_goal := nullif(new.raw_user_meta_data->>'daily_goal', '')::integer;
  exception when others then
    v_raw_daily_goal := null;
  end;

  if v_raw_daily_goal in (5, 10, 20, 40) then
    v_daily_goal := v_raw_daily_goal;
  end if;

  if new.raw_user_meta_data->>'learning_goal' in ('basics', 'strengthen', 'advanced') then
    v_learning_goal := new.raw_user_meta_data->>'learning_goal';
  end if;

  insert into public.profiles (
    id,
    username,
    avatar_url,
    role,
    daily_goal,
    learning_goal
  )
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'membre',
    v_daily_goal,
    v_learning_goal
  )
  on conflict (id) do update
  set
    daily_goal = excluded.daily_goal,
    learning_goal = excluded.learning_goal,
    username = coalesce(profiles.username, excluded.username),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

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

  -- Analytics rows for authenticated users often have no anonymous_id.
  -- Deleting auth.users first would set user_id to null and violate the
  -- identity checks, so product analytics are removed before the auth delete.
  if to_regclass('public.fact_read_events') is not null then
    execute 'delete from public.fact_read_events where user_id = $1'
    using p_user_id;
  end if;

  if to_regclass('public.analytics_events') is not null then
    execute 'delete from public.analytics_events where user_id = $1'
    using p_user_id;
  end if;

  if to_regclass('public.analytics_sessions') is not null then
    execute 'delete from public.analytics_sessions where user_id = $1'
    using p_user_id;
  end if;

  if to_regclass('public.quiz_answers') is not null then
    execute 'delete from public.quiz_answers where user_id = $1'
    using p_user_id;
  end if;

  if to_regclass('public.quiz_sessions') is not null then
    execute 'delete from public.quiz_sessions where user_id = $1'
    using p_user_id;
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
