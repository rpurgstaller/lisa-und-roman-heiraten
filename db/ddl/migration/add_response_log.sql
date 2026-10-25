-- Migration: adds the response_log table and triggers that log every change to invitation and guest.
-- Run once against existing databases. Fresh databases get this from create_schema.sql.
-- Existing rows are not backfilled, so the log starts with the first change after this migration.
-- The whole script runs in one transaction. If it aborts, nothing is changed.

begin;

create table public.response_log (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  changed_by text not null check (changed_by in ('admin', 'guest')),
  change text not null
);

alter table public.response_log enable row level security;

revoke all on public.response_log from public, anon, authenticated;
grant select on public.response_log to authenticated;

create policy "Authenticated users can read response log"
on public.response_log
for select
to authenticated
using (true);

-- Umlaute als Unicode-Escapes, damit psql unter Windows keine Kodierungsprobleme verursacht.
create function public.log_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  old_row jsonb;
  new_row jsonb;
begin
  -- Ohne JWT-Claims (SQL-Editor, Migrationen) zählt die Änderung als Admin.
  actor := case
    when nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'anon' then 'guest'
    else 'admin'
  end;

  if tg_op = 'INSERT' then
    insert into response_log (changed_by, change)
    values (actor, format(U&'Row %s (ID %s) created', tg_table_name, to_jsonb(new) ->> 'id'));
  elsif tg_op = 'DELETE' then
    insert into response_log (changed_by, change)
    values (actor, format(U&'Row %s (ID %s) deleted', tg_table_name, to_jsonb(old) ->> 'id'));
  else
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);

    insert into response_log (changed_by, change)
    select
      actor,
      format(
        U&'Column %s.%s (ID %s) changed to %s',
        tg_table_name,
        changed.key,
        new_row ->> 'id',
        coalesce(changed.value, 'NULL')
      )
    from jsonb_each_text(new_row) as changed(key, value)
    where new_row -> changed.key is distinct from old_row -> changed.key;
  end if;

  return null;
end;
$$;

revoke all on function public.log_row_changes() from public, anon, authenticated;

create trigger invitation_log_changes
after insert or update or delete on public.invitation
for each row execute function public.log_row_changes();

create trigger guest_log_changes
after insert or update or delete on public.guest
for each row execute function public.log_row_changes();

commit;

notify pgrst, 'reload schema';
