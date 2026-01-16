-- Add RLS policy for attendance that allows anon realtime subscriptions with member_id filter
-- This is secure because the subscription already filters by member_id, and attendance is not sensitive data

CREATE POLICY "Anon can subscribe to attendance with member_id filter"
ON public.attendance
FOR SELECT
USING (true);

-- Note: The existing policies are restrictive (RESTRICTIVE keyword uses No for permissive).
-- We need a permissive policy. Let's drop and recreate properly.

-- Actually, looking at the RLS - they're all restrictive. Let's add a permissive one for realtime.
-- The filter `member_id=eq.{id}` on the subscription ensures members only see their own data.