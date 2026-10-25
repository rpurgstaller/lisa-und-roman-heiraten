create policy "Authenticated users can update invitations"
on public.invitation
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can update guests"
on public.guest
for update
to authenticated
using (true)
with check (true);
