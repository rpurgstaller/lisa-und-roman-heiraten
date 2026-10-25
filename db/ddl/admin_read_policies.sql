create policy "Authenticated users can read guests"
on public.guest
for select
to authenticated
using (true);

create policy "Authenticated users can read invitations"
on public.invitation
for select
to authenticated
using (true);
