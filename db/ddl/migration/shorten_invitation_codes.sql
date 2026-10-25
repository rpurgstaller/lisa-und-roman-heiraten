-- Migration: shortens invitation codes from 32 hex characters to 8 characters
-- from the alphabet abcdefghjkmnpqrstvwxyz23456789.
-- Existing invitation codes are regenerated, so links that were already sent stop working.
-- Run once against existing databases. Fresh databases get this from create_schema.sql.

create or replace function public.generate_invitation_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('abcdefghjkmnpqrstvwxyz23456789', (get_byte(gen_random_bytes(8), i) % 30) + 1, 1),
    ''
  )
  from generate_series(0, 7) as i;
$$;

alter table public.invitation
  drop constraint if exists invitation_code_check;

alter table public.invitation
  alter column code set default public.generate_invitation_code();

do $$
declare
  rec record;
  new_code text;
begin
  for rec in
    select id
    from public.invitation
    where code !~ '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  loop
    loop
      new_code := public.generate_invitation_code();
      exit when not exists (
        select 1 from public.invitation where code = new_code
      );
    end loop;

    update public.invitation
    set code = new_code
    where id = rec.id;
  end loop;
end
$$;

alter table public.invitation
  add constraint invitation_code_check
  check (code ~ '^[abcdefghjkmnpqrstvwxyz23456789]{8}$');

drop function if exists public.get_guest_by_invitation_code(text);

create or replace function public.get_guest_by_invitation_code(provided_code text)
returns table (
  id bigint,
  first_name text,
  last_name text,
  attending boolean,
  dietary_restrictions text,
  additional_dietary_restrictions text,
  companion_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    guest.id,
    guest.first_name,
    guest.last_name,
    guest.attending,
    guest.dietary_restrictions,
    guest.additional_dietary_restrictions,
    guest.companion_name
  from guest
  inner join invitation on invitation.id = guest.invitation_id
  where invitation.code = lower(trim(provided_code))
    and provided_code ~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  limit 1;
$$;

revoke all on function public.get_guest_by_invitation_code(text) from public;
grant execute on function public.get_guest_by_invitation_code(text) to anon, authenticated;

drop function if exists public.update_guest_rsvp(text, boolean, text, text, text);
drop function if exists public.update_guest_rsvp(text, boolean, text, text, text, text);

create or replace function public.update_guest_rsvp(
  provided_code text,
  provided_attending boolean,
  provided_dietary_restrictions text default null,
  provided_companion_name text default null,
  provided_additional_dietary_restrictions text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if provided_code is null
    or trim(provided_code) !~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  then
    return false;
  end if;

  update public.guest
  set
    attending = provided_attending,
    dietary_restrictions = nullif(trim(provided_dietary_restrictions), ''),
    additional_dietary_restrictions = nullif(trim(provided_additional_dietary_restrictions), ''),
    companion_name = nullif(trim(provided_companion_name), '')
  from public.invitation
  where guest.invitation_id = invitation.id
    and invitation.code = lower(trim(provided_code));

  return found;
end;
$$;

revoke all on function public.update_guest_rsvp(text, boolean, text, text, text) from public;
grant execute on function public.update_guest_rsvp(text, boolean, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
