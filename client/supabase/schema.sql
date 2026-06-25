-- ============================================================
-- Sahara — Phase 1 Database Schema
-- Run in Supabase SQL Editor: Project > SQL Editor > New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Core users table ──────────────────────────────────────────────────────────
create table public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  phone       text unique not null,
  name        text not null,
  role        text not null check (role in ('elder', 'family', 'worker')),
  language    text default 'hi' check (language in ('hi', 'en', 'pa')),
  elder_id    uuid references public.users(id) null,
  avatar_url  text null,
  created_at  timestamptz default timezone('utc', now()) not null,
  updated_at  timestamptz default timezone('utc', now()) not null
);

-- ── Elder profile ─────────────────────────────────────────────────────────────
create table public.elder_profiles (
  id                 uuid references public.users(id) on delete cascade primary key,
  age                int null,
  conditions         text[] default '{}',
  emergency_contact  text null,
  address            text null,
  lat                float null,
  lng                float null,
  preferred_language text default 'hi',
  created_at         timestamptz default timezone('utc', now()) not null
);

-- ── Care workers ──────────────────────────────────────────────────────────────
create table public.workers (
  id               uuid references public.users(id) on delete cascade primary key,
  skills           text[] default '{}',
  languages        text[] default '{}',
  rating           float default 0,
  total_ratings    int default 0,
  verified         boolean default false,
  aadhaar_verified boolean default false,
  available        boolean default true,
  lat              float null,
  lng              float null,
  photo_url        text null,
  aadhaar_number   text null,
  experience_years int default 0,
  created_at       timestamptz default timezone('utc', now()) not null
);

-- ── Bookings ──────────────────────────────────────────────────────────────────
create table public.bookings (
  id                 uuid default uuid_generate_v4() primary key,
  elder_id           uuid references public.users(id) not null,
  worker_id          uuid references public.workers(id) null,
  service_type       text not null check (service_type in
                       ('maid','nurse','driver','cook','repair','physiotherapist')),
  scheduled_at       timestamptz not null,
  duration_hours     int default 2,
  status             text default 'pending' check (status in
                       ('pending','confirmed','active','done','cancelled')),
  notes              text null,
  ai_parsed_request  text null,
  total_cost         float null,
  rating             int null,
  review             text null,
  created_at         timestamptz default timezone('utc', now()) not null
);

-- ── Health logs ───────────────────────────────────────────────────────────────
create table public.health_logs (
  id            uuid default uuid_generate_v4() primary key,
  elder_id      uuid references public.users(id) not null,
  bp_systolic   int null,
  bp_diastolic  int null,
  sugar_level   float null,
  weight        float null,
  mood          text null check (mood in ('very_happy','happy','okay','sad','unwell')),
  notes         text null,
  ai_tip        text null,
  logged_at     timestamptz default timezone('utc', now()) not null
);

-- ── Medicines ─────────────────────────────────────────────────────────────────
create table public.medicines (
  id            uuid default uuid_generate_v4() primary key,
  elder_id      uuid references public.users(id) not null,
  name          text not null,
  dosage        text not null,
  times         text[] not null,
  days          text[] default '{"daily"}',
  remind_family boolean default true,
  is_active     boolean default true,
  created_at    timestamptz default timezone('utc', now()) not null
);

-- ── Medicine taken logs ───────────────────────────────────────────────────────
create table public.medicine_taken_logs (
  id             uuid default uuid_generate_v4() primary key,
  medicine_id    uuid references public.medicines(id) not null,
  elder_id       uuid references public.users(id) not null,
  scheduled_time text not null,
  taken_at       timestamptz null,
  was_taken      boolean default false,
  date           date default current_date not null
);

-- ── SOS events ───────────────────────────────────────────────────────────────
create table public.sos_events (
  id           uuid default uuid_generate_v4() primary key,
  elder_id     uuid references public.users(id) not null,
  lat          float null,
  lng          float null,
  address_text text null,
  resolved     boolean default false,
  resolved_at  timestamptz null,
  triggered_at timestamptz default timezone('utc', now()) not null
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.users              enable row level security;
alter table public.elder_profiles     enable row level security;
alter table public.workers            enable row level security;
alter table public.bookings           enable row level security;
alter table public.health_logs        enable row level security;
alter table public.medicines          enable row level security;
alter table public.medicine_taken_logs enable row level security;
alter table public.sos_events         enable row level security;

-- users policies
create policy "own data" on public.users
  for all using (auth.uid() = id);

create policy "family view elder" on public.users
  for select using (
    auth.uid() = id or
    auth.uid() in (select id from public.users u2 where u2.elder_id = public.users.id)
  );

-- elder_profiles policies
create policy "elder profile access" on public.elder_profiles
  for all using (
    auth.uid() = id or
    auth.uid() in (select id from public.users where elder_id = public.elder_profiles.id)
  );

-- workers policies
create policy "workers readable" on public.workers
  for select using (auth.role() = 'authenticated');

create policy "worker own profile" on public.workers
  for all using (auth.uid() = id);

-- bookings policies
create policy "bookings access" on public.bookings
  for all using (
    auth.uid() = elder_id or auth.uid() = worker_id or
    auth.uid() in (select id from public.users where elder_id = public.bookings.elder_id)
  );

-- health_logs policies
create policy "health logs access" on public.health_logs
  for all using (
    auth.uid() = elder_id or
    auth.uid() in (select id from public.users where elder_id = public.health_logs.elder_id)
  );

-- medicines policies
create policy "medicines access" on public.medicines
  for all using (
    auth.uid() = elder_id or
    auth.uid() in (select id from public.users where elder_id = public.medicines.elder_id)
  );

-- sos_events policies
create policy "sos access" on public.sos_events
  for all using (
    auth.uid() = elder_id or
    auth.uid() in (select id from public.users where elder_id = public.sos_events.elder_id)
  );
