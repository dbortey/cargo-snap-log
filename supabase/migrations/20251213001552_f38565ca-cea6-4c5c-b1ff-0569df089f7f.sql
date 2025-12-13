-- Add restrictive RLS policies to admin_users table (block all direct access)
CREATE POLICY "Block all public access to admin_users"
ON public.admin_users
FOR ALL
USING (false);

-- Add restrictive RLS policies to admin_sessions table (block all direct access)
CREATE POLICY "Block all public access to admin_sessions"
ON public.admin_sessions
FOR ALL
USING (false);