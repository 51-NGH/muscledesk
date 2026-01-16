-- Create brands table to group multiple gyms under one organization
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Add brand_id to gyms table
ALTER TABLE public.gyms ADD COLUMN brand_id uuid REFERENCES public.brands(id);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- RLS policies for brands
CREATE POLICY "Super admin can manage all brands"
ON public.brands FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Brand owners can view own brands"
ON public.brands FOR SELECT
USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Brand owners can update own brands"
ON public.brands FOR UPDATE
USING (owner_id = auth.uid() AND deleted_at IS NULL);

-- Function to get all gyms in a brand
CREATE OR REPLACE FUNCTION public.get_brand_gyms(_brand_id uuid)
RETURNS SETOF gyms
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.gyms
  WHERE brand_id = _brand_id
    AND deleted_at IS NULL
  ORDER BY name;
$$;

-- Function to get cross-branch analytics
CREATE OR REPLACE FUNCTION public.get_brand_analytics(_brand_id uuid)
RETURNS TABLE(
  total_gyms bigint,
  total_members bigint,
  active_members bigint,
  total_revenue numeric,
  monthly_revenue numeric,
  today_attendance bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM gyms WHERE brand_id = _brand_id AND deleted_at IS NULL) as total_gyms,
    (SELECT COUNT(*) FROM members m 
     JOIN gyms g ON m.gym_id = g.id 
     WHERE g.brand_id = _brand_id AND m.deleted_at IS NULL AND g.deleted_at IS NULL) as total_members,
    (SELECT COUNT(*) FROM members m 
     JOIN gyms g ON m.gym_id = g.id 
     WHERE g.brand_id = _brand_id AND m.status = 'active' AND m.deleted_at IS NULL AND g.deleted_at IS NULL) as active_members,
    COALESCE((SELECT SUM(p.amount) FROM payments p 
     JOIN gyms g ON p.gym_id = g.id 
     WHERE g.brand_id = _brand_id AND p.status = 'completed' AND g.deleted_at IS NULL), 0) as total_revenue,
    COALESCE((SELECT SUM(p.amount) FROM payments p 
     JOIN gyms g ON p.gym_id = g.id 
     WHERE g.brand_id = _brand_id AND p.status = 'completed' 
       AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
       AND g.deleted_at IS NULL), 0) as monthly_revenue,
    (SELECT COUNT(*) FROM attendance a 
     JOIN gyms g ON a.gym_id = g.id 
     WHERE g.brand_id = _brand_id AND DATE(a.check_in_at) = CURRENT_DATE AND g.deleted_at IS NULL) as today_attendance;
$$;

-- Function to get per-branch stats for a brand
CREATE OR REPLACE FUNCTION public.get_brand_branch_stats(_brand_id uuid)
RETURNS TABLE(
  gym_id uuid,
  gym_name text,
  city text,
  total_members bigint,
  active_members bigint,
  monthly_revenue numeric,
  today_attendance bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id as gym_id,
    g.name as gym_name,
    g.city,
    (SELECT COUNT(*) FROM members WHERE gym_id = g.id AND deleted_at IS NULL) as total_members,
    (SELECT COUNT(*) FROM members WHERE gym_id = g.id AND status = 'active' AND deleted_at IS NULL) as active_members,
    COALESCE((SELECT SUM(amount) FROM payments 
     WHERE gym_id = g.id AND status = 'completed' 
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)), 0) as monthly_revenue,
    (SELECT COUNT(*) FROM attendance WHERE gym_id = g.id AND DATE(check_in_at) = CURRENT_DATE) as today_attendance
  FROM gyms g
  WHERE g.brand_id = _brand_id AND g.deleted_at IS NULL
  ORDER BY g.name;
$$;

-- Add trigger for updated_at on brands
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();