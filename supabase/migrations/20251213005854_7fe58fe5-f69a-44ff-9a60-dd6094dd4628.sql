-- Create the user_sessions table for managing user sessions
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Create index on session_token for fast lookups
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);

-- Create index on user_id for session management
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Block all direct access to user_sessions table
CREATE POLICY "Block all public access to user_sessions"
ON public.user_sessions
FOR ALL
USING (false);

-- Function to create a user session
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id UUID,
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
  -- Delete any existing sessions for this user (single session policy)
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  
  -- Create new session
  INSERT INTO public.user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
  VALUES (p_user_id, p_session_token, p_expires_at, p_ip_address, p_user_agent);
  
  RETURN TRUE;
END;
$$;

-- Function to validate a user session
CREATE OR REPLACE FUNCTION public.validate_user_session(p_session_token TEXT)
RETURNS TABLE(user_id UUID, user_name TEXT, user_staff_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired sessions first
  DELETE FROM public.user_sessions WHERE expires_at < now();
  
  -- Return user info if session is valid
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.staff_id
  FROM public.user_sessions s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.session_token = p_session_token
    AND s.expires_at > now();
END;
$$;

-- Function to invalidate a user session
CREATE OR REPLACE FUNCTION public.invalidate_user_session(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions WHERE session_token = p_session_token;
  RETURN FOUND;
END;
$$;