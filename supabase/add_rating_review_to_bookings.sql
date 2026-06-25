-- ============================================================
-- MIGRATION: Add rating and review columns to bookings table
-- Run in Supabase SQL Editor (using postgres or service role)
-- ============================================================

-- Only add columns if they don't exist
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS rating INTEGER NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS review TEXT NULL;

-- Confirmation
SELECT 'Columns added successfully!' AS message;
