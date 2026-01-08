-- FIX SECURITY DEFINER VIEWS
-- Replace with security invoker functions that respect RLS

-- Drop the problematic views
DROP VIEW IF EXISTS public.v_gym_dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.v_members_expiring_soon CASCADE;
DROP VIEW IF EXISTS public.v_monthly_revenue CASCADE;
DROP VIEW IF EXISTS public.v_monthly_expenses CASCADE;
DROP VIEW IF EXISTS public.v_daily_attendance CASCADE;

-- Create SECURITY INVOKER functions instead (these respect RLS)

-- Get dashboard stats for a specific gym
CREATE OR REPLACE FUNCTION public.get_gym_dashboard_stats(_gym_id uuid)
RETURNS TABLE(
  total_members bigint,
  active_members bigint,
  expired_members bigint,
  expiring_soon_members bigint,
  today_attendance bigint,
  monthly_revenue numeric,
  monthly_expenses numeric,
  net_profit numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_members,
    COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active_members,
    COUNT(*) FILTER (WHERE status = 'expired' AND deleted_at IS NULL) as expired_members,
    COUNT(*) FILTER (WHERE status = 'expiring_soon' AND deleted_at IS NULL) as expiring_soon_members,
    (SELECT COUNT(*) FROM attendance WHERE gym_id = _gym_id AND DATE(check_in_at) = CURRENT_DATE) as today_attendance,
    COALESCE((
      SELECT SUM(amount) FROM payments 
      WHERE gym_id = _gym_id 
        AND status = 'completed' 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as monthly_revenue,
    COALESCE((
      SELECT SUM(amount) FROM expenses 
      WHERE gym_id = _gym_id 
        AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as monthly_expenses,
    COALESCE((
      SELECT SUM(amount) FROM payments 
      WHERE gym_id = _gym_id 
        AND status = 'completed' 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) - COALESCE((
      SELECT SUM(amount) FROM expenses 
      WHERE gym_id = _gym_id 
        AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as net_profit
  FROM members
  WHERE gym_id = _gym_id;
$$;

-- Get members expiring soon for a gym
CREATE OR REPLACE FUNCTION public.get_expiring_members(_gym_id uuid, _days_ahead integer DEFAULT 7)
RETURNS TABLE(
  id uuid,
  member_id text,
  full_name text,
  phone text,
  email text,
  expiry_date date,
  plan_name text,
  days_remaining integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.member_id,
    m.full_name,
    m.phone,
    m.email,
    m.expiry_date,
    m.plan_name,
    (m.expiry_date - CURRENT_DATE)::integer as days_remaining
  FROM members m
  WHERE m.gym_id = _gym_id
    AND m.deleted_at IS NULL
    AND m.status IN ('active', 'expiring_soon')
    AND m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (_days_ahead || ' days')::interval
  ORDER BY m.expiry_date ASC;
$$;

-- Get monthly revenue for a gym
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(_gym_id uuid, _months_back integer DEFAULT 6)
RETURNS TABLE(
  month date,
  total_revenue numeric,
  payment_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    DATE_TRUNC('month', created_at)::date as month,
    SUM(amount) as total_revenue,
    COUNT(*) as payment_count
  FROM payments
  WHERE gym_id = _gym_id
    AND status = 'completed'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - (_months_back || ' months')::interval
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC;
$$;

-- Get monthly expenses by category for a gym
CREATE OR REPLACE FUNCTION public.get_monthly_expenses(_gym_id uuid, _months_back integer DEFAULT 6)
RETURNS TABLE(
  month date,
  category expense_category,
  total_amount numeric,
  expense_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    DATE_TRUNC('month', expense_date)::date as month,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as expense_count
  FROM expenses
  WHERE gym_id = _gym_id
    AND expense_date >= DATE_TRUNC('month', CURRENT_DATE) - (_months_back || ' months')::interval
  GROUP BY DATE_TRUNC('month', expense_date), category
  ORDER BY month DESC, category;
$$;

-- Get daily attendance for a gym
CREATE OR REPLACE FUNCTION public.get_daily_attendance(_gym_id uuid, _days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  check_ins bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    DATE(check_in_at) as date,
    COUNT(*) as check_ins
  FROM attendance
  WHERE gym_id = _gym_id
    AND check_in_at >= CURRENT_DATE - (_days_back || ' days')::interval
  GROUP BY DATE(check_in_at)
  ORDER BY date DESC;
$$;