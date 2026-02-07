
-- Create whatsapp_logs table
CREATE TABLE public.whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id),
  member_id UUID NOT NULL REFERENCES public.members(id),
  template_name TEXT NOT NULL,
  phone TEXT,
  payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  status TEXT NOT NULL DEFAULT 'skipped' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for gym-based queries
CREATE INDEX idx_whatsapp_logs_gym_id ON public.whatsapp_logs(gym_id);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Gym owners/staff can read their own gym's logs
CREATE POLICY "Gym staff can view their whatsapp logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

-- No insert/update/delete policies for regular users (service role only)

-- Create whatsapp_rate_limits table
CREATE TABLE public.whatsapp_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_gym_date UNIQUE (gym_id, date)
);

-- Enable RLS with no policies (service role bypasses, frontend blocked)
ALTER TABLE public.whatsapp_rate_limits ENABLE ROW LEVEL SECURITY;
