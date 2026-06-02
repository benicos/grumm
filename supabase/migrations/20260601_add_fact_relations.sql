create table if not exists public.fact_relations (
  id uuid primary key default gen_random_uuid(),
  source_fact_id uuid not null references public.facts(id) on delete cascade,
  related_fact_id uuid not null references public.facts(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fact_relations_no_self_link check (source_fact_id <> related_fact_id),
  constraint fact_relations_unique_pair unique (source_fact_id, related_fact_id)
);

create index if not exists fact_relations_source_position_idx
on public.fact_relations (source_fact_id, position asc, created_at asc);

create index if not exists fact_relations_related_idx
on public.fact_relations (related_fact_id);

alter table public.fact_relations enable row level security;

drop policy if exists "Published fact relations are readable" on public.fact_relations;
create policy "Published fact relations are readable"
on public.fact_relations for select
using (
  exists (
    select 1
    from public.facts source_fact
    join public.facts related_fact on related_fact.id = public.fact_relations.related_fact_id
    where source_fact.id = public.fact_relations.source_fact_id
      and source_fact.status = 'published'
      and related_fact.status = 'published'
  )
  or public.has_permission('facts.create')
);

drop policy if exists "Editors can manage fact relations" on public.fact_relations;
create policy "Editors can manage fact relations"
on public.fact_relations for all
using (public.has_permission('facts.create'))
with check (public.has_permission('facts.create'));
