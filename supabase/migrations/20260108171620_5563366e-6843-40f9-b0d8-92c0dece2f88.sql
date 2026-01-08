-- Allow authenticated users to create a gym with themselves as owner
CREATE POLICY "Users can create own gym"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());