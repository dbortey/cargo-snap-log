-- Add deletion request columns to container_entries
ALTER TABLE public.container_entries 
ADD COLUMN deletion_requested BOOLEAN DEFAULT false,
ADD COLUMN deletion_requested_at TIMESTAMPTZ,
ADD COLUMN deletion_requested_by UUID REFERENCES public.users(id);

-- Update RLS policy - remove direct delete, only allow marking for deletion
DROP POLICY IF EXISTS "Users can delete their own entries" ON public.container_entries;

-- Users can only update their own entries (including marking for deletion)
DROP POLICY IF EXISTS "Users can update their own entries" ON public.container_entries;
CREATE POLICY "Users can update their own entries" 
ON public.container_entries 
FOR UPDATE 
USING (user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1));

-- Create function to get deletion requests for admin
CREATE OR REPLACE FUNCTION public.get_deletion_requests()
RETURNS TABLE(
  id UUID,
  container_number TEXT,
  second_container_number TEXT,
  container_size TEXT,
  entry_type TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ,
  deletion_requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.container_number,
    ce.second_container_number,
    ce.container_size,
    ce.entry_type,
    ce.user_name,
    ce.created_at,
    ce.deletion_requested_at
  FROM public.container_entries ce
  WHERE ce.deletion_requested = true
  ORDER BY ce.deletion_requested_at DESC;
END;
$$;

-- Create function for admin to confirm deletion
CREATE OR REPLACE FUNCTION public.confirm_entry_deletion(entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.container_entries WHERE id = entry_id;
  RETURN FOUND;
END;
$$;

-- Create function for admin to reject deletion request
CREATE OR REPLACE FUNCTION public.reject_deletion_request(entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.container_entries 
  SET deletion_requested = false,
      deletion_requested_at = NULL,
      deletion_requested_by = NULL
  WHERE id = entry_id;
  RETURN FOUND;
END;
$$;