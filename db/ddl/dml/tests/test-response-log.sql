-- Dummy-Daten fuer response_log: 24 Eintraege verteilt ueber die letzten 3 Monate.
-- Keine echten Gaestedaten. Das Script fuegt bei jedem Lauf neue Eintraege hinzu.

insert into response_log (changed_at, changed_by, change)
with entries as (
  select
    n,
    (n * 37) % 90 as days_ago,
    (n * 7) % 24 as hours_ago,
    (n % 8) + 1 as record_id
  from generate_series(1, 24) as n
)
select
  now() - days_ago * interval '1 day' - hours_ago * interval '1 hour',
  case when n % 4 in (1, 2) then 'guest' else 'admin' end,
  case n % 4
    when 0 then format('Admin (%s): invitation.category changed to Familie', record_id)
    when 1 then format('Dummy Gast %s (%s): guest.attending changed to true', record_id, record_id)
    when 2 then format('Dummy Gast %s (%s): guest.dietary_restrictions changed to Vegetarian', record_id, record_id)
    else format('Admin (%s): guest.attending changed to false', record_id)
  end
from entries;

select count(*) as eintraege_letzte_3_monate
from response_log
where changed_at >= now() - interval '3 months';
