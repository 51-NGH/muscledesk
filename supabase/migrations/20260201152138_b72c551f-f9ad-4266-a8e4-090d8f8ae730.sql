-- Fix gym_chat_messages SELECT policy - restrict to gym members only
-- Current policy allows ANY authenticated user to read ALL messages (USING true)
-- This exposes private gym communications across all gyms

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Members can view chat messages" ON public.gym_chat_messages;

-- Create proper scoped policy: members can only view messages from their own gym
CREATE POLICY "Members can view their gym's chat messages"
  ON public.gym_chat_messages FOR SELECT
  USING (
    gym_id IN (
      SELECT gym_id FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );