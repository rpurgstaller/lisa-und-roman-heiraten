with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    true, true, 'Roman', 'Freunde',
    'Musterstraße', '1', null, '10115', 'Berlin', 'Deutschland'
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Anna',
  'Schmidt',
  'anna.schmidt@example.com',
  new_invitation.id,
  true,
  null,
  null,
  'Lukas Schmidt'
from new_invitation;

with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    true, false, 'Lisa', 'Arbeit',
    'Beispielweg', '12', 'Hinterhaus', '80331', 'München', 'Deutschland'
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Michael',
  'Bauer',
  'michael.bauer@example.com',
  new_invitation.id,
  true,
  null,
  'Gluten-free',
  null
from new_invitation;

with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    false, false, null, 'Familie',
    null, null, null, null, null, null
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Sophie',
  'Wagner',
  'sophie.wagner@example.com',
  new_invitation.id,
  false,
  null,
  null,
  null
from new_invitation;

with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    true, true, 'Lisa', 'Familie',
    'Testgasse', '3a', null, '1010', 'Wien', 'Österreich'
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Daniel',
  'Hofer',
  'daniel.hofer@example.com',
  new_invitation.id,
  true,
  null,
  'No shellfish',
  'Julia Hofer'
from new_invitation;

with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    false, true, 'Roman', null,
    'Probeplatz', '7', null, 'NW1 6XE', 'London', 'United Kingdom'
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Laura',
  'Gruber',
  'laura.gruber@example.com',
  new_invitation.id,
  true,
  'Vegan',
  'Nut allergy',
  null
from new_invitation;

with new_invitation as (
  insert into invitation (
    invitation_sent,
    save_the_date_sent,
    guest_from,
    category,
    street,
    house_number,
    address_addition,
    postal_code,
    city,
    country
  )
  values (
    true, true, 'Roman', 'Familie',
    'Dummystraße', '5', null, '8001', 'Zürich', 'Schweiz'
  )
  returning id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_name
)
select
  'Thomas',
  'Mayer',
  'thomas.mayer@example.com',
  new_invitation.id,
  null,
  null,
  null,
  'Elena Mayer'
from new_invitation;