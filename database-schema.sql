-- ============================================
-- MUSCLEDESK COMPLETE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('super_admin', 'gym_owner', 'staff');
CREATE TYPE public.attendance_source AS ENUM ('qr', 'manual');
CREATE TYPE public.expense_category AS ENUM ('rent', 'salary', 'electricity', 'maintenance', 'other');
CREATE TYPE public.gym_plan AS ENUM ('lite', 'standard', 'pro');
CREATE TYPE public.member_status AS ENUM ('active', 'expiring_soon', 'expired', 'blocked');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'card');
CREATE TYPE public.payment_status AS ENUM ('completed', 'pending', 'failed');

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    role public.app_role NOT NULL DEFAULT 'gym_owner'::app_role,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Plan limits table
CREATE TABLE public.plan_limits (
    plan public.gym_plan NOT NULL PRIMARY KEY,
    member_limit integer NOT NULL,
    has_expense_tracking boolean NOT NULL DEFAULT false,
    has_advanced_analytics boolean NOT NULL DEFAULT false,
    has_automated_alerts boolean NOT NULL DEFAULT false,
    has_staff_management boolean NOT NULL DEFAULT false,
    has_multi_branch boolean NOT NULL DEFAULT false
);

-- Gyms table
CREATE TABLE public.gyms (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    logo_url text,
    plan public.gym_plan NOT NULL DEFAULT 'lite'::gym_plan,
    member_limit integer NOT NULL DEFAULT 100,
    is_active boolean NOT NULL DEFAULT true,
    features_locked jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Gym staff table
CREATE TABLE public.gym_staff (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Membership plans table
CREATE TABLE public.membership_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    name text NOT NULL,
    description text,
    duration_days integer NOT NULL DEFAULT 30,
    price numeric NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    member_id text NOT NULL DEFAULT ''::text,
    qr_token text NOT NULL DEFAULT ''::text,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    avatar_url text,
    plan_id uuid REFERENCES public.membership_plans(id),
    plan_name text,
    custom_price numeric,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date NOT NULL,
    status public.member_status NOT NULL DEFAULT 'active'::member_status,
    is_blocked boolean NOT NULL DEFAULT false,
    block_reason text,
    notes text,
    total_visits integer NOT NULL DEFAULT 0,
    last_visit_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Payments table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    member_id uuid NOT NULL REFERENCES public.members(id),
    amount numeric NOT NULL,
    payment_mode public.payment_mode NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'completed'::payment_status,
    plan_id uuid REFERENCES public.membership_plans(id),
    plan_name text,
    new_start_date date,
    new_expiry_date date,
    transaction_id text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    category public.expense_category NOT NULL,
    amount numeric NOT NULL,
    description text,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    receipt_url text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Attendance table
CREATE TABLE public.attendance (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES public.gyms(id),
    member_id uuid NOT NULL REFERENCES public.members(id),
    source public.attendance_source NOT NULL DEFAULT 'qr'::attendance_source,
    check_in_at timestamp with time zone NOT NULL DEFAULT now(),
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id uuid REFERENCES public.gyms(id),
    user_id uuid,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 3: INSERT DEFAULT PLAN LIMITS
-- ============================================

INSERT INTO public.plan_limits (plan, member_limit, has_expense_tracking, has_advanced_analytics, has_automated_alerts, has_staff_management, has_multi_branch)
VALUES 
    ('lite', 100, false, false, false, false, false),
    ('standard', 500, true, true, true, false, false),
    ('pro', 2000, true, true, true, true, true);

-- ============================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================

-- Generate QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(16), 'hex');
END;
$$;

-- Generate member ID
CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gym_prefix TEXT;
  member_count INTEGER;
  new_member_id TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO gym_prefix FROM public.gyms WHERE id = _gym_id;
  SELECT COUNT(*) + 1 INTO member_count FROM public.members WHERE gym_id = _gym_id;
  new_member_id = gym_prefix || '-M' || LPAD(member_count::TEXT, 4, '0');
  RETURN new_member_id;
END;
$$;

-- Auto generate member identifiers trigger function
CREATE OR REPLACE FUNCTION public.auto_generate_member_identifiers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.member_id IS NULL OR NEW.member_id = '' THEN
    NEW.member_id = public.generate_member_id(NEW.gym_id);
  END IF;
  
  IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
    NEW.qr_token = public.generate_qr_token();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update member visit count trigger function
CREATE OR REPLACE FUNCTION public.update_member_visit_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.members
  SET 
    total_visits = total_visits + 1,
    last_visit_at = NEW.check_in_at
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$;

-- Calculate member status trigger function
CREATE OR REPLACE FUNCTION public.calculate_member_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_blocked THEN
    NEW.status = 'blocked';
  ELSIF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status = 'expiring_soon';
  ELSE
    NEW.status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Check gym member limit
CREATE OR REPLACE FUNCTION public.check_gym_member_limit(_gym_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  max_limit INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count 
  FROM public.members 
  WHERE gym_id = _gym_id AND deleted_at IS NULL;
  
  SELECT pl.member_limit INTO max_limit
  FROM public.gyms g
  JOIN public.plan_limits pl ON g.plan = pl.plan
  WHERE g.id = _gym_id;
  
  RETURN current_count < max_limit;
END;
$$;

-- Enforce member limit trigger function
CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_gym_member_limit(NEW.gym_id) THEN
    RAISE EXCEPTION 'Member limit reached for your plan. Please upgrade to add more members.';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 5: CREATE ROLE/ACCESS FUNCTIONS
-- ============================================

-- Has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Is super admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Owns gym function
CREATE OR REPLACE FUNCTION public.owns_gym(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms
    WHERE id = _gym_id AND owner_id = _user_id AND deleted_at IS NULL
  )
$$;

-- Is gym staff function
CREATE OR REPLACE FUNCTION public.is_gym_staff(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_staff
    WHERE gym_id = _gym_id AND user_id = _user_id
  )
$$;

-- Has gym access function
CREATE OR REPLACE FUNCTION public.has_gym_access(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    public.owns_gym(_user_id, _gym_id) OR
    public.is_gym_staff(_user_id, _gym_id)
$$;

-- Get user gym ID function
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.gyms
  WHERE owner_id = _user_id AND deleted_at IS NULL
  LIMIT 1
$$;

-- ============================================
-- STEP 6: CREATE ADMIN FUNCTIONS
-- ============================================

-- Admin assign role
CREATE OR REPLACE FUNCTION public.admin_assign_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only SuperAdmin can assign roles';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = _role;
END;
$$;

-- Admin create gym
CREATE OR REPLACE FUNCTION public.admin_create_gym(
  _name text, 
  _owner_email text, 
  _plan gym_plan DEFAULT 'lite'::gym_plan, 
  _city text DEFAULT NULL, 
  _phone text DEFAULT NULL, 
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner_id uuid;
  _gym_id uuid;
  _limit integer;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only SuperAdmin can create gyms';
  END IF;
  
  SELECT id INTO _owner_id FROM public.profiles WHERE email = _owner_email;
  
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. They must sign up first.', _owner_email;
  END IF;
  
  SELECT member_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  
  INSERT INTO public.gyms (name, owner_id, plan, member_limit, phone, address)
  VALUES (_name, _owner_id, _plan, COALESCE(_limit, 100), _phone, _address)
  RETURNING id INTO _gym_id;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_owner_id, 'gym_owner')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'gym_owner';
  
  RETURN _gym_id;
END;
$$;

-- ============================================
-- STEP 7: CREATE BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Handle new user (auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Ingest attendance (QR scan)
CREATE OR REPLACE FUNCTION public.ingest_attendance(_qr_token text, _gym_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _member record;
  _today date := CURRENT_DATE;
  _existing_id uuid;
  _new_attendance_id uuid;
BEGIN
  SELECT * INTO _member
  FROM public.members
  WHERE qr_token = _qr_token
    AND deleted_at IS NULL
    AND (_gym_id IS NULL OR gym_id = _gym_id)
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid QR code'
    );
  END IF;
  
  IF _member.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member is blocked',
      'reason', COALESCE(_member.block_reason, 'Contact gym staff'),
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  IF _member.expiry_date < _today THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Membership expired',
      'expiry_date', _member.expiry_date,
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
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
  
  INSERT INTO public.attendance (gym_id, member_id, source)
  VALUES (_member.gym_id, _member.id, 'qr')
  RETURNING id INTO _new_attendance_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded',
    'member_name', _member.full_name,
    'member_id', _member.member_id,
    'total_visits', _member.total_visits + 1
  );
END;
$$;

-- Renew membership
CREATE OR REPLACE FUNCTION public.renew_membership(
  _member_id uuid, 
  _plan_id uuid DEFAULT NULL, 
  _amount numeric DEFAULT NULL, 
  _duration_days integer DEFAULT NULL, 
  _payment_mode payment_mode DEFAULT 'cash'::payment_mode, 
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _member record;
  _plan record;
  _new_start date;
  _new_expiry date;
  _final_amount numeric;
BEGIN
  SELECT * INTO _member 
  FROM public.members 
  WHERE id = _member_id AND deleted_at IS NULL;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;
  
  IF NOT public.has_gym_access(auth.uid(), _member.gym_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  IF _plan_id IS NOT NULL THEN
    SELECT * INTO _plan FROM public.membership_plans WHERE id = _plan_id;
    _final_amount := COALESCE(_amount, _member.custom_price, _plan.price);
    _duration_days := COALESCE(_duration_days, _plan.duration_days);
  ELSE
    _final_amount := COALESCE(_amount, _member.custom_price, 0);
    _duration_days := COALESCE(_duration_days, 30);
  END IF;
  
  _new_start := GREATEST(_member.expiry_date, CURRENT_DATE);
  _new_expiry := _new_start + _duration_days;
  
  UPDATE public.members
  SET 
    start_date = _new_start,
    expiry_date = _new_expiry,
    plan_id = COALESCE(_plan_id, plan_id),
    plan_name = COALESCE(_plan.name, plan_name),
    custom_price = CASE WHEN _amount IS NOT NULL THEN _amount ELSE custom_price END
  WHERE id = _member_id;
  
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

-- ============================================
-- STEP 8: CREATE REPORTING FUNCTIONS
-- ============================================

-- Get gym dashboard stats
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
SET search_path TO 'public'
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

-- Get expiring members
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
SET search_path TO 'public'
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

-- Get monthly revenue
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(_gym_id uuid, _months_back integer DEFAULT 6)
RETURNS TABLE(month date, total_revenue numeric, payment_count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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

-- Get monthly expenses
CREATE OR REPLACE FUNCTION public.get_monthly_expenses(_gym_id uuid, _months_back integer DEFAULT 6)
RETURNS TABLE(month date, category expense_category, total_amount numeric, expense_count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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

-- Get daily attendance
CREATE OR REPLACE FUNCTION public.get_daily_attendance(_gym_id uuid, _days_back integer DEFAULT 30)
RETURNS TABLE(date date, check_ins bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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

-- ============================================
-- STEP 9: CREATE TRIGGERS
-- ============================================

-- Trigger: Auto generate member identifiers
CREATE TRIGGER trigger_auto_generate_member_identifiers
  BEFORE INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_member_identifiers();

-- Trigger: Enforce member limit
CREATE TRIGGER trigger_enforce_member_limit
  BEFORE INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_limit();

-- Trigger: Calculate member status on insert/update
CREATE TRIGGER trigger_calculate_member_status
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_member_status();

-- Trigger: Update member visit count on attendance
CREATE TRIGGER trigger_update_member_visit_count
  AFTER INSERT ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_visit_count();

-- Trigger: Update updated_at for gyms
CREATE TRIGGER trigger_update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at for members
CREATE TRIGGER trigger_update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at for membership_plans
CREATE TRIGGER trigger_update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at for profiles
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Handle new user signup (on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 10: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 11: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles" ON public.profiles
  FOR SELECT USING (is_super_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admin can manage all roles" ON public.user_roles
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "SuperAdmin can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- Plan limits policies
CREATE POLICY "Anyone can view plan limits" ON public.plan_limits
  FOR SELECT USING (true);

-- Gyms policies
CREATE POLICY "Gym owners can view own gym" ON public.gyms
  FOR SELECT USING ((owner_id = auth.uid()) AND (deleted_at IS NULL));

CREATE POLICY "Gym owners can update own gym" ON public.gyms
  FOR UPDATE USING ((owner_id = auth.uid()) AND (deleted_at IS NULL));

CREATE POLICY "Users can create own gym" ON public.gyms
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Staff can view their gym" ON public.gyms
  FOR SELECT USING (is_gym_staff(auth.uid(), id) AND (deleted_at IS NULL));

CREATE POLICY "Super admin can manage all gyms" ON public.gyms
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can view all gyms" ON public.gyms
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Gym staff policies
CREATE POLICY "Gym owners can manage staff" ON public.gym_staff
  FOR ALL USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can view own assignment" ON public.gym_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all staff" ON public.gym_staff
  FOR ALL USING (is_super_admin(auth.uid()));

-- Membership plans policies
CREATE POLICY "Gym owners can manage plans" ON public.membership_plans
  FOR ALL USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Gym users can view plans" ON public.membership_plans
  FOR SELECT USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all plans" ON public.membership_plans
  FOR ALL USING (is_super_admin(auth.uid()));

-- Members policies
CREATE POLICY "Gym owners can manage members" ON public.members
  FOR ALL USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Gym users can view members" ON public.members
  FOR SELECT USING (has_gym_access(auth.uid(), gym_id) AND (deleted_at IS NULL));

CREATE POLICY "Staff can view members" ON public.members
  FOR SELECT USING (is_gym_staff(auth.uid(), gym_id) AND (deleted_at IS NULL));

CREATE POLICY "Super admin can view all members" ON public.members
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Payments policies
CREATE POLICY "Gym owners can manage payments" ON public.payments
  FOR ALL USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all payments" ON public.payments
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Expenses policies
CREATE POLICY "Gym owners can manage expenses" ON public.expenses
  FOR ALL USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all expenses" ON public.expenses
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Attendance policies
CREATE POLICY "Gym users can view attendance" ON public.attendance
  FOR SELECT USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym users can record attendance" ON public.attendance
  FOR INSERT WITH CHECK (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all attendance" ON public.attendance
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Audit logs policies
CREATE POLICY "Gym owners can view own audit logs" ON public.audit_logs
  FOR SELECT USING (owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all audit logs" ON public.audit_logs
  FOR SELECT USING (is_super_admin(auth.uid()));

-- ============================================
-- DONE! Your database is ready.
-- ============================================
