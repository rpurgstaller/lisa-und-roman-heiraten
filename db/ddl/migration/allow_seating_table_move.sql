-- Migration: Tische auf dem Raster verschieben (grid_x, grid_y).
-- Voraussetzung: seating_table ist vorhanden (Migration add_seating_plan bzw. create_schema).

begin;

do $$
begin
  if to_regclass('public.seating_table') is null then
    raise exception 'seating_table fehlt. Zuerst die Seating-Migration ausführen.';
  end if;
end;
$$;

grant update (grid_x, grid_y) on seating_table to authenticated;

commit;

notify pgrst, 'reload schema';
