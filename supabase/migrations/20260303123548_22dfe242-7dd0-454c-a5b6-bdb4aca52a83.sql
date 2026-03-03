
-- Lead status enum
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'trial_booked', 'trial_done', 'interested', 'not_interested', 'converted');

-- Lead temperature enum
CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold');

-- Lead activity type enum
CREATE TYPE public.lead_activity_type AS ENUM ('call', 'whatsapp', 'visit', 'trial', 'note', 'status_change');

-- Lead source enum
CREATE TYPE public.lead_source AS ENUM ('instagram', 'walk_in', 'referral', 'website', 'other');

-- Leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  source public.lead_source NOT NULL DEFAULT 'walk_in',
  interest_plan text,
  status public.lead_status NOT NULL DEFAULT 'new',
  temperature public.lead_temperature NOT NULL DEFAULT 'warm',
  assigned_to uuid,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  follow_up_count integer NOT NULL DEFAULT 0,
  notes text,
  converted_member_id uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Lead activities table
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type public.lead_activity_type NOT NULL,
  description text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_gym_id ON public.leads(gym_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_next_follow_up ON public.leads(next_follow_up_at);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_deleted_at ON public.leads(deleted_at);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);

-- Updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Leads RLS policies
CREATE POLICY "Gym staff can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (has_gym_access(auth.uid(), gym_id) AND deleted_at IS NULL);

CREATE POLICY "Gym owners can manage leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Staff can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Lead activities RLS policies
CREATE POLICY "Gym staff can view lead activities"
  ON public.lead_activities FOR SELECT
  TO authenticated
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym staff can insert lead activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all lead activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Analytics RPC
CREATE OR REPLACE FUNCTION public.get_lead_analytics(_gym_id uuid)
RETURNS TABLE(
  total_leads bigint,
  new_leads_this_month bigint,
  converted_leads_this_month bigint,
  conversion_rate numeric,
  hot_leads_count bigint,
  overdue_followups_count bigint,
  average_conversion_time_days numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(*) FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL) as total_leads,
    (SELECT COUNT(*) FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL 
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as new_leads_this_month,
    (SELECT COUNT(*) FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL 
      AND status = 'converted'
      AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)) as converted_leads_this_month,
    ROUND(
      COALESCE(
        (SELECT COUNT(*)::numeric FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL AND status = 'converted') /
        NULLIF((SELECT COUNT(*)::numeric FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL), 0) * 100,
        0
      ), 1
    ) as conversion_rate,
    (SELECT COUNT(*) FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL AND temperature = 'hot') as hot_leads_count,
    (SELECT COUNT(*) FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL 
      AND next_follow_up_at < NOW() AND status NOT IN ('converted', 'not_interested')) as overdue_followups_count,
    ROUND(
      COALESCE(
        (SELECT AVG(EXTRACT(epoch FROM (updated_at - created_at)) / 86400)
         FROM leads WHERE gym_id = _gym_id AND deleted_at IS NULL AND status = 'converted'),
        0
      ), 1
    ) as average_conversion_time_days;
$$;

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
