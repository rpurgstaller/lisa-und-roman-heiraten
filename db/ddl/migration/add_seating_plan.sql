-- Migration: adds the seating plan tables (seating_plan, seating_table, seat_assignment).
-- Run once against existing databases. Fresh databases get this from create_schema.sql.
-- Seating changes are not written to response_log.
-- The whole script runs in one transaction. If it aborts, nothing is changed.

begin;

create extension if not exists btree_gist;

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

create function check_seat_assignment()
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
create function release_seat_of_declined_guest()
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
create function check_seating_table_resize()
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

commit;

notify pgrst, 'reload schema';
