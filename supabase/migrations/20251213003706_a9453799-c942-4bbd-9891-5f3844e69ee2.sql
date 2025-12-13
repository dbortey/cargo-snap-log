-- Drop the existing function first, then recreate with new return type
DROP FUNCTION IF EXISTS public.verify_user_login(text, text);

-- Recreate verify_user_login to also return staff_id for session creation
CREATE OR REPLACE FUNCTION public.verify_user_login(p_name text, p_code text)
RETURNS TABLE(user_id uuid, user_name text, user_staff_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.staff_id
  FROM public.users u
  WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(p_name))
    AND u.code = p_code;
END;
$$;