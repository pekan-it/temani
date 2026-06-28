-- =============================================================================
-- Temani — Supabase Schema
-- =============================================================================
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
-- It is safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE and
-- policies are dropped before being recreated.
--
-- Data model (see src/types/database.ts):
--   families ──< profiles
--            └─< patients ──< medications ──< medication_logs
--                          └─< appointments
--
-- Authorization model: every domain row belongs to a family. A user only ever
-- sees rows from their own family, resolved via `public.my_family_id()`.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('owner', 'caregiver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type med_schedule as enum ('pagi', 'siang', 'malam', 'sebelum_tidur');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('scheduled', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_type as enum ('kontrol_rutin', 'ambil_resep', 'cek_lab', 'lainnya');
exception when duplicate_object then null; end $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  family_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  full_name         text not null,
  family_id         uuid references public.families (id) on delete set null,
  role              user_role not null default 'caregiver',
  -- Expo push token for this device. Refreshed on every app launch.
  push_token        text,
  -- Per-user reminder switches, mirrored from Settings so the reminder Edge
  -- Function can filter recipients without reading auth user metadata.
  notify_medications boolean not null default true,
  notify_checkups    boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.patients (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null,
  age        int not null check (age >= 0 and age <= 150),
  diagnosis  text not null,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  name        text not null,
  dose        text not null,
  -- Each entry encodes a slot and its clock time, e.g. 'pagi|07:00'. Stored as
  -- text[] (not the med_schedule enum) so an exact time can travel with the slot.
  schedules   text[] not null default '{}',
  stock       int not null default 0 check (stock >= 0),
  expiry_date date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.medication_logs (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  schedule      med_schedule not null,
  date          date not null,
  confirmed     boolean not null default false,
  confirmed_by  uuid references public.profiles (id) on delete set null,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  -- One log row per medication / schedule slot / day.
  unique (medication_id, schedule, date)
);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients (id) on delete cascade,
  family_id        uuid not null references public.families (id) on delete cascade,
  hospital_name    text not null,
  doctor_name      text not null,
  appointment_type appointment_type not null default 'kontrol_rutin',
  scheduled_date   date not null,
  scheduled_time   text not null,
  status           appointment_status not null default 'scheduled',
  notes            text,
  result_notes     text,
  created_at       timestamptz not null default now()
);

-- Dedupe ledger for the reminder Edge Function: one row per reminder actually
-- sent, so a per-minute cron never pushes the same reminder twice.
--   ref_type: 'medication' | 'appointment'
--   kind:     'dose' (medication) | 'h1' | 'hari_h' (appointment)
--   slot_key: the medication slot ('pagi'…) or '' for appointments
create table if not exists public.notification_logs (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  ref_id    uuid not null,
  ref_type  text not null,
  kind      text not null,
  slot_key  text not null default '',
  slot_date date not null,
  sent_at   timestamptz not null default now(),
  unique (ref_id, ref_type, kind, slot_key, slot_date)
);

-- ── Indexes (foreign keys we filter/join on frequently) ──────────────────────
create index if not exists idx_profiles_family       on public.profiles (family_id);
create index if not exists idx_patients_family        on public.patients (family_id);
create index if not exists idx_medications_patient    on public.medications (patient_id);
create index if not exists idx_med_logs_medication    on public.medication_logs (medication_id);
create index if not exists idx_med_logs_patient_date  on public.medication_logs (patient_id, date);
create index if not exists idx_appointments_patient   on public.appointments (patient_id);
create index if not exists idx_appointments_family    on public.appointments (family_id);
create index if not exists idx_notif_logs_family      on public.notification_logs (family_id);

-- ── Migrations for existing databases ────────────────────────────────────────
-- `create table if not exists` never alters an existing table, so apply column
-- and type changes explicitly. All guarded to stay safe on re-run.
alter table public.profiles add column if not exists push_token         text;
alter table public.profiles add column if not exists notify_medications boolean not null default true;
alter table public.profiles add column if not exists notify_checkups    boolean not null default true;
alter table public.medications alter column schedules type text[] using schedules::text[];

-- =============================================================================
-- Functions
-- =============================================================================

-- Family id of the currently authenticated user. SECURITY DEFINER so it can be
-- called from inside RLS policies without recursing through `profiles` RLS.
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

-- Decrement a medication's stock by one, never going below zero. Called when a
-- caregiver confirms a dose.
create or replace function public.decrement_stock(med_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.medications
     set stock = greatest(stock - 1, 0)
   where id = med_id
     and patient_id in (
       select id from public.patients where family_id = public.my_family_id()
     );
$$;

-- Atomically create a new family and its owner profile for the signed-up user.
-- SECURITY DEFINER to break the chicken-and-egg problem: a brand new user has no
-- profile (and therefore no family) yet, so RLS would otherwise block the insert.
create or replace function public.create_family_for_owner(
  p_family_name text,
  p_family_code text,
  p_full_name   text,
  p_email       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_family_id uuid;
begin
  if v_user_id is null then
    raise exception 'Tidak terautentikasi';
  end if;

  insert into public.families (name, family_code)
  values (p_family_name, p_family_code)
  returning id into v_family_id;

  insert into public.profiles (id, email, full_name, family_id, role)
  values (v_user_id, p_email, p_full_name, v_family_id, 'owner')
  on conflict (id) do update
    set family_id = excluded.family_id,
        full_name = excluded.full_name,
        role      = 'owner';

  return v_family_id;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.families        enable row level security;
alter table public.profiles        enable row level security;
alter table public.patients        enable row level security;
alter table public.medications     enable row level security;
alter table public.medication_logs enable row level security;
alter table public.appointments    enable row level security;
alter table public.notification_logs enable row level security;

-- ── families ─────────────────────────────────────────────────────────────────
-- Readable by anyone: a caregiver must look the family up by code *before* they
-- have an account. The 6-char code is the shared secret that gates joining.
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families
  for select using (true);

drop policy if exists "families_update_owner" on public.families;
create policy "families_update_owner" on public.families
  for update using (id = public.my_family_id())
  with check (id = public.my_family_id());

-- ── profiles ─────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_same_family" on public.profiles;
create policy "profiles_select_same_family" on public.profiles
  for select using (
    id = auth.uid() or family_id = public.my_family_id()
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ── patients ─────────────────────────────────────────────────────────────────
drop policy if exists "patients_all_same_family" on public.patients;
create policy "patients_all_same_family" on public.patients
  for all using (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

-- ── medications (scoped via parent patient's family) ─────────────────────────
drop policy if exists "medications_all_same_family" on public.medications;
create policy "medications_all_same_family" on public.medications
  for all using (
    patient_id in (select id from public.patients where family_id = public.my_family_id())
  )
  with check (
    patient_id in (select id from public.patients where family_id = public.my_family_id())
  );

-- ── medication_logs (scoped via parent patient's family) ─────────────────────
drop policy if exists "med_logs_all_same_family" on public.medication_logs;
create policy "med_logs_all_same_family" on public.medication_logs
  for all using (
    patient_id in (select id from public.patients where family_id = public.my_family_id())
  )
  with check (
    patient_id in (select id from public.patients where family_id = public.my_family_id())
  );

-- ── appointments ─────────────────────────────────────────────────────────────
drop policy if exists "appointments_all_same_family" on public.appointments;
create policy "appointments_all_same_family" on public.appointments
  for all using (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

-- ── notification_logs (read-only for the family; writes happen via service role)
drop policy if exists "notif_logs_select_same_family" on public.notification_logs;
create policy "notif_logs_select_same_family" on public.notification_logs
  for select using (family_id = public.my_family_id());

-- =============================================================================
-- Grants
-- =============================================================================
grant execute on function public.my_family_id()            to anon, authenticated;
grant execute on function public.decrement_stock(uuid)     to authenticated;
grant execute on function public.create_family_for_owner(text, text, text, text)
  to authenticated;
