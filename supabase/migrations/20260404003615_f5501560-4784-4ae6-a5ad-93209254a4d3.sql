
-- Gmail integrations table
CREATE TABLE public.gmail_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(gym_id)
);

ALTER TABLE public.gmail_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym owners can manage gmail integration"
  ON public.gmail_integrations FOR ALL
  USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can view gmail integration"
  ON public.gmail_integrations FOR SELECT
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all gmail integrations"
  ON public.gmail_integrations FOR ALL
  USING (is_super_admin(auth.uid()));

-- Lead email filters table
CREATE TABLE public.lead_email_filters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  filter_location text NOT NULL DEFAULT 'both' CHECK (filter_location IN ('subject', 'body', 'both')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_email_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff can manage filters"
  ON public.lead_email_filters FOR ALL
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all filters"
  ON public.lead_email_filters FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create email lead status enum
CREATE TYPE public.email_lead_status AS ENUM (
  'new', 'contacted', 'interested', 'trial', 'negotiation', 'converted', 'not_interested'
);

-- Email leads table
CREATE TABLE public.email_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  sender_email text NOT NULL,
  sender_name text,
  subject text,
  email_body text,
  lead_status email_lead_status NOT NULL DEFAULT 'new',
  temperature public.lead_temperature NOT NULL DEFAULT 'warm',
  source text NOT NULL DEFAULT 'email',
  gmail_thread_id text,
  gmail_message_id text UNIQUE,
  assigned_to uuid,
  notes text,
  converted_member_id uuid REFERENCES public.members(id),
  next_follow_up_at timestamp with time zone,
  last_contacted_at timestamp with time zone,
  follow_up_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_leads_gym_id ON public.email_leads(gym_id);
CREATE INDEX idx_email_leads_status ON public.email_leads(lead_status);
CREATE INDEX idx_email_leads_gmail_msg ON public.email_leads(gmail_message_id);
CREATE INDEX idx_email_leads_follow_up ON public.email_leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL AND deleted_at IS NULL;

CREATE POLICY "Gym staff can manage email leads"
  ON public.email_leads FOR ALL
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all email leads"
  ON public.email_leads FOR ALL
  USING (is_super_admin(auth.uid()));

-- Email reply logs
CREATE TABLE public.email_reply_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_lead_id uuid NOT NULL REFERENCES public.email_leads(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  message text NOT NULL,
  sent_by uuid,
  gmail_message_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_reply_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff can manage reply logs"
  ON public.email_reply_logs FOR ALL
  USING (has_gym_access(auth.uid(), gym_id));

-- Lead followups
CREATE TABLE public.lead_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_lead_id uuid NOT NULL REFERENCES public.email_leads(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  follow_up_at timestamp with time zone NOT NULL,
  reminder_sent boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  assigned_to uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lead_followups_due ON public.lead_followups(follow_up_at) WHERE completed = false;

CREATE POLICY "Gym staff can manage followups"
  ON public.lead_followups FOR ALL
  USING (has_gym_access(auth.uid(), gym_id));

-- Triggers for updated_at
CREATE TRIGGER update_gmail_integrations_updated_at
  BEFORE UPDATE ON public.gmail_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_email_filters_updated_at
  BEFORE UPDATE ON public.lead_email_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_leads_updated_at
  BEFORE UPDATE ON public.email_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_followups_updated_at
  BEFORE UPDATE ON public.lead_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
