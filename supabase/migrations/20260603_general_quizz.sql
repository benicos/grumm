alter table public.quiz_questions
add column if not exists difficulty text not null default 'standard';

alter table public.quiz_questions
drop constraint if exists quiz_questions_difficulty_check,
add constraint quiz_questions_difficulty_check
check (difficulty in ('easy', 'standard', 'hard'));

create index if not exists quiz_questions_active_difficulty_idx
on public.quiz_questions (is_active, difficulty);

alter table public.quiz_sessions
add column if not exists quiz_type text not null default 'memory_challenge';

alter table public.quiz_sessions
drop constraint if exists quiz_sessions_type_check,
add constraint quiz_sessions_type_check
check (quiz_type in ('memory_challenge', 'general_quizz'));

alter table public.quiz_sessions
drop constraint if exists quiz_sessions_total_bounds,
add constraint quiz_sessions_total_bounds
check (total_questions >= 0 and total_questions <= 10);

create index if not exists quiz_sessions_user_type_completed_idx
on public.quiz_sessions (user_id, quiz_type, completed_at desc)
where completed_at is not null;

drop policy if exists "Authenticated users can read active quiz questions" on public.quiz_questions;
drop policy if exists "Anyone can read active published quiz questions" on public.quiz_questions;
create policy "Anyone can read active published quiz questions"
on public.quiz_questions
for select
to anon, authenticated
using (
  is_active = true
  and fact_id is not null
  and exists (
    select 1
    from public.facts f
    where f.id = quiz_questions.fact_id
      and f.status = 'published'
  )
);
