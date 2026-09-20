create table guest (
  id bigint generated always as identity primary key,

  first_name text,
  last_name text,
  email text,

  attending boolean,

  menu_choice text,

  dietary_restrictions text,

  companion_name text,

  created_at timestamp default now()
);
