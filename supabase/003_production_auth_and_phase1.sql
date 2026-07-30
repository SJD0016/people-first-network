-- PFN production authentication, ownership, and Phase 1 AI storage
-- Run once in Supabase SQL Editor.

alter table if exists public.people add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.people add column if not exists ai_intelligence jsonb;
alter table if exists public.people add column if not exists ai_researched_at timestamptz;
alter table if exists public.interactions add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.events add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table if exists public.people enable row level security;
alter table if exists public.interactions enable row level security;
alter table if exists public.events enable row level security;

drop policy if exists "people_owner_all" on public.people;
create policy "people_owner_all" on public.people for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "interactions_owner_all" on public.interactions;
create policy "interactions_owner_all" on public.interactions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "events_owner_all" on public.events;
create policy "events_owner_all" on public.events for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists people_owner_id_idx on public.people(owner_id);
create index if not exists interactions_owner_id_idx on public.interactions(owner_id);
create index if not exists events_owner_id_idx on public.events(owner_id);
