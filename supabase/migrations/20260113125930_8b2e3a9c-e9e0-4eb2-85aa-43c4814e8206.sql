-- Drop the existing unique constraint that includes deleted members
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_gym_id_phone_key;

-- Create a partial unique index that only applies to non-deleted members
CREATE UNIQUE INDEX members_gym_id_phone_active_key 
ON public.members (gym_id, phone) 
WHERE deleted_at IS NULL;