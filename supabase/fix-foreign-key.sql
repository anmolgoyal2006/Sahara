-- ============================================================
-- FIX THE FOREIGN KEY ON USERS TABLE
-- ============================================================

-- Step 1: Drop the existing (incorrect) foreign key constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Add the CORRECT foreign key constraint that references auth.users
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
