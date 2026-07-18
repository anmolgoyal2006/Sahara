-- Phase 15A: AI Digital Guide — Database Schema
-- Run this in the Supabase SQL editor

-- ─────────────────────────────────────────────
-- GUIDES (public content)
-- ─────────────────────────────────────────────
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in (
    'government','health','banking','communication',
    'entertainment','shopping','payments',
    'social_media','education','travel'
  )),
  difficulty text default 'easy' check (difficulty in ('easy','medium','hard')),
  estimated_minutes int default 5,
  languages_available text[] default array['en'],
  is_popular boolean default false,
  tags text[] default array[]::text[],
  source text default 'manual' check (source in ('manual','ai_generated')),
  last_verified date,
  created_at timestamptz default now()
);

create table if not exists public.guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references public.guides(id) on delete cascade not null,
  step_number int not null,
  instruction jsonb not null,
  simplified_instruction jsonb,
  alt_wording jsonb,
  illustration_url text,
  ui_element_location text,
  voice_text jsonb,
  estimated_seconds int default 20,
  unique(guide_id, step_number)
);

create index if not exists idx_guide_steps_guide_id on public.guide_steps(guide_id);

alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;

create policy "public can read guides"
  on public.guides for select using (true);

create policy "public can read guide steps"
  on public.guide_steps for select using (true);

-- ─────────────────────────────────────────────
-- GUIDE PROGRESS (per-user, RLS-protected)
-- ─────────────────────────────────────────────
create table if not exists public.guide_progress (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references auth.users(id) on delete cascade not null,
  guide_slug text not null,
  current_step int default 1,
  status text default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  language text default 'en',
  struggle_count int default 0,
  started_at timestamptz default now(),
  last_active_at timestamptz default now(),
  completed_at timestamptz,
  unique(elder_id, guide_slug)
);

create table if not exists public.guide_bookmarks (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references auth.users(id) on delete cascade not null,
  guide_slug text not null,
  bookmarked_at timestamptz default now(),
  unique(elder_id, guide_slug)
);

create table if not exists public.volunteer_requests (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references auth.users(id) on delete cascade not null,
  guide_slug text,
  step_number int,
  request_type text not null check (request_type in ('call','chat')),
  status text default 'pending' check (status in ('pending','connected','closed')),
  created_at timestamptz default now()
);

alter table public.guide_progress enable row level security;
alter table public.guide_bookmarks enable row level security;
alter table public.volunteer_requests enable row level security;

-- Helper: is the current user a family member linked to this elder?
-- SECURITY DEFINER bypasses RLS on public.users, preventing the
-- "infinite recursion detected in policy for relation users" error
-- that occurs when a policy on another table sub-queries users while
-- users itself has self-referencing RLS policies.
create or replace function public.is_linked_family(p_elder uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and elder_id = p_elder
  );
$$;

drop policy if exists "elder or caregiver access progress" on public.guide_progress;
create policy "elder or caregiver access progress"
  on public.guide_progress for all using (
    auth.uid() = elder_id
    or public.is_linked_family(elder_id)
  );

drop policy if exists "elder or caregiver access bookmarks" on public.guide_bookmarks;
create policy "elder or caregiver access bookmarks"
  on public.guide_bookmarks for all using (
    auth.uid() = elder_id
    or public.is_linked_family(elder_id)
  );

drop policy if exists "elder or caregiver access volunteer requests" on public.volunteer_requests;
create policy "elder or caregiver access volunteer requests"
  on public.volunteer_requests for all using (
    auth.uid() = elder_id
    or public.is_linked_family(elder_id)
  );
