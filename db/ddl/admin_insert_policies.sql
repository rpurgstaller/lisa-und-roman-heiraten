create policy "Authenticated users can insert invitations"
on public.invitation
for insert
to authenticated
with check (true);

create policy "Authenticated users can insert guests"
on public.guest
for insert
to authenticated
with check (true);
