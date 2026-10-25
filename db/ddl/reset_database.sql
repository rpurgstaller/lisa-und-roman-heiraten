-- Deletes all functions and tables in the public schema, including all data.
-- Run only against a database that is meant to be reset.

do $$
declare
  rec record;
begin
  for rec in
    select format(
      'drop function if exists %I.%I(%s) cascade',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    ) as stmt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from pg_depend d
        where d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    execute rec.stmt;
  end loop;

  for rec in
    select format('drop table if exists %I.%I cascade', schemaname, tablename) as stmt
    from pg_tables
    where schemaname = 'public'
  loop
    execute rec.stmt;
  end loop;
end
$$;
