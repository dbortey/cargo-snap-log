-- Create admin_sessions table for server-side session validation
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- No direct access to admin_sessions via RLS - only through security definer functions
-- This prevents any client-side manipulation

-- Create index for faster token lookups
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at);

-- Create function to validate admin session token
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token TEXT)
RETURNS TABLE(admin_id UUID, admin_email TEXT, admin_name TEXT, admin_role admin_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired sessions first
  DELETE FROM public.admin_sessions WHERE expires_at < now();
  
  -- Return admin info if session is valid
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.name,
    au.role
  FROM public.admin_sessions s
  JOIN public.admin_users au ON au.id = s.admin_id
  WHERE s.session_token = validate_admin_session.session_token
    AND s.expires_at > now();
END;
$$;

-- Create function to create admin session
CREATE OR REPLACE FUNCTION public.create_admin_session(
  p_admin_id UUID,
  p_session_token TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any existing sessions for this admin (single session policy)
  DELETE FROM public.admin_sessions WHERE admin_id = p_admin_id;
  
  -- Create new session
  INSERT INTO public.admin_sessions (admin_id, session_token, expires_at, ip_address, user_agent)
  VALUES (p_admin_id, p_session_token, p_expires_at, p_ip_address, p_user_agent);
  
  RETURN TRUE;
END;
$$;

-- Create function to invalidate admin session (logout)
CREATE OR REPLACE FUNCTION public.invalidate_admin_session(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_sessions WHERE session_token = p_session_token;
  RETURN FOUND;
END;
$$;

-- Update the security definer functions to require admin session validation
-- Update get_recovery_requests to require valid admin session
CREATE OR REPLACE FUNCTION public.get_recovery_requests(p_session_token TEXT)
RETURNS TABLE(id UUID, name TEXT, staff_id TEXT, phone_number TEXT, code TEXT, recovery_requested_at TIMESTAMP WITH TIME ZONE)
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
    u.id,
    u.name,
    u.staff_id,
    u.phone_number,
    u.code,
    u.recovery_requested_at
  FROM public.users u
  WHERE u.recovery_requested = true
  ORDER BY u.recovery_requested_at DESC;
END;
$$;

-- Update complete_recovery to require valid admin session
CREATE OR REPLACE FUNCTION public.complete_recovery(p_session_token TEXT, p_user_id UUID)
RETURNS BOOLEAN
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
  
  UPDATE public.users
  SET recovery_requested = false,
      recovery_requested_at = NULL
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Update get_deletion_requests to require valid admin session
CREATE OR REPLACE FUNCTION public.get_deletion_requests(p_session_token TEXT)
RETURNS TABLE(id UUID, container_number TEXT, second_container_number TEXT, container_size TEXT, entry_type TEXT, user_name TEXT, created_at TIMESTAMP WITH TIME ZONE, deletion_requested_at TIMESTAMP WITH TIME ZONE)
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
    ce.deletion_requested_at
  FROM public.container_entries ce
  WHERE ce.deletion_requested = true
  ORDER BY ce.deletion_requested_at DESC;
END;
$$;

-- Update confirm_entry_deletion to require valid admin session
CREATE OR REPLACE FUNCTION public.confirm_entry_deletion(p_session_token TEXT, p_entry_id UUID)
RETURNS BOOLEAN
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
  
  DELETE FROM public.container_entries WHERE id = p_entry_id;
  RETURN FOUND;
END;
$$;

-- Update reject_deletion_request to require valid admin session
CREATE OR REPLACE FUNCTION public.reject_deletion_request(p_session_token TEXT, p_entry_id UUID)
RETURNS BOOLEAN
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
  
  UPDATE public.container_entries 
  SET deletion_requested = false,
      deletion_requested_at = NULL,
      deletion_requested_by = NULL
  WHERE id = p_entry_id;
  RETURN FOUND;
END;
$$;

-- Fix RLS policies on users table
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view limited user info" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

-- Create a view that exposes only non-sensitive user info for login lookups
CREATE OR REPLACE VIEW public.users_public AS
SELECT id, name
FROM public.users;

-- Grant access to the public view
GRANT SELECT ON public.users_public TO anon, authenticated;

-- Create secure login function that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.verify_user_login(p_name TEXT, p_code TEXT)
RETURNS TABLE(user_id UUID, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name
  FROM public.users u
  WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(p_name))
    AND u.code = p_code;
END;
$$;

-- Create function to safely check if staff_id exists (for signup validation)
CREATE OR REPLACE FUNCTION public.check_staff_id_available(p_staff_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE staff_id = p_staff_id
  );
END;
$$;

-- Create function for user signup (secure, doesn't expose existing data)
CREATE OR REPLACE FUNCTION public.create_user_account(
  p_name TEXT,
  p_staff_id TEXT,
  p_phone_number TEXT,
  p_code TEXT
)
RETURNS TABLE(user_id UUID, user_name TEXT, user_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Check if staff_id already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE staff_id = p_staff_id) THEN
    RAISE EXCEPTION 'Staff ID already registered';
  END IF;
  
  -- Insert new user
  INSERT INTO public.users (name, staff_id, phone_number, code)
  VALUES (p_name, p_staff_id, p_phone_number, p_code)
  RETURNING id INTO v_new_id;
  
  RETURN QUERY SELECT v_new_id, p_name, p_code;
END;
$$;

-- Create function for recovery request (secure, validates staff_id exists)
CREATE OR REPLACE FUNCTION public.request_recovery(p_staff_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET recovery_requested = true,
      recovery_requested_at = now()
  WHERE staff_id = p_staff_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to update last_seen (called after login)
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET last_seen_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Restrictive RLS policy - only allow insert via security definer function
CREATE POLICY "Users can insert via signup function only"
ON public.users
FOR INSERT
WITH CHECK (false);

-- Restrictive SELECT policy - only allow via security definer functions
CREATE POLICY "No direct user data access"
ON public.users
FOR SELECT
USING (false);

-- Restrictive UPDATE policy - only allow via security definer functions  
CREATE POLICY "No direct user updates"
ON public.users
FOR UPDATE
USING (false);