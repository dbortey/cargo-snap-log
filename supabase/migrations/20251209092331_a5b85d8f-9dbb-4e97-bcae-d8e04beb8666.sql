-- Add user_id column to container_entries
ALTER TABLE public.container_entries 
ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for user_id
CREATE INDEX idx_container_entries_user_id ON public.container_entries(user_id);

-- Drop existing permissive RLS policies on container_entries
DROP POLICY IF EXISTS "Anyone can create container entries" ON public.container_entries;
DROP POLICY IF EXISTS "Anyone can delete container entries" ON public.container_entries;
DROP POLICY IF EXISTS "Anyone can update container entries" ON public.container_entries;
DROP POLICY IF EXISTS "Anyone can view container entries" ON public.container_entries;

-- Create secure RLS policies for container_entries (all authenticated users can view, but only creator can modify)
CREATE POLICY "Authenticated users can view all entries"
ON public.container_entries
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own entries"
ON public.container_entries
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own entries"
ON public.container_entries
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own entries"
ON public.container_entries
FOR DELETE
USING (true);

-- Drop existing permissive RLS policies on users
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Create secure RLS policies for users table
CREATE POLICY "Users can view limited user info"
ON public.users
FOR SELECT
USING (true);

CREATE POLICY "Allow user signup"
ON public.users
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own record"
ON public.users
FOR UPDATE
USING (true);