-- =====================================================
-- MUSCLEDESK PRODUCTION BACKEND - COMPREHENSIVE FIX
-- =====================================================

-- 1. FIX AUTH: Remove auto gym_owner assignment
-- SuperAdmin must manually create gym owners
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate handle_new_user to ONLY create profile, NOT assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile, NO role assignment
  -- SuperAdmin assigns roles via admin functions
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ADD UNIQUE CONSTRAINT: phone per gym
-- =====================================================
ALTER TABLE public.members 
ADD CONSTRAINT members_gym_phone_unique UNIQUE (gym_id, phone);

-- 3. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON public.members(gym_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_gym_expiry ON public.members(gym_id, expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_qr_token ON public.members(qr_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(gym_id, phone) WHERE deleted_at IS NULL;

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_gym_date ON public.attendance(gym_id, check_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance(member_id, check_in_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON public.payments(gym_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_member ON public.payments(member_id, created_at);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_gym_date ON public.expenses(gym_id, expense_date);

-- 4. CREATE SUPERADMIN FUNCTIONS
-- =====================================================

-- Function for SuperAdmin to assign role to user
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id uuid,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can assign roles
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only SuperAdmin can assign roles';
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = _role;
END;
$$;

-- Function for SuperAdmin to create a gym and assign owner
CREATE OR REPLACE FUNCTION public.admin_create_gym(
  _name text,
  _owner_email text,
  _plan gym_plan DEFAULT 'lite',
  _city text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _gym_id uuid;
  _limit integer;
BEGIN
  -- Only super_admin can create gyms
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only SuperAdmin can create gyms';
  END IF;
  
  -- Find owner by email in profiles
  SELECT id INTO _owner_id FROM public.profiles WHERE email = _owner_email;
  
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. They must sign up first.', _owner_email;
  END IF;
  
  -- Get member limit for plan
  SELECT member_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  
  -- Create the gym
  INSERT INTO public.gyms (name, owner_id, plan, member_limit, phone, address)
  VALUES (_name, _owner_id, _plan, COALESCE(_limit, 100), _phone, _address)
  RETURNING id INTO _gym_id;
  
  -- Assign gym_owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_owner_id, 'gym_owner')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'gym_owner';
  
  RETURN _gym_id;
END;
$$;

-- 5. INGEST ATTENDANCE RPC (alternative to edge function)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ingest_attendance(_qr_token text, _gym_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member record;
  _today date := CURRENT_DATE;
  _existing_id uuid;
  _new_attendance_id uuid;
BEGIN
  -- Find member by QR token
  SELECT * INTO _member
  FROM public.members
  WHERE qr_token = _qr_token
    AND deleted_at IS NULL
    AND (_gym_id IS NULL OR gym_id = _gym_id)
  LIMIT 1;
  
  -- Validate member exists
  IF _member IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid QR code'
    );
  END IF;
  
  -- Check if blocked
  IF _member.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member is blocked',
      'reason', COALESCE(_member.block_reason, 'Contact gym staff'),
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  -- Check if expired
  IF _member.expiry_date < _today THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Membership expired',
      'expiry_date', _member.expiry_date,
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  -- Check for duplicate (same day)
  SELECT id INTO _existing_id
  FROM public.attendance
  WHERE member_id = _member.id
    AND DATE(check_in_at) = _today
  LIMIT 1;
  
  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked in today',
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  -- Record attendance
  INSERT INTO public.attendance (gym_id, member_id, source)
  VALUES (_member.gym_id, _member.id, 'qr')
  RETURNING id INTO _new_attendance_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded',
    'member_name', _member.full_name,
    'member_id', _member.member_id,
    'total_visits', _member.total_visits + 1
  );
END;
$$;

-- 6. ANALYTICS VIEWS FOR DASHBOARD
-- =====================================================

-- Gym dashboard stats view
CREATE OR REPLACE VIEW public.v_gym_dashboard_stats AS
SELECT 
  g.id as gym_id,
  -- Member counts
  COUNT(DISTINCT m.id) FILTER (WHERE m.deleted_at IS NULL) as total_members,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'active' AND m.deleted_at IS NULL) as active_members,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'expired' AND m.deleted_at IS NULL) as expired_members,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'expiring_soon' AND m.deleted_at IS NULL) as expiring_soon_members,
  -- Today's attendance
  COUNT(DISTINCT a.id) FILTER (WHERE DATE(a.check_in_at) = CURRENT_DATE) as today_attendance,
  -- This month revenue
  COALESCE(SUM(p.amount) FILTER (
    WHERE p.status = 'completed' 
    AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0) as monthly_revenue,
  -- This month expenses
  COALESCE(SUM(e.amount) FILTER (
    WHERE DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0) as monthly_expenses
FROM public.gyms g
LEFT JOIN public.members m ON m.gym_id = g.id
LEFT JOIN public.attendance a ON a.gym_id = g.id
LEFT JOIN public.payments p ON p.gym_id = g.id
LEFT JOIN public.expenses e ON e.gym_id = g.id
WHERE g.deleted_at IS NULL
GROUP BY g.id;

-- Members expiring soon view (renewal due list)
CREATE OR REPLACE VIEW public.v_members_expiring_soon AS
SELECT 
  m.id,
  m.member_id,
  m.full_name,
  m.phone,
  m.email,
  m.expiry_date,
  m.gym_id,
  m.plan_name,
  (m.expiry_date - CURRENT_DATE) as days_remaining
FROM public.members m
WHERE m.deleted_at IS NULL
  AND m.status IN ('active', 'expiring_soon')
  AND m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY m.expiry_date ASC;

-- Monthly revenue by gym view
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  gym_id,
  DATE_TRUNC('month', created_at)::date as month,
  SUM(amount) as total_revenue,
  COUNT(*) as payment_count
FROM public.payments
WHERE status = 'completed'
GROUP BY gym_id, DATE_TRUNC('month', created_at);

-- Monthly expenses by gym view
CREATE OR REPLACE VIEW public.v_monthly_expenses AS
SELECT 
  gym_id,
  DATE_TRUNC('month', expense_date)::date as month,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as expense_count
FROM public.expenses
GROUP BY gym_id, DATE_TRUNC('month', expense_date), category;

-- Daily attendance by gym view
CREATE OR REPLACE VIEW public.v_daily_attendance AS
SELECT 
  gym_id,
  DATE(check_in_at) as date,
  COUNT(*) as check_ins
FROM public.attendance
GROUP BY gym_id, DATE(check_in_at);

-- 7. RLS FOR VIEWS (views inherit table RLS, but add explicit for safety)
-- =====================================================

-- Enable RLS on user_roles for SuperAdmin management
CREATE POLICY "SuperAdmin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- 8. HELPER FUNCTIONS FOR RENEWALS
-- =====================================================

-- Renew member subscription
CREATE OR REPLACE FUNCTION public.renew_membership(
  _member_id uuid,
  _plan_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _duration_days integer DEFAULT NULL,
  _payment_mode payment_mode DEFAULT 'cash',
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member record;
  _plan record;
  _new_start date;
  _new_expiry date;
  _final_amount numeric;
BEGIN
  -- Get member
  SELECT * INTO _member 
  FROM public.members 
  WHERE id = _member_id AND deleted_at IS NULL;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;
  
  -- Check gym access
  IF NOT public.has_gym_access(auth.uid(), _member.gym_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Determine pricing and duration
  IF _plan_id IS NOT NULL THEN
    SELECT * INTO _plan FROM public.membership_plans WHERE id = _plan_id;
    _final_amount := COALESCE(_amount, _member.custom_price, _plan.price);
    _duration_days := COALESCE(_duration_days, _plan.duration_days);
  ELSE
    _final_amount := COALESCE(_amount, _member.custom_price, 0);
    _duration_days := COALESCE(_duration_days, 30);
  END IF;
  
  -- Calculate new dates
  _new_start := GREATEST(_member.expiry_date, CURRENT_DATE);
  _new_expiry := _new_start + _duration_days;
  
  -- Update member
  UPDATE public.members
  SET 
    start_date = _new_start,
    expiry_date = _new_expiry,
    plan_id = COALESCE(_plan_id, plan_id),
    plan_name = COALESCE(_plan.name, plan_name),
    custom_price = CASE WHEN _amount IS NOT NULL THEN _amount ELSE custom_price END
  WHERE id = _member_id;
  
  -- Record payment
  INSERT INTO public.payments (
    gym_id, member_id, amount, payment_mode, 
    plan_id, plan_name, new_start_date, new_expiry_date, 
    notes, created_by
  )
  VALUES (
    _member.gym_id, _member_id, _final_amount, _payment_mode,
    _plan_id, _plan.name, _new_start, _new_expiry,
    _notes, auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Membership renewed',
    'new_expiry_date', _new_expiry,
    'amount', _final_amount
  );
END;
$$;

-- 9. ADD CITY COLUMN TO GYMS (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gyms' 
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.gyms ADD COLUMN city text;
  END IF;
END $$;

-- 10. UNIQUE CONSTRAINT ON USER_ROLES
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;