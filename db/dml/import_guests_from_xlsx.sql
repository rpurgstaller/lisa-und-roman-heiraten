-- Import: data/guests-raw.xlsx -> invitation und guest
-- Run once against an empty guest table (after add_guest_type.sql / create_schema.sql).
-- Das Skript bricht ab, wenn bereits Gäste vorhanden sind.
--
-- Regeln:
-- * Anzahl - Davon Kinder = Erwachsene. Bei "Wü & Maria" sind es 2 Erwachsene (Wilfried & Maria) + 2 Kinder.
-- * Fehlende Erwachsene werden als "Begleitung von <Name>" angelegt (ohne FK).
-- * "X & Freundin/Freund/Familie" wird als Begleitperson (FK auf X) angelegt.
-- * Kinder: "Kind von <Name> <n>". Die ersten "Kinderessen" Kinder bekommen child_with_meal, der Rest child_without_meal.
-- * Save the date = 1 -> save_the_date_sent = true.
-- * Priorität und Notiz werden nicht übernommen.

begin;

do $$
begin
  if exists (select 1 from public.guest) then
    raise exception 'Import abgebrochen: Tabelle guest enthält bereits Gäste.';
  end if;
end $$;

create temp table import_invitation (
  key int primary key,
  guest_from text not null,
  category text not null,
  save_the_date_sent boolean not null
) on commit drop;

create temp table import_guest (
  invitation_key int not null,
  seq int not null,
  first_name text not null,
  last_name text,
  guest_type text not null,
  is_companion boolean not null,
  primary key (invitation_key, seq)
) on commit drop;

insert into import_invitation (key, guest_from, category, save_the_date_sent) values
  (1, 'Lisa', 'Familie', true),
  (2, 'Lisa', 'Familie', true),
  (3, 'Lisa', 'Familie', true),
  (4, 'Lisa', 'Familie', true),
  (5, 'Lisa', 'Familie', true),
  (6, 'Lisa', 'Familie', true),
  (7, 'Lisa', 'Familie', true),
  (8, 'Lisa', 'Familie', true),
  (9, 'Lisa', 'Freunde', true),
  (10, 'Lisa', 'Freunde', true),
  (11, 'Lisa', 'Freunde', true),
  (12, 'Lisa', 'Freunde', true),
  (13, 'Lisa', 'Freunde', true),
  (14, 'Lisa', 'Freunde', true),
  (15, 'Lisa', 'Arbeit', false),
  (16, 'Lisa', 'Freunde', true),
  (17, 'Roman', 'Freunde', true),
  (18, 'Roman', 'Familie', false),
  (19, 'Roman', 'Familie', false),
  (20, 'Roman', 'Freunde', false),
  (21, 'Roman', 'Freunde', false),
  (22, 'Roman', 'Freunde', false),
  (23, 'Roman', 'Freunde', false),
  (24, 'Roman', 'Freunde', false),
  (25, 'Roman', 'Familie', false),
  (26, 'Lisa', 'Freunde', true),
  (27, 'Lisa', 'Freunde', true),
  (28, 'Roman', 'Freunde', false),
  (29, 'Roman', 'Freunde', false),
  (30, 'Roman', 'Familie', false),
  (31, 'Roman', 'Familie', false),
  (32, 'Roman', 'Familie', false),
  (33, 'Lisa', 'Freunde', true),
  (34, 'Lisa', 'Familie', false),
  (35, 'Lisa', 'Familie', false),
  (36, 'Roman', 'Freunde', false),
  (37, 'Roman', 'Freunde', false),
  (38, 'Lisa', 'Freunde', false),
  (39, 'Lisa', 'Freunde', false),
  (40, 'Lisa', 'Freunde', false),
  (41, 'Lisa', 'Freunde', false),
  (42, 'Lisa', 'Arbeit', false),
  (43, 'Lisa', 'Arbeit', false),
  (44, 'Lisa', 'Arbeit', false),
  (45, 'Lisa', 'Freunde', false),
  (46, 'Lisa', 'Freunde', false),
  (47, 'Lisa', 'Arbeit', false),
  (48, 'Roman', 'Freunde', false),
  (49, 'Roman', 'Freunde', false),
  (50, 'Lisa', 'Freunde', false),
  (51, 'Lisa', 'Familie', false),
  (52, 'Lisa', 'Freunde', false),
  (53, 'Lisa', 'Freunde', true),
  (54, 'Lisa', 'Freunde', false),
  (55, 'Lisa', 'Familie', false),
  (56, 'Lisa', 'Familie', false),
  (57, 'Lisa', 'Familie', false);

insert into import_guest (invitation_key, seq, first_name, last_name, guest_type, is_companion) values
  (1, 1, 'Sabine', null, 'adult', false),
  (1, 2, 'Helmut', null, 'adult', false),
  (2, 1, 'Julia', null, 'adult', false),
  (2, 2, 'Andi', null, 'adult', false),
  (3, 1, 'Michael', null, 'adult', false),
  (3, 2, 'Alina', null, 'adult', false),
  (4, 1, 'Florian', null, 'adult', false),
  (4, 2, 'Lisa', null, 'adult', false),
  (5, 1, 'Manu', null, 'adult', false),
  (5, 2, 'Nora', null, 'adult', false),
  (5, 3, 'Kind von Manu & Nora 1', null, 'child_with_meal', false),
  (5, 4, 'Kind von Manu & Nora 2', null, 'child_with_meal', false),
  (5, 5, 'Kind von Manu & Nora 3', null, 'child_without_meal', false),
  (6, 1, 'Christa', null, 'adult', false),
  (7, 1, 'Heimo', null, 'adult', false),
  (7, 2, 'Begleitung von Heimo 1', null, 'adult', false),
  (7, 3, 'Begleitung von Heimo 2', null, 'adult', false),
  (8, 1, 'Gabriel', null, 'adult', false),
  (8, 2, 'Begleitung von Gabriel', null, 'adult', true),
  (9, 1, 'Anahi', null, 'adult', false),
  (9, 2, 'Matthäus', null, 'adult', false),
  (9, 3, 'Kind von Anahi & Matthäus 1', null, 'child_without_meal', false),
  (10, 1, 'Toni', null, 'adult', false),
  (10, 2, 'Kevin', null, 'adult', false),
  (11, 1, 'Luki', null, 'adult', false),
  (12, 1, 'Purki', null, 'adult', false),
  (12, 2, 'Valentina', null, 'adult', false),
  (13, 1, 'Clara', null, 'adult', false),
  (13, 2, 'Simon', null, 'adult', false),
  (14, 1, 'Nana', null, 'adult', false),
  (14, 2, 'Kilian', null, 'adult', false),
  (15, 1, 'Julia', null, 'adult', false),
  (15, 2, 'Felix', null, 'adult', false),
  (16, 1, 'Christina', null, 'adult', false),
  (16, 2, 'Anton', null, 'adult', false),
  (17, 1, 'Carina', null, 'adult', false),
  (17, 2, 'Franco', null, 'adult', false),
  (18, 1, 'Fritz', null, 'adult', false),
  (18, 2, 'Rosemarie', null, 'adult', false),
  (19, 1, 'Wilfried', null, 'adult', false),
  (19, 2, 'Maria', null, 'adult', false),
  (19, 3, 'Kind von Wü & Maria 1', null, 'child_with_meal', false),
  (19, 4, 'Kind von Wü & Maria 2', null, 'child_without_meal', false),
  (20, 1, 'Mescht', null, 'adult', false),
  (20, 2, 'Laura', null, 'adult', false),
  (20, 3, 'Kind von Mescht & Laura 1', null, 'child_with_meal', false),
  (20, 4, 'Kind von Mescht & Laura 2', null, 'child_with_meal', false),
  (21, 1, 'Fuchsi', null, 'adult', false),
  (21, 2, 'Steffi', null, 'adult', false),
  (21, 3, 'Kind von Fuchsi & Steffi 1', null, 'child_with_meal', false),
  (21, 4, 'Kind von Fuchsi & Steffi 2', null, 'child_with_meal', false),
  (21, 5, 'Kind von Fuchsi & Steffi 3', null, 'child_with_meal', false),
  (22, 1, 'Andi', null, 'adult', false),
  (22, 2, 'Kathi', null, 'adult', false),
  (22, 3, 'Kind von Andi & Kathi 1', null, 'child_without_meal', false),
  (23, 1, 'Michi', null, 'adult', false),
  (24, 1, 'Toni', null, 'adult', false),
  (24, 2, 'Begleitung von Toni', null, 'adult', true),
  (24, 3, 'Kind von Toni & Freundin 1', null, 'child_with_meal', false),
  (24, 4, 'Kind von Toni & Freundin 2', null, 'child_without_meal', false),
  (25, 1, 'Franz', 'Führer', 'adult', false),
  (26, 1, 'Dani', null, 'adult', false),
  (26, 2, 'Watts', null, 'adult', false),
  (27, 1, 'Wastl', null, 'adult', false),
  (27, 2, 'Florian', null, 'adult', false),
  (28, 1, 'Resi', null, 'adult', false),
  (28, 2, 'Begleitung von Resi', null, 'adult', false),
  (29, 1, 'Alex', null, 'adult', false),
  (29, 2, 'Begleitung von Alex', null, 'adult', false),
  (30, 1, 'Thomas', null, 'adult', false),
  (30, 2, 'Begleitung von Thomas', null, 'adult', false),
  (31, 1, 'Günther', null, 'adult', false),
  (32, 1, 'Janine', null, 'adult', false),
  (32, 2, 'Begleitung von Tante Janine', null, 'adult', false),
  (33, 1, 'Matthias', null, 'adult', false),
  (33, 2, 'Begleitung von Matthias', null, 'adult', true),
  (34, 1, 'Konrad', null, 'adult', false),
  (35, 1, 'Gilbert', null, 'adult', false),
  (35, 2, 'Begleitung von Gilbert', null, 'adult', true),
  (35, 3, 'Kind von Gilbert & Freundin 1', null, 'child_with_meal', false),
  (36, 1, 'Georg', 'Lausegger', 'adult', false),
  (36, 2, 'Begleitung von Georg Lausegger', null, 'adult', false),
  (36, 3, 'Kind von Georg Lausegger 1', null, 'child_with_meal', false),
  (37, 1, 'Martin', 'Unger', 'adult', false),
  (37, 2, 'Begleitung von Martin Unger', null, 'adult', false),
  (37, 3, 'Kind von Martin Unger 1', null, 'child_with_meal', false),
  (37, 4, 'Kind von Martin Unger 2', null, 'child_with_meal', false),
  (38, 1, 'Andrea', null, 'adult', false),
  (38, 2, 'Cho', null, 'adult', false),
  (38, 3, 'Kind von Andrea & Cho 1', null, 'child_with_meal', false),
  (38, 4, 'Kind von Andrea & Cho 2', null, 'child_with_meal', false),
  (39, 1, 'Clemens', 'Tschurtschentaler', 'adult', false),
  (39, 2, 'Begleitung von Clemens Tschurtschentaler', null, 'adult', false),
  (40, 1, 'Manuel', 'Mühlburger', 'adult', false),
  (40, 2, 'Begleitung von Manuel', null, 'adult', true),
  (40, 3, 'Kind von Manuel Mühlburger & Familie 1', null, 'child_without_meal', false),
  (40, 4, 'Kind von Manuel Mühlburger & Familie 2', null, 'child_without_meal', false),
  (41, 1, 'Patrick', 'Pils', 'adult', false),
  (41, 2, 'Marlene', null, 'adult', false),
  (42, 1, 'Philipp', null, 'adult', false),
  (42, 2, 'Kathi', null, 'adult', false),
  (42, 3, 'Kind von Philipp & Kathi 1', null, 'child_without_meal', false),
  (42, 4, 'Kind von Philipp & Kathi 2', null, 'child_without_meal', false),
  (43, 1, 'Markus', null, 'adult', false),
  (43, 2, 'Angie', null, 'adult', false),
  (44, 1, 'Matthias', null, 'adult', false),
  (45, 1, 'Marlene', null, 'adult', false),
  (45, 2, 'Kathi', null, 'adult', false),
  (46, 1, 'Anna', null, 'adult', false),
  (46, 2, 'Agnes', null, 'adult', false),
  (47, 1, 'Raphaele', null, 'adult', false),
  (47, 2, 'Begleitung von Raphaele', null, 'adult', true),
  (48, 1, 'Meli', 'Mattersberger', 'adult', false),
  (49, 1, 'Stefan', 'Kölbl', 'adult', false),
  (49, 2, 'Begleitung von Stefan Kölbl', null, 'adult', false),
  (49, 3, 'Kind von Stefan Kölbl 1', null, 'child_without_meal', false),
  (50, 1, 'Jöbstl', null, 'adult', false),
  (51, 1, 'Domi', null, 'adult', false),
  (52, 1, 'Nina', null, 'adult', false),
  (52, 2, 'Eva', 'Schule', 'adult', false),
  (52, 3, 'Begleitung von Nina & Eva Schule 1', null, 'adult', false),
  (52, 4, 'Begleitung von Nina & Eva Schule 2', null, 'adult', false),
  (53, 1, 'Kechti', null, 'adult', false),
  (53, 2, 'Begleitung von Kechti', null, 'adult', true),
  (54, 1, 'Ossi', null, 'adult', false),
  (54, 2, 'Begleitung von Ossi', null, 'adult', true),
  (54, 3, 'Kind von Ossi & Familie 1', null, 'child_without_meal', false),
  (54, 4, 'Kind von Ossi & Familie 2', null, 'child_without_meal', false),
  (54, 5, 'Kind von Ossi & Familie 3', null, 'child_without_meal', false),
  (55, 1, 'Oma', null, 'adult', false),
  (55, 2, 'Opa', null, 'adult', false),
  (56, 1, 'Manuela', null, 'adult', false),
  (56, 2, 'Begleitung von Tante Manuela', null, 'adult', false),
  (57, 1, 'Sabine', null, 'adult', false),
  (57, 2, 'Gabi', null, 'adult', false);

do $$
declare
  inv record;
  g record;
  inv_id bigint;
  primary_id bigint;
  new_id bigint;
begin
  for inv in select * from import_invitation order by key loop
    insert into public.invitation (guest_from, category, save_the_date_sent)
    values (inv.guest_from, inv.category, inv.save_the_date_sent)
    returning id into inv_id;

    primary_id := null;

    for g in
      select * from import_guest
      where invitation_key = inv.key and not is_companion
      order by seq
    loop
      insert into public.guest (first_name, last_name, invitation_id, guest_type)
      values (g.first_name, g.last_name, inv_id, g.guest_type)
      returning id into new_id;

      if primary_id is null then
        primary_id := new_id;
      end if;
    end loop;

    for g in
      select * from import_guest
      where invitation_key = inv.key and is_companion
      order by seq
    loop
      insert into public.guest (first_name, last_name, invitation_id, guest_type, companion_of_guest_id)
      values (g.first_name, g.last_name, inv_id, g.guest_type, primary_id);
    end loop;
  end loop;
end $$;

commit;
