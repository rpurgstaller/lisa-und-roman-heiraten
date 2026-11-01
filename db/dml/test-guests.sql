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
),
primary_guest as (
  insert into guest (
    first_name,
    last_name,
    email,
    invitation_id,
    attending,
    dietary_restrictions,
    additional_dietary_restrictions
  )
  select
    'Anna',
    'Schmidt',
    'anna.schmidt@example.com',
    new_invitation.id,
    true,
    null,
    null
  from new_invitation
  returning id, invitation_id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_of_guest_id
)
select
  'Lukas',
  'Schmidt',
  null,
  primary_guest.invitation_id,
  null,
  null,
  null,
  primary_guest.id
from primary_guest;

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
  additional_dietary_restrictions
)
select
  'Michael',
  'Bauer',
  'michael.bauer@example.com',
  new_invitation.id,
  true,
  null,
  'Gluten-free'
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
  additional_dietary_restrictions
)
select
  'Sophie',
  'Wagner',
  'sophie.wagner@example.com',
  new_invitation.id,
  false,
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
),
primary_guest as (
  insert into guest (
    first_name,
    last_name,
    email,
    invitation_id,
    attending,
    dietary_restrictions,
    additional_dietary_restrictions
  )
  select
    'Daniel',
    'Hofer',
    'daniel.hofer@example.com',
    new_invitation.id,
    true,
    null,
    'No shellfish'
  from new_invitation
  returning id, invitation_id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_of_guest_id
)
select
  'Julia',
  'Hofer',
  null,
  primary_guest.invitation_id,
  null,
  null,
  null,
  primary_guest.id
from primary_guest;

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
  additional_dietary_restrictions
)
select
  'Laura',
  'Gruber',
  'laura.gruber@example.com',
  new_invitation.id,
  true,
  'Vegan',
  'Nut allergy'
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
),
primary_guest as (
  insert into guest (
    first_name,
    last_name,
    email,
    invitation_id,
    attending,
    dietary_restrictions,
    additional_dietary_restrictions
  )
  select
    'Thomas',
    'Mayer',
    'thomas.mayer@example.com',
    new_invitation.id,
    null,
    null,
    null
  from new_invitation
  returning id, invitation_id
)
insert into guest (
  first_name,
  last_name,
  email,
  invitation_id,
  attending,
  dietary_restrictions,
  additional_dietary_restrictions,
  companion_of_guest_id
)
select
  'Elena',
  'Mayer',
  null,
  primary_guest.invitation_id,
  null,
  null,
  null,
  primary_guest.id
from primary_guest;