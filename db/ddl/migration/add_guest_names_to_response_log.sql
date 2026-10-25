-- Migration: changes the response_log text to "<Vorname> <Nachname> (<ID>): <column> changed to ..." for guest changes and "Admin (<ID>): ..." for admin changes.
-- Invitation changes list the names of all guests of the invitation, separated by commas.
-- Run once against existing databases that already have response_log. Fresh databases get this from create_schema.sql.
-- Only the function is replaced. The triggers and the table stay unchanged.
-- The whole script runs in one transaction. If it aborts, nothing is changed.

begin;

-- Umlaute als Unicode-Escapes, damit psql unter Windows keine Kodierungsprobleme verursacht.
create or replace function public.log_row_changes()
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
      from public.guest
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

revoke all on function public.log_row_changes() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';
