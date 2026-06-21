-- ============================================================
-- Sahara — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── ENUM types ────────────────────────────────────────────────────────────────
create type user_role as enum ('patient', 'doctor', 'admin');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type notification_type as enum ('info', 'warning', 'success', 'error');

-- ── users ─────────────────────────────────────────────────────────────────────
-- Mirror of auth.users; populated by trigger on signup.
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  role        user_role not null default 'patient',
  created_at  timestamptz not null default now()
);

-- ── profiles ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references public.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  phone        text,
  date_of_birth date,
  address      text,
  specialty    text,           -- doctors only
  bio          text,
  updated_at   timestamptz not null default now()
);

-- ── reports ───────────────────────────────────────────────────────────────────
create table public.reports (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references public.users(id) on delete cascade,
  title        text not null,
  description  text,
  file_url     text not null,
  created_at   timestamptz not null default now()
);

-- ── appointments ─────────────────────────────────────────────────────────────
create table public.appointments (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references public.users(id) on delete cascade,
  doctor_id     uuid not null references public.users(id) on delete cascade,
  scheduled_at  timestamptz not null,
  status        appointment_status not null default 'pending',
  notes         text,
  created_at    timestamptz not null default now()
);

-- ── notifications ─────────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       notification_type not null default 'info',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── chats ─────────────────────────────────────────────────────────────────────
create table public.chats (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index on public.reports (patient_id);
create index on public.appointments (patient_id);
create index on public.appointments (doctor_id);
create index on public.appointments (scheduled_at);
create index on public.notifications (user_id);
create index on public.notifications (is_read);
create index on public.chats (sender_id);
create index on public.chats (receiver_id);
create index on public.chats (created_at);

-- ── Trigger: create user row on auth signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient')
  );

  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.users          enable row level security;
alter table public.profiles       enable row level security;
alter table public.reports        enable row level security;
alter table public.appointments   enable row level security;
alter table public.notifications  enable row level security;
alter table public.chats          enable row level security;

-- ── users policies ────────────────────────────────────────────────────────────
create policy "Users can read their own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can read all users"
  on public.users for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- ── profiles policies ─────────────────────────────────────────────────────────
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Doctors' profiles are readable by all authenticated users"
  on public.profiles for select
  using (
    (select role from public.users where id = profiles.id) = 'doctor'
    and auth.role() = 'authenticated'
  );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── reports policies ──────────────────────────────────────────────────────────
create policy "Patients can read their own reports"
  on public.reports for select
  using (auth.uid() = patient_id);

create policy "Doctors can read reports of their patients"
  on public.reports for select
  using (
    exists (
      select 1 from public.appointments a
      where a.doctor_id = auth.uid()
      and a.patient_id = reports.patient_id
    )
  );

create policy "Patients can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = patient_id);

create policy "Patients can delete their own reports"
  on public.reports for delete
  using (auth.uid() = patient_id);

-- ── appointments policies ─────────────────────────────────────────────────────
create policy "Users can read their own appointments"
  on public.appointments for select
  using (auth.uid() = patient_id or auth.uid() = doctor_id);

create policy "Patients can create appointments"
  on public.appointments for insert
  with check (auth.uid() = patient_id);

create policy "Involved users can update appointments"
  on public.appointments for update
  using (auth.uid() = patient_id or auth.uid() = doctor_id);

create policy "Patients can delete their pending appointments"
  on public.appointments for delete
  using (auth.uid() = patient_id and status = 'pending');

-- ── notifications policies ────────────────────────────────────────────────────
create policy "Users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role handles inserts via backend — no client insert policy needed.

-- ── chats policies ────────────────────────────────────────────────────────────
create policy "Users can read their own chats"
  on public.chats for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Authenticated users can send messages"
  on public.chats for insert
  with check (auth.uid() = sender_id);

create policy "Receivers can mark messages as read"
  on public.chats for update
  using (auth.uid() = receiver_id);

-- ============================================================
-- Storage buckets
-- Run in SQL Editor or create via Supabase Dashboard > Storage
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('profile-images', 'profile-images', true),
  ('reports',        'reports',        false),
  ('uploads',        'uploads',        false)
on conflict (id) do nothing;

-- Storage RLS — profile-images (public read)
create policy "Public read on profile-images"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "Auth users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS — reports (private)
create policy "Patients can upload their own reports"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Patients can read their own reports"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Patients can delete their own reports"
  on storage.objects for delete
  using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS — uploads (private)
create policy "Auth users can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users can read their own uploads"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users can delete their own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
