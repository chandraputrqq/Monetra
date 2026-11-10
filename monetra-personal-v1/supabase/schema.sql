-- MONETRA × Supabase
-- Jalankan sekali di Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.monetra_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: setiap pengguna hanya bisa mengakses barisnya sendiri.
alter table public.monetra_data enable row level security;

drop policy if exists "monetra_select_own" on public.monetra_data;
drop policy if exists "monetra_insert_own" on public.monetra_data;
drop policy if exists "monetra_update_own" on public.monetra_data;
drop policy if exists "monetra_delete_own" on public.monetra_data;

create policy "monetra_select_own" on public.monetra_data
  for select to authenticated using (auth.uid() = user_id);
create policy "monetra_insert_own" on public.monetra_data
  for insert to authenticated with check (auth.uid() = user_id);
create policy "monetra_update_own" on public.monetra_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "monetra_delete_own" on public.monetra_data
  for delete to authenticated using (auth.uid() = user_id);

-- Realtime: perubahan dari perangkat lain muncul otomatis.
-- (Jika muncul error "already member of publication", abaikan.)
alter publication supabase_realtime add table public.monetra_data;
