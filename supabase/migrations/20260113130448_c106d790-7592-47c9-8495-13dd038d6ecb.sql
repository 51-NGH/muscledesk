-- Drop the old unique constraint that's still blocking
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_gym_phone_unique;

-- Also drop the redundant unique index (we already have the partial one)
DROP INDEX IF EXISTS members_gym_phone_unique;