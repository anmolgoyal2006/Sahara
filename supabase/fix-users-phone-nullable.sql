-- Make phone column nullable in users table
alter table public.users 
alter column phone drop not null;
