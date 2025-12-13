-- Drop the security definer view and replace with security invoker
DROP VIEW IF EXISTS public.users_public;

-- Create the view with SECURITY INVOKER (which is the default, but being explicit)
CREATE VIEW public.users_public 
WITH (security_invoker = true)
AS SELECT id, name FROM public.users;

-- Grant access to the view
GRANT SELECT ON public.users_public TO anon, authenticated;