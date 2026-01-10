-- Add auth_user_id to members table to link members to auth accounts
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON public.members(auth_user_id);

-- Create RLS policies for member self-access
CREATE POLICY "Members can view own record"
ON public.members
FOR SELECT
USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

-- Members can view their own attendance
CREATE POLICY "Members can view own attendance"
ON public.attendance
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Members can view their own payments
CREATE POLICY "Members can view own payments"
ON public.payments
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Helper function to get member by auth user
CREATE OR REPLACE FUNCTION public.get_member_by_auth_user(_user_id uuid)
RETURNS public.members
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.members
  WHERE auth_user_id = _user_id
    AND deleted_at IS NULL
  LIMIT 1;
$$;