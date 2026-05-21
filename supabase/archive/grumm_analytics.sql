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
