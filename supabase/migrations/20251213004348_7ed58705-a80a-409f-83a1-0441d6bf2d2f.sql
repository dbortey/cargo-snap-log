-- Create RPC to get user's own container entries (validated by session)
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
  deletion_requested_at timestamp with time zone
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
    ce.deletion_requested_at
  FROM public.container_entries ce
  WHERE ce.user_id = v_user_id
  ORDER BY ce.created_at DESC;
END;
$$;

-- Create RPC to insert a container entry (validated by session)
CREATE OR REPLACE FUNCTION public.create_container_entry(
  p_session_token text,
  p_container_number text,
  p_container_size text,
  p_entry_type text,
  p_second_container_number text DEFAULT NULL,
  p_license_plate_number text DEFAULT NULL,
  p_container_image text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_new_id UUID;
BEGIN
  -- Validate session and get user info
  SELECT us.user_id, us.user_name INTO v_user_id, v_user_name 
  FROM public.validate_user_session(p_session_token) us;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;
  
  -- Insert entry with validated user_id
  INSERT INTO public.container_entries (
    container_number,
    second_container_number,
    container_size,
    entry_type,
    license_plate_number,
    container_image,
    user_id,
    user_name
  ) VALUES (
    p_container_number,
    p_second_container_number,
    p_container_size,
    p_entry_type,
    p_license_plate_number,
    p_container_image,
    v_user_id,
    v_user_name
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Create RPC to update a container entry (only owner can update)
CREATE OR REPLACE FUNCTION public.update_container_entry(
  p_session_token text,
  p_entry_id uuid,
  p_container_number text DEFAULT NULL,
  p_second_container_number text DEFAULT NULL,
  p_container_size text DEFAULT NULL,
  p_entry_type text DEFAULT NULL,
  p_license_plate_number text DEFAULT NULL
)
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
  
  -- Update entry (only non-null values)
  UPDATE public.container_entries SET
    container_number = COALESCE(p_container_number, container_number),
    second_container_number = COALESCE(p_second_container_number, second_container_number),
    container_size = COALESCE(p_container_size, container_size),
    entry_type = COALESCE(p_entry_type, entry_type),
    license_plate_number = COALESCE(p_license_plate_number, license_plate_number)
  WHERE id = p_entry_id;
  
  RETURN TRUE;
END;
$$;

-- Create RPC to request deletion (only owner can request)
CREATE OR REPLACE FUNCTION public.request_entry_deletion(
  p_session_token text,
  p_entry_id uuid
)
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
  
  -- Mark for deletion
  UPDATE public.container_entries SET
    deletion_requested = true,
    deletion_requested_at = now(),
    deletion_requested_by = v_user_id
  WHERE id = p_entry_id;
  
  RETURN TRUE;
END;
$$;

-- Now restrict RLS policies to block direct access
DROP POLICY IF EXISTS "Authenticated users can view all entries" ON public.container_entries;
DROP POLICY IF EXISTS "Users can create their own entries" ON public.container_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON public.container_entries;

-- Block all direct access - only via SECURITY DEFINER functions
CREATE POLICY "Block direct select on container_entries"
ON public.container_entries FOR SELECT
USING (false);

CREATE POLICY "Block direct insert on container_entries"
ON public.container_entries FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct update on container_entries"
ON public.container_entries FOR UPDATE
USING (false);

CREATE POLICY "Block direct delete on container_entries"
ON public.container_entries FOR DELETE
USING (false);