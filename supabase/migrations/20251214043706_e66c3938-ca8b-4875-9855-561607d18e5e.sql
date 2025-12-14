-- Drop and recreate get_deletion_requests with new return type
DROP FUNCTION IF EXISTS public.get_deletion_requests(text);

CREATE OR REPLACE FUNCTION public.get_deletion_requests(p_session_token text)
RETURNS TABLE(
  id uuid,
  container_number text,
  second_container_number text,
  container_size text,
  entry_type text,
  user_name text,
  created_at timestamp with time zone,
  deletion_requested_at timestamp with time zone,
  deletion_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Validate admin session
  SELECT admin_id INTO v_admin_id 
  FROM public.validate_admin_session(p_session_token);
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired admin session';
  END IF;
  
  RETURN QUERY
  SELECT 
    ce.id,
    ce.container_number,
    ce.second_container_number,
    ce.container_size,
    ce.entry_type,
    ce.user_name,
    ce.created_at,
    ce.deletion_requested_at,
    ce.deletion_reason
  FROM public.container_entries ce
  WHERE ce.deletion_requested = true
  ORDER BY ce.deletion_requested_at DESC;
END;
$$;