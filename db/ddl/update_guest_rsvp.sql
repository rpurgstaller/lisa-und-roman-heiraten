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

revoke all on function public.update_guest_rsvp(text, boolean, text, text, text)
  from public;

grant execute on function public.update_guest_rsvp(text, boolean, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
