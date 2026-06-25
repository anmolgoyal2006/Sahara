-- ============================================================
-- COMPLETE FIX: Update Bookings Table & Permissions
-- Run this in Supabase SQL Editor!
-- ============================================================

-- Step 1: Add the missing columns (if not already present)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS rating INTEGER NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS review TEXT NULL;

-- Step 2: Verify table owner (should be postgres or supabase_admin)
SELECT
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bookings';

-- Step 3: Ensure proper permissions for authenticated & service_role
GRANT ALL ON public.bookings TO postgres;
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO authenticated;

-- Step 4: Confirmation
SELECT '✅ Bookings table updated and permissions fixed!' AS message;
