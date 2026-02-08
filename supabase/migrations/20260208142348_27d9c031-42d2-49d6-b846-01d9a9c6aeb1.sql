
-- Allow gym owners/staff to update import_logs (for marking reverted)
CREATE POLICY "Users can update their gym's import logs"
ON public.import_logs
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM gyms
  WHERE gyms.id = import_logs.gym_id
  AND (gyms.owner_id = auth.uid() OR is_gym_staff(import_logs.gym_id, auth.uid()))
));

-- Allow gym owners to delete attendance (needed for revert)
CREATE POLICY "Gym owners can delete attendance"
ON public.attendance
FOR DELETE
USING (has_gym_access(auth.uid(), gym_id));
