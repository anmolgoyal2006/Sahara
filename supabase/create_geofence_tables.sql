-- ============================================================
-- MIGRATION: Geofence Alert System (Phase 13)
-- Creates geofence_zones + geofence_events, used by server/routes/geofence.js
-- Run in Supabase SQL Editor (using postgres or service role)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── geofence_zones ───────────────────────────────────────────────────────────
-- One safe-zone per elder (upserted on elder_id).
create table if not exists public.geofence_zones (
  id             uuid primary key default uuid_generate_v4(),
  elder_id       uuid not null unique references public.users(id) on delete cascade,
  center_lat     double precision not null,
  center_lng     double precision not null,
  radius_meters  integer not null default 500,
  label          text not null default 'Home',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── geofence_events ──────────────────────────────────────────────────────────
-- Log of every geofence check + left/returned alert.
create table if not exists public.geofence_events (
  id                     uuid primary key default uuid_generate_v4(),
  elder_id               uuid not null references public.users(id) on delete cascade,
  event_type             text not null check (event_type in ('check', 'left', 'returned')),
  elder_lat              double precision not null,
  elder_lng              double precision not null,
  distance_from_center   integer not null,
  radius_meters          integer not null,
  zone_label             text,
  acknowledged           boolean not null default false,
  acknowledged_at        timestamptz,
  triggered_at           timestamptz not null default now()
);

create index if not exists geofence_events_elder_triggered_idx
  on public.geofence_events (elder_id, triggered_at desc);

select 'Geofence tables created successfully!' as message;
