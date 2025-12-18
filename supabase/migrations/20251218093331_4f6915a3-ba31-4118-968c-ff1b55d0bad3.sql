-- Add deletion_reason column to container_entries
ALTER TABLE public.container_entries ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add paperback_checked column to container_entries
ALTER TABLE public.container_entries ADD COLUMN IF NOT EXISTS paperback_checked BOOLEAN DEFAULT false;

-- Drop and recreate get_all_entries_admin with session validation
DROP FUNCTION IF EXISTS public.get_all_entries_admin(text);
CREATE OR REPLACE FUNCTION public.get_all_entries_admin(p_session_token text)
RETURNS TABLE(
  id uuid, 
  container_number text, 
  second_container_number text, 
  container_size text, 
  entry_type text, 
  license_plate_number text, 
  user_name text, 
  user_id uuid, 
  created_at timestamp with time zone, 
  deletion_requested boolean, 
  deletion_requested_at timestamp with time zone,
  deletion_reason text,
  paperback_checked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    ce.license_plate_number,
    ce.user_name,
    ce.user_id,
    ce.created_at,
    ce.deletion_requested,
    ce.deletion_requested_at,
    ce.deletion_reason,
    ce.paperback_checked
  FROM public.container_entries ce
  ORDER BY ce.created_at DESC;
END;
$$;

-- Drop and recreate get_deletion_requests to include deletion_reason
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
SET search_path = public
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

-- Drop and recreate request_entry_deletion to accept deletion_reason
DROP FUNCTION IF EXISTS public.request_entry_deletion(text, uuid);
CREATE OR REPLACE FUNCTION public.request_entry_deletion(p_session_token text, p_entry_id uuid, p_deletion_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_entry_owner UUID;
BEGIN
  -- Validate session
  SELECT us.user_id INTO v_user_id 
  FROM public.validate_user_session(p_session_token) us;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;
  
  -- Check entry ownership
  SELECT ce.user_id INTO v_entry_owner 
  FROM public.container_entries ce WHERE ce.id = p_entry_id;
  
  IF v_entry_owner IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  IF v_entry_owner != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own entries';
  END IF;
  
  -- Mark for deletion with reason
  UPDATE public.container_entries SET
    deletion_requested = true,
    deletion_requested_at = now(),
    deletion_requested_by = v_user_id,
    deletion_reason = p_deletion_reason
  WHERE id = p_entry_id;
  
  RETURN TRUE;
END;
$$;

-- Create toggle_paperback_status RPC
CREATE OR REPLACE FUNCTION public.toggle_paperback_status(p_session_token text, p_entry_id uuid, p_checked boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_entry_owner UUID;
BEGIN
  -- Validate session
  SELECT us.user_id INTO v_user_id 
  FROM public.validate_user_session(p_session_token) us;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;
  
  -- Check entry ownership
  SELECT ce.user_id INTO v_entry_owner 
  FROM public.container_entries ce WHERE ce.id = p_entry_id;
  
  IF v_entry_owner IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  IF v_entry_owner != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own entries';
  END IF;
  
  -- Update paperback status
  UPDATE public.container_entries SET
    paperback_checked = p_checked
  WHERE id = p_entry_id;
  
  RETURN TRUE;
END;
$$;

-- Update get_user_entries to include paperback_checked
DROP FUNCTION IF EXISTS public.get_user_entries(text);
CREATE OR REPLACE FUNCTION public.get_user_entries(p_session_token text)
RETURNS TABLE(
  id uuid, 
  container_number text, 
  second_container_number text, 
  container_size text, 
  entry_type text, 
  license_plate_number text, 
  container_image text, 
  user_name text, 
  user_id uuid, 
  created_at timestamp with time zone, 
  deletion_requested boolean, 
  deletion_requested_at timestamp with time zone,
  paperback_checked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate session and get user_id
  SELECT us.user_id INTO v_user_id 
  FROM public.validate_user_session(p_session_token) us;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;
  
  RETURN QUERY
  SELECT 
    ce.id,
    ce.container_number,
    ce.second_container_number,
    ce.container_size,
    ce.entry_type,
    ce.license_plate_number,
    ce.container_image,
    ce.user_name,
    ce.user_id,
    ce.created_at,
    ce.deletion_requested,
    ce.deletion_requested_at,
    ce.paperback_checked
  FROM public.container_entries ce
  WHERE ce.user_id = v_user_id
  ORDER BY ce.created_at DESC;
END;
$$;