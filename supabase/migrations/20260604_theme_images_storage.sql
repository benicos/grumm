insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'theme-images',
  'theme-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Theme images are public" on storage.objects;
create policy "Theme images are public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'theme-images');

drop policy if exists "Admins can upload theme images" on storage.objects;
create policy "Admins can upload theme images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'theme-images'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'administrateur'
  )
);

drop policy if exists "Admins can update theme images" on storage.objects;
create policy "Admins can update theme images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'theme-images'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'administrateur'
  )
)
with check (
  bucket_id = 'theme-images'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'administrateur'
  )
);

drop policy if exists "Admins can delete theme images" on storage.objects;
create policy "Admins can delete theme images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'theme-images'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'administrateur'
  )
);
