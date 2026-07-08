-- Project Reacher cloud sync schema.
--
-- Design: one JSONB row per user holding the ENTIRE app data blob, in the
-- exact same shape as localStorage["projectReacher"]. This is deliberate —
-- it means the cloud copy needs zero field-by-field remapping, so there is
-- no risk of losing or corrupting data in translation. The client already
-- has full migration logic (js/data.js) for evolving that JSON shape over
-- time; the cloud table just stores whatever shape the client currently
-- produces, tagged with the schema_version it was written at.
--
-- SETUP (one-time, ~5 minutes):
--   1. Create a free project at https://supabase.com
--   2. Open the SQL Editor and run this entire file once.
--   3. Go to Project Settings -> API. Copy the "Project URL" and the
--      "anon public" key (NOT the service_role key).
--   4. Paste them into js/cloud-config.js in this repo.
--   5. In Authentication -> Providers, make sure Email is enabled
--      (it is by default). Optionally disable "Confirm email" for solo/
--      personal use so sign-up works immediately without an inbox check.

create table if not exists public.reacher_cloud_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reacher_cloud_data enable row level security;

-- A user can only ever see or touch their own row. auth.uid() is the
-- authenticated user's id, set by Supabase from their session JWT — it
-- cannot be spoofed by the client since the anon key alone can't forge it.
drop policy if exists "select own data" on public.reacher_cloud_data;
create policy "select own data" on public.reacher_cloud_data
  for select using (auth.uid() = user_id);

drop policy if exists "insert own data" on public.reacher_cloud_data;
create policy "insert own data" on public.reacher_cloud_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own data" on public.reacher_cloud_data;
create policy "update own data" on public.reacher_cloud_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own data" on public.reacher_cloud_data;
create policy "delete own data" on public.reacher_cloud_data
  for delete using (auth.uid() = user_id);

-- Keep updated_at accurate without relying on the client to set it correctly.
create or replace function public.set_reacher_cloud_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reacher_cloud_data_updated_at on public.reacher_cloud_data;
create trigger trg_reacher_cloud_data_updated_at
  before update on public.reacher_cloud_data
  for each row execute function public.set_reacher_cloud_data_updated_at();
