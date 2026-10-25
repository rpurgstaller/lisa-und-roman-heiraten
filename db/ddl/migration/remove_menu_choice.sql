-- Migration: removes the menu_choice column from guest and updates the guest RPCs.
-- Run once against existing databases after shorten_invitation_codes.sql.
-- Fresh databases get this from create_schema.sql.
-- The whole script runs in one transaction. If it aborts, nothing is changed.

begin;

do $$
begin
  if exists (
    select 1
    from public.invitation
    where code !~ '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  ) then
    raise exception 'Invitation codes are not shortened yet. Run shorten_invitation_codes.sql first.';
  end if;
end
$$;

alter table public.guest
  drop column if exists menu_choice;

drop function if exists public.get_guest_by_invitation_code(text);

create function public.get_guest_by_invitation_code(provided_code text)
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

create function public.update_guest_rsvp(
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

commit;

notify pgrst, 'reload schema';
