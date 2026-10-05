-- Asil Kuyumculuk / Supabase app_settings
-- The browser uses the public publishable key, therefore requests run as anon.
-- Keep this table limited to the single application settings row.

alter table public.app_settings enable row level security;

grant select, update on table public.app_settings to anon;

grant select, update on table public.app_settings to authenticated;

drop policy if exists "app_settings_public_select" on public.app_settings;
drop policy if exists "app_settings_public_update" on public.app_settings;

create policy "app_settings_public_select"
on public.app_settings
for select
to anon, authenticated
using (id = 'asil_settings');

create policy "app_settings_public_update"
on public.app_settings
for update
to anon, authenticated
using (id = 'asil_settings')
with check (id = 'asil_settings');
