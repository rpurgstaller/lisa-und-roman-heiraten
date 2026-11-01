-- Migration: Brautpaar-Sitzplätze (Lisa/Roman) in seat_assignment
-- Voraussetzung: seat_assignment hat bereits die Spalten id, guest_id (nullable) und host.
-- Das Skript ist wiederholbar.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_assignment'
      and column_name = 'host'
  ) then
    raise exception 'seat_assignment.host fehlt. Bitte zuerst die Host-Migration einspielen.';
  end if;
end;
$$;

-- Der Sitzplatz-Check prüft die Gast-Zusage nur noch für Gäste (guest_id gesetzt).
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

commit;
