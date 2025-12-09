-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Update the create_admin_user function to use extensions.gen_salt
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
  VALUES (admin_email, extensions.crypt(admin_password, extensions.gen_salt('bf')), admin_name, admin_role)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Update the verify_admin_login function to use extensions.crypt
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
    AND au.password_hash = extensions.crypt(admin_password, au.password_hash);
END;
$$;