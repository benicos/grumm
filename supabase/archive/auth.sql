create extension if not exists unaccent with schema public;

create or replace function public.normalize_username(value text)
returns text
language sql
stable
as $$
  select nullif(
    trim(both '_' from regexp_replace(regexp_replace(lower(public.unaccent(coalesce(value, ''))), '[^a-z0-9_]+', '_', 'g'), '_+', '_', 'g')),
    ''
  );
$$;

alter table public.profiles
add column if not exists avatar_url text;

update public.profiles
set username = concat('user_', replace(id::text, '-', ''))
where username is null or trim(username) = '';

update public.profiles
set username = public.normalize_username(username)
where username <> public.normalize_username(username);

update public.profiles
set username = concat('user_', left(replace(id::text, '-', ''), 19))
where username !~ '^[a-z0-9_]{3,24}$';

with ranked_usernames as (
  select
    id,
    row_number() over (partition by lower(username) order by created_at, id) as username_rank
  from public.profiles
)
update public.profiles
set username = concat('user_', left(replace(public.profiles.id::text, '-', ''), 19))
from ranked_usernames
where public.profiles.id = ranked_usernames.id
  and ranked_usernames.username_rank > 1;

alter table public.profiles
alter column username set not null;

alter table public.profiles
drop constraint if exists profiles_username_check;

alter table public.profiles
add constraint profiles_username_check check (username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_lower_unique_idx
on public.profiles (lower(username));

create unique index if not exists likes_user_id_fact_id_unique_idx
on public.likes (user_id, fact_id);

create unique index if not exists saves_user_id_fact_id_unique_idx
on public.saves (user_id, fact_id);

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

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop policy if exists "Public can check usernames" on public.profiles;
create policy "Public can check usernames"
on public.profiles for select
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own likes" on public.likes;
create policy "Users can read own likes"
on public.likes for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own likes" on public.likes;
create policy "Users can create own likes"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.likes;
create policy "Users can delete own likes"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own saves" on public.saves;
create policy "Users can read own saves"
on public.saves for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own saves" on public.saves;
create policy "Users can create own saves"
on public.saves for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saves" on public.saves;
create policy "Users can delete own saves"
on public.saves for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own views" on public.views;
create policy "Users can read own views"
on public.views for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own views" on public.views;
create policy "Users can create own views"
on public.views for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own views" on public.views;
create policy "Users can delete own views"
on public.views for delete
using (auth.uid() = user_id);
