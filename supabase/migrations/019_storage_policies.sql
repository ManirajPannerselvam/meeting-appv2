-- ===========================================
-- AVATARS
-- ===========================================

create policy "Avatar Read"

on storage.objects

for select

to authenticated

using (

    bucket_id = 'avatars'

);

create policy "Avatar Upload"

on storage.objects

for insert

to authenticated

with check (

    bucket_id = 'avatars'

);

create policy "Avatar Update"

on storage.objects

for update

to authenticated

using (

    bucket_id = 'avatars'

);

-- ===========================================
-- ATTACHMENTS
-- ===========================================

create policy "Attachment Read"

on storage.objects

for select

to authenticated

using (

    bucket_id = 'attachments'

);

create policy "Attachment Upload"

on storage.objects

for insert

to authenticated

with check (

    bucket_id = 'attachments'

);

create policy "Attachment Delete"

on storage.objects

for delete

to authenticated

using (

    bucket_id = 'attachments'

);