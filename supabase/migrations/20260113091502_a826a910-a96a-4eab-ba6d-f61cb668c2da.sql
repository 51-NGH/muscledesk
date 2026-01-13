-- Fix RLS policies for payments to allow gym staff access (not just owners)
DROP POLICY IF EXISTS "Gym owners can manage payments" ON public.payments;

CREATE POLICY "Gym staff can view payments" 
ON public.payments 
FOR SELECT 
USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can update payments" 
ON public.payments 
FOR UPDATE 
USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can delete payments" 
ON public.payments 
FOR DELETE 
USING (owns_gym(auth.uid(), gym_id));

-- Fix RLS policies for expenses to allow gym staff access (not just owners)  
DROP POLICY IF EXISTS "Gym owners can manage expenses" ON public.expenses;

CREATE POLICY "Gym staff can view expenses" 
ON public.expenses 
FOR SELECT 
USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (owns_gym(auth.uid(), gym_id));