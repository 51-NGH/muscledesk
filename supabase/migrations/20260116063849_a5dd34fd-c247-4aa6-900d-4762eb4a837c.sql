-- Create a unique partial index that enforces phone uniqueness per gym only for non-deleted members
CREATE UNIQUE INDEX idx_members_phone_gym_unique 
ON public.members (phone, gym_id) 
WHERE deleted_at IS NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_members_phone_gym_unique IS 'Ensures phone numbers are unique within a gym for active (non-deleted) members. Allows reuse of phone numbers from soft-deleted members.';