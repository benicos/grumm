create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_request_role text := coalesce(auth.role(), '');
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Direct SQL migrations and Supabase maintenance contexts do not carry a JWT
  -- user. They still need to be able to backfill or bootstrap roles.
  if v_request_user_id is null and v_request_role = '' then
    return new;
  end if;

  -- Service role bypasses RLS in Supabase, but triggers still run.
  if v_request_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'role_update_forbidden'
    using errcode = '42501', message = 'role_update_forbidden';

  return new;
end;
$$;

drop trigger if exists profiles_protect_role_change on public.profiles;
create trigger profiles_protect_role_change
before update on public.profiles
for each row execute function public.protect_profile_role_change();
