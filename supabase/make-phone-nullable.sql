-- FIX THE PHONE COLUMN TO ALLOW NULL VALUES
alter table public.users 
alter column phone drop not null;
