-- Create import_logs table to track bulk import history
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'csv',
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  plans_created INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_details JSONB
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for gym access
CREATE POLICY "Users can view their gym's import logs"
ON public.import_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE gyms.id = import_logs.gym_id 
    AND (gyms.owner_id = auth.uid() OR public.is_gym_staff(import_logs.gym_id, auth.uid()))
  )
);

CREATE POLICY "Users can create import logs for their gym"
ON public.import_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE gyms.id = import_logs.gym_id 
    AND (gyms.owner_id = auth.uid() OR public.is_gym_staff(import_logs.gym_id, auth.uid()))
  )
);

-- Create index for faster queries
CREATE INDEX idx_import_logs_gym_id ON public.import_logs(gym_id);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);