-- Fix retention analytics function with proper type casting
CREATE OR REPLACE FUNCTION public.get_retention_stats(_gym_id uuid)
RETURNS TABLE(
  total_members bigint,
  active_members bigint,
  retention_rate numeric,
  avg_membership_duration numeric,
  members_renewed_this_month bigint,
  members_churned_this_month bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM members WHERE gym_id = _gym_id AND deleted_at IS NULL) as total_members,
    (SELECT COUNT(*) FROM members WHERE gym_id = _gym_id AND deleted_at IS NULL AND status = 'active') as active_members,
    ROUND(
      (SELECT COUNT(*)::numeric FROM members WHERE gym_id = _gym_id AND deleted_at IS NULL AND status = 'active') /
      NULLIF((SELECT COUNT(*)::numeric FROM members WHERE gym_id = _gym_id AND deleted_at IS NULL), 0) * 100,
      1
    ) as retention_rate,
    ROUND(
      (SELECT AVG((LEAST(expiry_date, CURRENT_DATE) - start_date)::numeric) 
       FROM members WHERE gym_id = _gym_id AND deleted_at IS NULL),
      0
    ) as avg_membership_duration,
    (SELECT COUNT(*) FROM payments 
     WHERE gym_id = _gym_id 
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
       AND status = 'completed') as members_renewed_this_month,
    (SELECT COUNT(*) FROM members 
     WHERE gym_id = _gym_id 
       AND deleted_at IS NULL 
       AND status = 'expired'
       AND DATE_TRUNC('month', expiry_date::timestamp) = DATE_TRUNC('month', CURRENT_DATE)) as members_churned_this_month;
$$;