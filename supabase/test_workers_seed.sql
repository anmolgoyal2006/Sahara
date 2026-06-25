-- ============================================================
-- TEST PHASE 4D — Seed test workers near Chandigarh (30.73, 76.77)
-- Run in Supabase SQL Editor AFTER the main schema is applied.
-- These insert into both `users` and `workers` tables.
-- ============================================================

-- Step 1: Insert test users (bypassing auth.users — use service role or auth.admin)
-- NOTE: In production these would be real auth users.
-- For testing, insert directly into public.users using fixed UUIDs.

INSERT INTO public.users (id, phone, name, role, language)
VALUES
  ('00000000-0000-0000-0000-000000000001', '+919876500001', 'Sunita Devi',    'worker', 'hi'),
  ('00000000-0000-0000-0000-000000000002', '+919876500002', 'Ramesh Kumar',   'worker', 'hi'),
  ('00000000-0000-0000-0000-000000000003', '+919876500003', 'Priya Sharma',   'worker', 'hi'),
  ('00000000-0000-0000-0000-000000000004', '+919876500004', 'Harjinder Singh','worker', 'pa')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert worker profiles
INSERT INTO public.workers (id, skills, languages, rating, verified, available, lat, lng, experience_years)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '{"cleaning","cooking","maid"}',
    '{"Hindi","Punjabi"}',
    4.8, true, true,
    30.7333, 76.7794,
    5
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '{"cooking","maid"}',
    '{"Hindi"}',
    4.5, true, true,
    30.7410, 76.7850,
    3
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '{"nurse","physiotherapist"}',
    '{"Hindi","English"}',
    4.9, true, true,
    30.7280, 76.7720,
    8
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '{"driver"}',
    '{"Punjabi","Hindi"}',
    0, true, true,
    30.7360, 76.7900,
    2
  )
ON CONFLICT (id) DO NOTHING;
