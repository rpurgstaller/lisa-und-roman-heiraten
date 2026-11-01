-- Migration: Tischgröße nachträglich ändern (length, width).
-- Voraussetzung: seating_table ist vorhanden (Migration add_seating_plan bzw. create_schema).

begin;

do $$
begin
  if to_regclass('public.seating_table') is null then
    raise exception 'seating_table fehlt. Zuerst die Seating-Migration ausführen.';
  end if;
end;
$$;

grant update (length, width) on seating_table to authenticated;

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

drop trigger if exists seating_table_resize_check on seating_table;

create trigger seating_table_resize_check
before update of length, width on seating_table
for each row
when (new.length is distinct from old.length or new.width is distinct from old.width)
execute function check_seating_table_resize();

commit;

notify pgrst, 'reload schema';
