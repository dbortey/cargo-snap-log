-- Add new columns to users table for staff authentication
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS staff_id text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS recovery_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recovery_requested_at timestamp with time zone;

-- Create index for staff_id lookups
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON public.users(staff_id);

-- Create index for recovery requests (for admin to check)
CREATE INDEX IF NOT EXISTS idx_users_recovery_requested ON public.users(recovery_requested) WHERE recovery_requested = true;