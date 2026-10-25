create extension if not exists pgcrypto;

alter table guest
  add column if not exists invitation_id bigint;

insert into invitation (code)
select guest.invitation_code
from guest
where guest.invitation_code is not null
  and not exists (
    select 1
    from invitation
    where invitation.code = guest.invitation_code
  );

update guest
set invitation_id = invitation.id
from invitation
where guest.invitation_id is null
  and invitation.code = guest.invitation_code;

alter table guest
  alter column invitation_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_invitation_id_fkey'
      and conrelid = 'guest'::regclass
  ) then
    alter table guest
      add constraint guest_invitation_id_fkey
      foreign key (invitation_id) references invitation(id);
  end if;
end
$$;

alter table guest
  drop column if exists invitation_code;

alter table guest enable row level security;

drop function if exists get_guest_by_invitation_code(text);

create or replace function get_guest_by_invitation_code(provided_code text)
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

revoke all on function get_guest_by_invitation_code(text) from public;
grant execute on function get_guest_by_invitation_code(text) to anon, authenticated;

drop function if exists update_guest_rsvp(text, boolean, text, text, text);

create or replace function update_guest_rsvp(
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
    or provided_code !~* '^[a-f0-9]{32}$'
  then
    return false;
  end if;

  update guest
  set
    attending = provided_attending,
    dietary_restrictions = nullif(trim(provided_dietary_restrictions), ''),
    additional_dietary_restrictions = nullif(trim(provided_additional_dietary_restrictions), ''),
    companion_name = nullif(trim(provided_companion_name), '')
  from invitation
  where guest.invitation_id = invitation.id
    and invitation.code = lower(trim(provided_code));

  return found;
end;
$$;

revoke all on function update_guest_rsvp(text, boolean, text, text, text) from public;
grant execute on function update_guest_rsvp(text, boolean, text, text, text) to anon, authenticated;
