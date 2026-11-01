-- Migration: Gastart (Erwachsener, Kind mit Kinderessen, Kind ohne Kinderessen) auf guest.
-- Run once against existing databases. Fresh databases get this from create_schema.sql.

alter table public.guest
  add column if not exists guest_type text not null default 'adult';

alter table public.guest
  drop constraint if exists guest_type_check;

alter table public.guest
  add constraint guest_type_check
  check (guest_type in ('adult', 'child_with_meal', 'child_without_meal'));

notify pgrst, 'reload schema';
