-- Remove the permissive RLS policy that allows anonymous access to attendance
DROP POLICY IF EXISTS "Anon can subscribe to attendance with member_id filter" ON public.attendance;