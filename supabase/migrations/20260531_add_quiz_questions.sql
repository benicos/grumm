create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  fact_id uuid references public.facts(id) on delete set null,
  question text not null,
  correct_answer text not null,
  wrong_answer_1 text not null,
  wrong_answer_2 text not null,
  wrong_answer_3 text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quiz_questions_fact_idx
  on public.quiz_questions (fact_id);

create index if not exists quiz_questions_active_idx
  on public.quiz_questions (is_active);

create or replace function public.set_quiz_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_quiz_questions_updated_at on public.quiz_questions;
create trigger set_quiz_questions_updated_at
before update on public.quiz_questions
for each row
execute function public.set_quiz_questions_updated_at();

alter table public.quiz_questions enable row level security;

drop policy if exists "Admins can read quiz questions" on public.quiz_questions;
create policy "Admins can read quiz questions"
  on public.quiz_questions
  for select
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'administrateur'
    )
  );

drop policy if exists "Authenticated users can read active quiz questions" on public.quiz_questions;
create policy "Authenticated users can read active quiz questions"
  on public.quiz_questions
  for select
  using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Admins can create quiz questions" on public.quiz_questions;
create policy "Admins can create quiz questions"
  on public.quiz_questions
  for insert
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'administrateur'
    )
  );

drop policy if exists "Admins can update quiz questions" on public.quiz_questions;
create policy "Admins can update quiz questions"
  on public.quiz_questions
  for update
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'administrateur'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'administrateur'
    )
  );

drop policy if exists "Admins can delete quiz questions" on public.quiz_questions;
create policy "Admins can delete quiz questions"
  on public.quiz_questions
  for delete
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'administrateur'
    )
  );
