-- Migration: adds guest.additional_dietary_restrictions and restricts
-- guest.dietary_restrictions to the values Vegetarian, Vegan, Lactose intolerant.
-- Free-text values that violate the constraint are moved into the new column.
-- Safe to run more than once.

alter table public.guest
  add column if not exists additional_dietary_restrictions text;

update public.guest
set
  additional_dietary_restrictions = nullif(
    concat_ws('; ', additional_dietary_restrictions, dietary_restrictions),
    ''
  ),
  dietary_restrictions = null
where dietary_restrictions is not null
  and dietary_restrictions not in ('Vegetarian', 'Vegan', 'Lactose intolerant');

alter table public.guest
  drop constraint if exists guest_dietary_restrictions_check;

alter table public.guest
  add constraint guest_dietary_restrictions_check
  check (dietary_restrictions in ('Vegetarian', 'Vegan', 'Lactose intolerant'));

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
    and provided_code ~* '^[a-f0-9]{32}$'
  limit 1;
$$;

revoke all on function public.get_guest_by_invitation_code(text) from public;
grant execute on function public.get_guest_by_invitation_code(text) to anon, authenticated;

drop function if exists public.update_guest_rsvp(text, boolean, text, text, text);

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
    or trim(provided_code) !~* '^[a-f0-9]{32}$'
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

revoke all on function public.update_guest_rsvp(text, boolean, text, text, text)
  from public;

grant execute on function public.update_guest_rsvp(text, boolean, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
