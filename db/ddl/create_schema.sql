create extension if not exists pgcrypto;

create extension if not exists btree_gist;

drop table if exists response_log;

drop table if exists seat_assignment;

drop table if exists seating_table;

drop table if exists seating_plan;

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

-- Sitzordnung. Änderungen daran werden bewusst nicht ins response_log geschrieben.
create table seating_plan (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 100),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  -- Soft Delete: gelöschte Pläne bleiben erhalten und werden in der Oberfläche ausgeblendet.
  deleted_at timestamptz
);

alter table seating_plan enable row level security;

create table seating_table (
  id bigint generated always as identity primary key,
  plan_id bigint not null references seating_plan(id) on delete cascade,
  name text check (name is null or char_length(name) <= 100),
  -- Obere linke Zelle des Tisches im Raster. Die Sitzplätze liegen außen um die Tischfläche herum.
  grid_x integer not null check (grid_x >= 0),
  grid_y integer not null check (grid_y >= 0),
  length integer not null check (length between 1 and 20),
  width integer not null check (width between 1 and 20),
  unique (id, plan_id),
  -- Belegt ein Tisch inklusive Sitzplatz-Rand eine Zelle, die schon ein anderer Tisch im Plan belegt, wird das abgelehnt.
  constraint seating_table_no_overlap exclude using gist (
    plan_id with =,
    box(point(grid_x, grid_y), point(grid_x + length + 1, grid_y + width + 1)) with &&
  )
);

alter table seating_table enable row level security;

create table seat_assignment (
  id bigint generated always as identity primary key,
  plan_id bigint not null references seating_plan(id) on delete cascade,
  -- Genau eine Person pro Platz: entweder ein Gast oder Lisa bzw. Roman.
  guest_id bigint references guest(id) on delete cascade,
  host text check (host in ('lisa', 'roman')),
  table_id bigint not null,
  side text not null check (side in ('top', 'bottom', 'left', 'right')),
  position integer not null check (position >= 0),
  check ((guest_id is null) <> (host is null)),
  unique (plan_id, guest_id),
  unique (plan_id, host),
  unique (plan_id, table_id, side, position),
  foreign key (table_id, plan_id) references seating_table(id, plan_id) on delete cascade
);

alter table seat_assignment enable row level security;

create or replace function check_seat_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  table_length integer;
  table_width integer;
  guest_attending boolean;
begin
  select length, width
  into table_length, table_width
  from seating_table
  where id = new.table_id;

  if (new.side in ('top', 'bottom') and new.position >= table_length)
    or (new.side in ('left', 'right') and new.position >= table_width)
  then
    raise exception 'Seat position % is outside the table (side %)', new.position, new.side;
  end if;

  if new.guest_id is not null then
    select attending
    into guest_attending
    from guest
    where id = new.guest_id;

    if guest_attending is distinct from true then
      raise exception 'Only guests with a confirmed attendance can be seated';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function check_seat_assignment() from public, anon, authenticated;

create trigger seat_assignment_check
before insert or update on seat_assignment
for each row execute function check_seat_assignment();

-- Sagt ein Gast ab, wird sein Sitzplatz automatisch freigegeben. Läuft als security definer, weil anon keinen Zugriff auf seat_assignment hat.
create or replace function release_seat_of_declined_guest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from seat_assignment where guest_id = new.id;
  return null;
end;
$$;

revoke all on function release_seat_of_declined_guest() from public, anon, authenticated;

create trigger guest_release_seat_on_decline
after update of attending on guest
for each row
when (new.attending is distinct from true)
execute function release_seat_of_declined_guest();

-- Ein Tisch wird nicht kleiner, solange Personen auf Plätzen sitzen, die dann wegfallen würden.
create or replace function check_seating_table_resize()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from seat_assignment
    where table_id = new.id
      and ((side in ('top', 'bottom') and position >= new.length)
        or (side in ('left', 'right') and position >= new.width))
  ) then
    raise exception 'Seats are occupied outside the new table size' using errcode = 'P0003';
  end if;
  return new;
end;
$$;

revoke all on function check_seating_table_resize() from public, anon, authenticated;

create trigger seating_table_resize_check
before update of length, width on seating_table
for each row
when (new.length is distinct from old.length or new.width is distinct from old.width)
execute function check_seating_table_resize();

revoke all on seating_plan, seating_table, seat_assignment from public, anon, authenticated;

grant select, insert, update on seating_plan to authenticated;
grant select, insert, delete on seating_table to authenticated;
grant update (length, width) on seating_table to authenticated;
grant select, insert, update, delete on seat_assignment to authenticated;

grant usage on sequence seating_plan_id_seq, seating_table_id_seq, seat_assignment_id_seq to authenticated;

create policy "Authenticated users can read seating plans"
on seating_plan
for select
to authenticated
using (true);

create policy "Authenticated users can create seating plans"
on seating_plan
for insert
to authenticated
with check (true);

create policy "Authenticated users can update seating plans"
on seating_plan
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage seating tables"
on seating_table
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage seat assignments"
on seat_assignment
for all
to authenticated
using (true)
with check (true);
