-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('admin', 'super_admin');

-- Create admin_users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can only be managed via direct database access (super secure)
-- No public policies - admins are created manually in database

-- Create a security definer function to verify admin credentials
CREATE OR REPLACE FUNCTION public.verify_admin_login(admin_email TEXT, admin_password TEXT)
RETURNS TABLE(id UUID, email TEXT, name TEXT, role admin_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.name,
    au.role
  FROM public.admin_users au
  WHERE au.email = admin_email 
    AND au.password_hash = crypt(admin_password, au.password_hash);
END;
$$;

-- Create function to hash password for admin creation
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT,
  admin_role admin_role DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.admin_users (email, password_hash, name, role)
  VALUES (admin_email, crypt(admin_password, gen_salt('bf')), admin_name, admin_role)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to get recovery requests (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_recovery_requests()
RETURNS TABLE(
  id UUID,
  name TEXT,
  staff_id TEXT,
  phone_number TEXT,
  code TEXT,
  recovery_requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create function to mark recovery as complete
CREATE OR REPLACE FUNCTION public.complete_recovery(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET recovery_requested = false,
      recovery_requested_at = NULL
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;