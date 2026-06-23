-- ============================================================
-- TEMPORARY FIX: DROP FOREIGN KEY COMPLETELY
-- ============================================================

-- Step 1: Drop any existing foreign key constraint on users.id
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Make phone column nullable
ALTER TABLE public.users 
ALTER COLUMN phone DROP NOT NULL;
