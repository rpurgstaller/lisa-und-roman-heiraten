create extension if not exists pgcrypto;

drop table if exists response_log;

drop table if exists guest;

drop table if exists invitation;

-- Ohne i, l, o, u, 0 und 1, damit sich Codes beim Vorlesen und Abtippen nicht verwechseln lassen.
create or replace function generate_invitation_code()
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

create table invitation (
  id bigint generated always as identity primary key,

  code text not null unique default generate_invitation_code()
    check (code ~ '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'),

  created_at timestamp default now(),

  invitation_sent boolean not null default false,

  save_the_date_sent boolean not null default false,

  guest_from text check (guest_from in ('Roman', 'Lisa')),

  category text check (category in ('Freunde', 'Arbeit', 'Familie')),

  street text,

  house_number text,

  address_addition text,

  postal_code text,

  city text,

  country text
);

alter table invitation enable row level security;

create table guest (
  id bigint generated always as identity primary key,

  first_name text,
  last_name text,
  email text,
  invitation_id bigint not null references invitation(id),

  attending boolean,

  dietary_restrictions text
    constraint guest_dietary_restrictions_check
    check (dietary_restrictions in ('Vegetarian', 'Vegan', 'Lactose intolerant')),

  additional_dietary_restrictions text,

  companion_name text,

  created_at timestamp default now()
);

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
    and provided_code ~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
  limit 1;
$$;

revoke all on function get_guest_by_invitation_code(text) from public;
grant execute on function get_guest_by_invitation_code(text) to anon, authenticated;

drop function if exists update_guest_rsvp(text, boolean, text, text, text);
drop function if exists update_guest_rsvp(text, boolean, text, text, text, text);

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
    or provided_code !~* '^[abcdefghjkmnpqrstvwxyz23456789]{8}$'
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

-- Protokoll aller Änderungen an invitation und guest. Wird durch Trigger befüllt.
create table response_log (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  changed_by text not null check (changed_by in ('admin', 'guest')),
  change text not null
);

alter table response_log enable row level security;

revoke all on response_log from public, anon, authenticated;
grant select on response_log to authenticated;

create policy "Authenticated users can read response log"
on response_log
for select
to authenticated
using (true);

-- Umlaute als Unicode-Escapes, damit psql unter Windows keine Kodierungsprobleme verursacht.
create or replace function log_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  current_row jsonb;
  old_row jsonb;
  new_row jsonb;
  row_id bigint;
  actor_label text;
begin
  -- Ohne JWT-Claims (SQL-Editor, Migrationen) zählt die Änderung als Admin.
  actor := case
    when nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'anon' then 'guest'
    else 'admin'
  end;

  current_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_id := (current_row ->> 'id')::bigint;

  -- Präfix des Log-Eintrags: "Vorname Nachname" des Gastes bzw. aller Gäste der Einladung, sonst "Admin".
  if actor = 'guest' then
    if tg_table_name = 'guest' then
      actor_label := nullif(trim(concat_ws(' ', current_row ->> 'first_name', current_row ->> 'last_name')), '');
    else
      select string_agg(nullif(trim(concat_ws(' ', first_name, last_name)), ''), ', ' order by id)
      into actor_label
      from guest
      where invitation_id = row_id;
    end if;

    actor_label := coalesce(actor_label, 'Guest');
  else
    actor_label := 'Admin';
  end if;

  if tg_op = 'INSERT' then
    insert into response_log (changed_by, change)
    values (actor, format(U&'%s (%s): Row %s created', actor_label, row_id, tg_table_name));
  elsif tg_op = 'DELETE' then
    insert into response_log (changed_by, change)
    values (actor, format(U&'%s (%s): Row %s deleted', actor_label, row_id, tg_table_name));
  else
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);

    insert into response_log (changed_by, change)
    select
      actor,
      format(
        U&'%s (%s): %s.%s changed to %s',
        actor_label,
        row_id,
        tg_table_name,
        changed.key,
        coalesce(changed.value, 'NULL')
      )
    from jsonb_each_text(new_row) as changed(key, value)
    where new_row -> changed.key is distinct from old_row -> changed.key;
  end if;

  return null;
end;
$$;

revoke all on function log_row_changes() from public, anon, authenticated;

create trigger invitation_log_changes
after insert or update or delete on invitation
for each row execute function log_row_changes();

create trigger guest_log_changes
after insert or update or delete on guest
for each row execute function log_row_changes();
