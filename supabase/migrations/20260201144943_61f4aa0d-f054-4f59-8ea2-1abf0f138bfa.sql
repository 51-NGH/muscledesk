-- Fix overly permissive RLS policies on push_subscriptions table
-- Current policies use 'true' which allows any authenticated user to access any subscription

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Members can delete own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Members can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Members can update own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Members can view own subscriptions" ON public.push_subscriptions;

-- Create properly scoped policies

-- Members can only view their own subscriptions
CREATE POLICY "Members can view own subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only insert subscriptions for themselves
CREATE POLICY "Members can insert own subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own subscriptions
CREATE POLICY "Members can update own subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only delete their own subscriptions
CREATE POLICY "Members can delete own subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Gym staff can view subscriptions for their gym (for sending notifications)
CREATE POLICY "Gym staff can view subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (has_gym_access(auth.uid(), gym_id));