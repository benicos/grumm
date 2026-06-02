create or replace function public.get_personalized_feed(
  p_user_id uuid default null,
  p_limit integer default 20,
  p_session_id uuid default null,
  p_debug boolean default false,
  p_theme_slug text default null
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
  long_content text,
  seo_title text,
  seo_description text,
  event_day integer,
  event_month integer,
  event_year integer,
  published_at timestamptz,
  updated_at timestamptz,
  tone text,
  accent_color text,
  category_id uuid,
  category_name text,
  category_slug text,
  category_tone text,
  category_accent_color text,
  seen_by_user boolean,
  recommendation_score numeric,
  score_debug jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_is_admin boolean := coalesce(public.is_admin(), false);
  v_user_id uuid := null;
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_pool_limit integer := greatest(200, least(500, v_limit * 18));
  v_debug boolean := coalesce(p_debug, false) and v_is_admin;
  v_learning_goal text := 'strengthen';
begin
  if v_is_admin and p_user_id is not null then
    v_user_id := p_user_id;
  elsif v_auth_user_id is not null then
    v_user_id := v_auth_user_id;
  else
    v_user_id := null;
  end if;

  select coalesce(pr.learning_goal, 'strengthen')
  into v_learning_goal
  from public.profiles pr
  where pr.id = v_user_id;

  v_learning_goal := coalesce(v_learning_goal, 'strengthen');

  if v_learning_goal not in ('basics', 'strengthen', 'advanced') then
    v_learning_goal := 'strengthen';
  end if;

  if p_session_id is not null then
    insert into public.feed_sessions (id, user_id, last_seen_at)
    values (p_session_id, v_user_id, now())
    on conflict on constraint feed_sessions_pkey do update set
      user_id = coalesce(excluded.user_id, public.feed_sessions.user_id),
      last_seen_at = now();
  end if;

  return query
  with theme_affinity as (
    select
      affinity_source.category_id,
      count(*)::numeric as affinity_count
    from (
      select liked_fact.category_id
      from public.likes l
      join public.facts liked_fact on liked_fact.id = l.fact_id
      where l.user_id = v_user_id
      union all
      select saved_fact.category_id
      from public.saves s
      join public.facts saved_fact on saved_fact.id = s.fact_id
      where s.user_id = v_user_id
      union all
      select viewed_fact.category_id
      from public.user_fact_views ufv
      join public.facts viewed_fact on viewed_fact.id = ufv.fact_id
      where ufv.user_id = v_user_id
        and ufv.first_viewed_at >= now() - interval '45 days'
    ) affinity_source
    group by affinity_source.category_id
  ),
  candidate_pool as (
    (
    select f.id as fact_id
    from public.facts f
    join public.categories c on c.id = f.category_id
    where f.status = 'published'
      and (p_theme_slug is null or c.slug = p_theme_slug)
      and not exists (
        select 1
        from public.user_fact_views ufv
        where ufv.user_id = v_user_id
          and ufv.fact_id = f.id
      )
    order by f.published_at desc nulls last, f.updated_at desc
    limit v_pool_limit / 2
    )

    union

    (
    select f.id as fact_id
    from public.facts f
    join public.categories c on c.id = f.category_id
    where f.status = 'published'
      and (p_theme_slug is null or c.slug = p_theme_slug)
      and f.published_at >= now() - interval '90 days'
    order by f.published_at desc nulls last, f.updated_at desc
    limit v_pool_limit / 4
    )

    union

    (
    select f.id as fact_id
    from public.facts f
    join public.categories c on c.id = f.category_id
    join theme_affinity ta on ta.category_id = f.category_id
    where f.status = 'published'
      and (p_theme_slug is null or c.slug = p_theme_slug)
    order by ta.affinity_count desc, f.published_at desc nulls last
    limit v_pool_limit / 4
    )

    union

    (
    select f.id as fact_id
    from public.facts f
    join public.categories c on c.id = f.category_id
    where f.status = 'published'
      and (p_theme_slug is null or c.slug = p_theme_slug)
      and f.event_month = extract(month from current_date)::integer
      and f.event_day between greatest(1, extract(day from current_date)::integer - 2)
        and least(31, extract(day from current_date)::integer + 2)
    order by abs(f.event_day - extract(day from current_date)::integer), f.published_at desc nulls last
    limit 60
    )

    union

    (
    select f.id as fact_id
    from public.facts f
    join public.categories c on c.id = f.category_id
    where f.status = 'published'
      and (p_theme_slug is null or c.slug = p_theme_slug)
    order by random()
    limit greatest(40, v_limit * 3)
    )
  ),
  hydrated as (
    select
      f.id,
      f.slug,
      f.title,
      f.hook,
      f.content,
      f.source,
      f.source_url,
      f.difficulty_level,
      f.long_content,
      f.seo_title,
      f.seo_description,
      f.event_day,
      f.event_month,
      f.event_year,
      f.published_at,
      f.updated_at,
      f.tone,
      f.accent_color,
      f.category_id,
      c.name as category_name,
      c.slug as category_slug,
      c.tone as category_tone,
      c.accent_color as category_accent_color,
      ufv.first_viewed_at,
      fsi.served_at,
      coalesce(ta.affinity_count, 0) as affinity_count,
      coalesce(fes.views_count, 0) as views_count,
      coalesce(fes.unique_viewers_count, 0) as unique_viewers_count,
      coalesce(fes.likes_count, 0) as likes_count,
      coalesce(fes.saves_count, 0) as saves_count,
      coalesce(fes.shares_count, 0) as shares_count
    from candidate_pool cp
    join public.facts f on f.id = cp.fact_id
    join public.categories c on c.id = f.category_id
    left join public.user_fact_views ufv
      on ufv.fact_id = f.id
      and ufv.user_id = v_user_id
    left join public.feed_session_items fsi
      on fsi.fact_id = f.id
      and fsi.session_id = p_session_id
    left join theme_affinity ta on ta.category_id = f.category_id
    left join public.fact_engagement_stats fes on fes.fact_id = f.id
  ),
  scored as (
    select
      h.*,
      100::numeric as base_score,
      case
        when h.first_viewed_at is null then 45
        when h.first_viewed_at >= now() - interval '1 day' then -90
        when h.first_viewed_at >= now() - interval '7 days' then -55
        when h.first_viewed_at >= now() - interval '30 days' then -25
        else -8
      end::numeric as seen_penalty,
      case
        when h.served_at is null then 0
        when h.served_at >= now() - interval '30 minutes' then -80
        when h.served_at >= now() - interval '6 hours' then -40
        else -15
      end::numeric as session_penalty,
      least(35, h.affinity_count * 6)::numeric as theme_affinity_bonus,
      case
        when v_learning_goal = 'basics' and h.difficulty_level = 'basic' then 25
        when v_learning_goal = 'basics' and h.difficulty_level = 'intermediate' then 8
        when v_learning_goal = 'basics' then -15
        when v_learning_goal = 'advanced' and h.difficulty_level = 'advanced' then 25
        when v_learning_goal = 'advanced' and h.difficulty_level = 'intermediate' then 10
        when v_learning_goal = 'advanced' then -12
        when h.difficulty_level = 'intermediate' then 25
        else 8
      end::numeric as level_match_bonus,
      case
        when h.published_at >= now() - interval '7 days' then 14
        when h.published_at >= now() - interval '30 days' then 8
        when h.published_at >= now() - interval '90 days' then 3
        else 0
      end::numeric as freshness_bonus,
      case
        when h.event_month = extract(month from current_date)::integer
          and h.event_day = extract(day from current_date)::integer then 30
        when h.event_month = extract(month from current_date)::integer
          and abs(h.event_day - extract(day from current_date)::integer) <= 2 then 12
        else 0
      end::numeric as date_relevance_bonus,
      least(
        18,
        ln(1 + h.views_count + h.unique_viewers_count * 2 + h.likes_count * 4 + h.saves_count * 5 + h.shares_count * 3) * 3
      )::numeric as engagement_bonus,
      (random() * 8)::numeric as random_bonus
    from hydrated h
  ),
  ranked as (
    select
      s.*,
      (
        s.base_score +
        s.seen_penalty +
        s.session_penalty +
        s.theme_affinity_bonus +
        s.level_match_bonus +
        s.freshness_bonus +
        s.date_relevance_bonus +
        s.engagement_bonus +
        s.random_bonus
      )::numeric as final_score
    from scored s
    order by final_score desc
    limit v_limit
  ),
  remembered as (
    insert into public.feed_session_items (session_id, fact_id, served_at)
    select p_session_id, r.id, now()
    from ranked r
    where p_session_id is not null
    on conflict (session_id, fact_id) do update set served_at = excluded.served_at
    returning 1 as remembered_row
  )
  select
    r.id,
    r.slug,
    r.title,
    r.hook,
    r.content,
    r.source,
    r.source_url,
    r.difficulty_level,
    r.long_content,
    r.seo_title,
    r.seo_description,
    r.event_day,
    r.event_month,
    r.event_year,
    r.published_at,
    r.updated_at,
    r.tone,
    r.accent_color,
    r.category_id,
    r.category_name,
    r.category_slug,
    r.category_tone,
    r.category_accent_color,
    r.first_viewed_at is not null as seen_by_user,
    round(r.final_score, 2) as recommendation_score,
    case
      when v_debug then jsonb_build_object(
        'base_score', r.base_score,
        'seen_penalty', r.seen_penalty,
        'session_penalty', r.session_penalty,
        'theme_affinity_bonus', r.theme_affinity_bonus,
        'level_match_bonus', r.level_match_bonus,
        'freshness_bonus', r.freshness_bonus,
        'date_relevance_bonus', r.date_relevance_bonus,
        'engagement_bonus', r.engagement_bonus,
        'random_bonus', round(r.random_bonus, 2),
        'final_score', round(r.final_score, 2)
      )
      else null
    end as score_debug
  from ranked r;
end;
$$;

comment on function public.get_personalized_feed(uuid, integer, uuid, boolean, text) is
  'Personalized feed V2. Qualified aliases to avoid PL/pgSQL output-column ambiguity with id/user_id/fact_id columns.';

grant execute on function public.get_personalized_feed(uuid, integer, uuid, boolean, text) to anon;
grant execute on function public.get_personalized_feed(uuid, integer, uuid, boolean, text) to authenticated;
