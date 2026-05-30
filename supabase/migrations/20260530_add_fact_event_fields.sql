alter table public.facts
add column if not exists event_day integer,
add column if not exists event_month integer,
add column if not exists event_year integer;

alter table public.facts
drop constraint if exists facts_event_day_check;

alter table public.facts
add constraint facts_event_day_check
check (event_day is null or event_day between 1 and 31);

alter table public.facts
drop constraint if exists facts_event_month_check;

alter table public.facts
add constraint facts_event_month_check
check (event_month is null or event_month between 1 and 12);

create index if not exists facts_event_month_day_idx
on public.facts (event_month, event_day)
where event_month is not null and event_day is not null;
