-- Drop the users_public view as it's no longer needed
-- All user operations now go through secure SECURITY DEFINER RPCs
DROP VIEW IF EXISTS public.users_public;