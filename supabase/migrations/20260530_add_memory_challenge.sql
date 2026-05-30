create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quiz_sessions_score_bounds check (score >= 0 and score <= total_questions),
  constraint quiz_sessions_total_bounds check (total_questions >= 0 and total_questions <= 5)
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  selected_answer text not null,
  correct_answer text not null,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now()
);

create index if not exists quiz_sessions_user_started_idx
  on public.quiz_sessions (user_id, started_at desc);

create index if not exists quiz_sessions_user_completed_idx
  on public.quiz_sessions (user_id, completed_at desc)
  where completed_at is not null;

create index if not exists quiz_answers_session_idx
  on public.quiz_answers (session_id);

create index if not exists quiz_answers_fact_idx
  on public.quiz_answers (fact_id);

alter table public.quiz_sessions enable row level security;
alter table public.quiz_answers enable row level security;

drop policy if exists "Users can read own quiz sessions" on public.quiz_sessions;
create policy "Users can read own quiz sessions"
  on public.quiz_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own quiz sessions" on public.quiz_sessions;
create policy "Users can create own quiz sessions"
  on public.quiz_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own quiz sessions" on public.quiz_sessions;
create policy "Users can update own quiz sessions"
  on public.quiz_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own quiz answers" on public.quiz_answers;
create policy "Users can read own quiz answers"
  on public.quiz_answers
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own quiz answers" on public.quiz_answers;
create policy "Users can create own quiz answers"
  on public.quiz_answers
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.quiz_sessions session
      where session.id = quiz_answers.session_id
        and session.user_id = auth.uid()
    )
  );
