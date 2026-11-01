-- Migration: Begleitpersonen werden eigene guest-Zeilen mit FK auf die Hauptperson,
-- Rückmeldungen gelten pro Person und das Infofeld "Mitteilung" gehört zur Einladung.
-- Run once against existing databases. Fresh databases get this from create_schema.sql.

alter table public.guest
  add column if not exists companion_of_guest_id bigint
    references public.guest(id) on delete cascade;

create unique index if not exists guest_companion_of_guest_id_key
  on public.guest(companion_of_guest_id);

alter table public.invitation
  add column if not exists message text;

alter table public.invitation
  drop constraint if exists invitation_message_check;

alter table public.invitation
  add constraint invitation_message_check
  check (message is null or char_length(message) <= 1000);

-- Bestehende Begleitpersonen werden als eigene Gäste übernommen.
-- Vorname = alles bis auf das letzte Wort, Nachname = letztes Wort. Bitte danach prüfen.
insert into public.guest (
  first_name,
  last_name,
  invitation_id,
  companion_of_guest_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions
)
select
  case
    when trim(primary_guest.companion_name) ~ '\s'
      then regexp_replace(trim(primary_guest.companion_name), '\s+\S+$', '')
    else trim(primary_guest.companion_name)
  end,
  case
    when trim(primary_guest.companion_name) ~ '\s'
      then regexp_replace(trim(primary_guest.companion_name), '^.*\s', '')
    else null
  end,
  primary_guest.invitation_id,
  primary_guest.id,
  primary_guest.attending,
  primary_guest.dietary_restrictions,
  primary_guest.additional_dietary_restrictions
from public.guest as primary_guest
where nullif(trim(primary_guest.companion_name), '') is not null
  and not exists (
    select 1
    from public.guest as existing
    where existing.companion_of_guest_id = primary_guest.id
  );

alter table public.guest
  drop column if exists companion_name;

drop function if exists public.get_guest_by_invitation_code(text);
drop function if exists public.update_guest_rsvp(text, boolean, text, text, text);

create or replace function public.get_guests_by_invitation_code(provided_code text)
returns table (
  id bigint,
  first_name text,
  last_name text,
  attending boolean,
  dietary_restrictions text,
  additional_dietary_restrictions text,
  companion_of_guest_id bigint
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
    guest.companion_of_guest_id
  from guest
  inner join invitation on invitation.id = guest.invitation_id
  where invitation.code = lower(trim(provided_code))
    and provided_code ~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  order by guest.companion_of_guest_id nulls first, guest.id;
$$;

revoke all on function public.get_guests_by_invitation_code(text) from public;
grant execute on function public.get_guests_by_invitation_code(text) to anon, authenticated;

create or replace function public.get_invitation_message(provided_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select invitation.message
  from invitation
  where invitation.code = lower(trim(provided_code))
    and provided_code ~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$';
$$;

revoke all on function public.get_invitation_message(text) from public;
grant execute on function public.get_invitation_message(text) to anon, authenticated;

-- Speichert die Rückmeldung einer Einladung in einer Transaktion.
-- provided_guests: Hauptpersonen mit id, attending, dietary_restrictions, additional_dietary_restrictions.
-- provided_companion: null (keine Änderung), ohne id (neue Begleitperson anlegen) oder mit id (bestehende aktualisieren).
-- provided_remove_companion_id: Begleitperson entfernen.
create or replace function public.save_invitation_rsvp(
  provided_code text,
  provided_guests jsonb,
  provided_companion jsonb default null,
  provided_remove_companion_id bigint default null,
  provided_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_invitation_id bigint;
  guest_entry jsonb;
  primary_guest_id bigint;
  primary_count integer;
  companion_count integer;
begin
  if provided_code is null
    or trim(provided_code) !~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  then
    raise exception 'invalid_code';
  end if;

  select invitation.id
  into current_invitation_id
  from invitation
  where invitation.code = lower(trim(provided_code));

  if current_invitation_id is null then
    raise exception 'invalid_code';
  end if;

  if provided_guests is null or jsonb_typeof(provided_guests) <> 'array' then
    raise exception 'invalid_guest';
  end if;

  for guest_entry in select value from jsonb_array_elements(provided_guests) loop
    update guest
    set
      attending = (guest_entry ->> 'attending')::boolean,
      dietary_restrictions = nullif(trim(guest_entry ->> 'dietary_restrictions'), ''),
      additional_dietary_restrictions = nullif(trim(guest_entry ->> 'additional_dietary_restrictions'), '')
    where guest.id = (guest_entry ->> 'id')::bigint
      and guest.invitation_id = current_invitation_id
      and guest.companion_of_guest_id is null;

    if not found then
      raise exception 'invalid_guest';
    end if;
  end loop;

  if provided_remove_companion_id is not null then
    delete from guest
    where guest.id = provided_remove_companion_id
      and guest.invitation_id = current_invitation_id
      and guest.companion_of_guest_id is not null;

    if not found then
      raise exception 'invalid_companion';
    end if;
  end if;

  if provided_companion is not null then
    if provided_companion ->> 'id' is null then
      select count(*)
      into primary_count
      from guest
      where guest.invitation_id = current_invitation_id
        and guest.companion_of_guest_id is null;

      select count(*)
      into companion_count
      from guest
      where guest.invitation_id = current_invitation_id
        and guest.companion_of_guest_id is not null;

      if primary_count <> 1 or companion_count > 0 then
        raise exception 'companion_not_allowed';
      end if;

      select guest.id
      into primary_guest_id
      from guest
      where guest.invitation_id = current_invitation_id
        and guest.companion_of_guest_id is null;

      insert into guest (
        first_name,
        last_name,
        invitation_id,
        companion_of_guest_id,
        attending,
        dietary_restrictions,
        additional_dietary_restrictions
      )
      values (
        nullif(trim(provided_companion ->> 'first_name'), ''),
        nullif(trim(provided_companion ->> 'last_name'), ''),
        current_invitation_id,
        primary_guest_id,
        (provided_companion ->> 'attending')::boolean,
        nullif(trim(provided_companion ->> 'dietary_restrictions'), ''),
        nullif(trim(provided_companion ->> 'additional_dietary_restrictions'), '')
      );
    else
      update guest
      set
        first_name = nullif(trim(provided_companion ->> 'first_name'), ''),
        last_name = nullif(trim(provided_companion ->> 'last_name'), ''),
        attending = (provided_companion ->> 'attending')::boolean,
        dietary_restrictions = nullif(trim(provided_companion ->> 'dietary_restrictions'), ''),
        additional_dietary_restrictions = nullif(trim(provided_companion ->> 'additional_dietary_restrictions'), '')
      where guest.id = (provided_companion ->> 'id')::bigint
        and guest.invitation_id = current_invitation_id
        and guest.companion_of_guest_id is not null;

      if not found then
        raise exception 'invalid_companion';
      end if;
    end if;
  end if;

  update invitation
  set message = nullif(trim(provided_message), '')
  where invitation.id = current_invitation_id;

  return true;
end;
$$;

revoke all on function public.save_invitation_rsvp(text, jsonb, jsonb, bigint, text) from public;
grant execute on function public.save_invitation_rsvp(text, jsonb, jsonb, bigint, text) to anon, authenticated;

notify pgrst, 'reload schema';
