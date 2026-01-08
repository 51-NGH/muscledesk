-- =====================================================
-- MUSCLEDESK DATABASE SCHEMA
-- Complete gym management SaaS backend
-- =====================================================

-- 1. ENUMS FOR TYPE SAFETY
-- =====================================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'gym_owner', 'staff');

-- Gym plan types
CREATE TYPE public.gym_plan AS ENUM ('lite', 'standard', 'pro');

-- Member status (auto-calculated, but stored for query performance)
CREATE TYPE public.member_status AS ENUM ('active', 'expiring_soon', 'expired', 'blocked');

-- Payment modes
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'card');

-- Payment status
CREATE TYPE public.payment_status AS ENUM ('completed', 'pending', 'failed');

-- Expense categories
CREATE TYPE public.expense_category AS ENUM ('rent', 'salary', 'electricity', 'maintenance', 'other');

-- Attendance source
CREATE TYPE public.attendance_source AS ENUM ('qr', 'manual');

-- 2. PROFILES TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES TABLE (CRITICAL - separate from profiles)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'gym_owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. GYMS TABLE
-- =====================================================
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  plan gym_plan NOT NULL DEFAULT 'lite',
  is_active BOOLEAN NOT NULL DEFAULT true,
  features_locked JSONB DEFAULT '{}',
  member_limit INTEGER NOT NULL DEFAULT 100,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 5. GYM STAFF TABLE (links staff users to gyms)
-- =====================================================
CREATE TABLE public.gym_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;

-- 6. MEMBERSHIP PLANS TABLE (gym-specific plans)
-- =====================================================
CREATE TABLE public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- 7. MEMBERS TABLE (GYM MEMBERS - not app users)
-- =====================================================
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL, -- Unique immutable ID like "GYM001-M0001"
  qr_token TEXT NOT NULL UNIQUE, -- Unique QR token
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT, -- Optional
  avatar_url TEXT,
  plan_id UUID REFERENCES public.membership_plans(id),
  plan_name TEXT, -- Denormalized for quick display
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  custom_price DECIMAL(10,2), -- Override plan price
  status member_status NOT NULL DEFAULT 'active',
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  notes TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ, -- Soft delete
  UNIQUE(gym_id, member_id),
  UNIQUE(gym_id, phone)
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 8. ATTENDANCE TABLE
-- =====================================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source attendance_source NOT NULL DEFAULT 'qr',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 9. PAYMENTS TABLE
-- =====================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_mode payment_mode NOT NULL,
  status payment_status NOT NULL DEFAULT 'completed',
  transaction_id TEXT, -- External reference
  notes TEXT,
  -- Membership cycle info
  plan_id UUID REFERENCES public.membership_plans(id),
  plan_name TEXT,
  new_start_date DATE,
  new_expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 10. EXPENSES TABLE
-- =====================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 11. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (for RLS policies)
-- =====================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Check if user owns the gym
CREATE OR REPLACE FUNCTION public.owns_gym(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms
    WHERE id = _gym_id AND owner_id = _user_id AND deleted_at IS NULL
  )
$$;

-- Check if user is staff of the gym
CREATE OR REPLACE FUNCTION public.is_gym_staff(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_staff
    WHERE gym_id = _gym_id AND user_id = _user_id
  )
$$;

-- Check if user has access to gym (owner OR staff)
CREATE OR REPLACE FUNCTION public.has_gym_access(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    public.owns_gym(_user_id, _gym_id) OR
    public.is_gym_staff(_user_id, _gym_id)
$$;

-- Get user's gym ID (for owners)
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.gyms
  WHERE owner_id = _user_id AND deleted_at IS NULL
  LIMIT 1
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- GYMS POLICIES
CREATE POLICY "Gym owners can view own gym"
  ON public.gyms FOR SELECT
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Gym owners can update own gym"
  ON public.gyms FOR UPDATE
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Super admin can view all gyms"
  ON public.gyms FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage all gyms"
  ON public.gyms FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view their gym"
  ON public.gyms FOR SELECT
  USING (public.is_gym_staff(auth.uid(), id) AND deleted_at IS NULL);

-- GYM STAFF POLICIES
CREATE POLICY "Gym owners can manage staff"
  ON public.gym_staff FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all staff"
  ON public.gym_staff FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view own assignment"
  ON public.gym_staff FOR SELECT
  USING (user_id = auth.uid());

-- MEMBERSHIP PLANS POLICIES
CREATE POLICY "Gym users can view plans"
  ON public.membership_plans FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym owners can manage plans"
  ON public.membership_plans FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all plans"
  ON public.membership_plans FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- MEMBERS POLICIES
CREATE POLICY "Gym users can view members"
  ON public.members FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id) AND deleted_at IS NULL);

CREATE POLICY "Gym owners can manage members"
  ON public.members FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can view members"
  ON public.members FOR SELECT
  USING (public.is_gym_staff(auth.uid(), gym_id) AND deleted_at IS NULL);

CREATE POLICY "Super admin can view all members"
  ON public.members FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- ATTENDANCE POLICIES
CREATE POLICY "Gym users can view attendance"
  ON public.attendance FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Gym users can record attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- PAYMENTS POLICIES (Staff cannot access)
CREATE POLICY "Gym owners can manage payments"
  ON public.payments FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- EXPENSES POLICIES (Staff cannot access)
CREATE POLICY "Gym owners can manage expenses"
  ON public.expenses FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all expenses"
  ON public.expenses FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- AUDIT LOGS POLICIES
CREATE POLICY "Gym owners can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Super admin can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calculate member status
CREATE OR REPLACE FUNCTION public.calculate_member_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_member_status_trigger
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.calculate_member_status();

-- Generate unique member ID
CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  gym_prefix TEXT;
  member_count INTEGER;
  new_member_id TEXT;
BEGIN
  -- Get gym prefix (first 3 chars of gym name or custom)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO gym_prefix FROM public.gyms WHERE id = _gym_id;
  
  -- Count existing members
  SELECT COUNT(*) + 1 INTO member_count FROM public.members WHERE gym_id = _gym_id;
  
  -- Format: GYM-M0001
  new_member_id = gym_prefix || '-M' || LPAD(member_count::TEXT, 4, '0');
  
  RETURN new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate member_id and qr_token on insert
CREATE OR REPLACE FUNCTION public.auto_generate_member_identifiers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_id IS NULL OR NEW.member_id = '' THEN
    NEW.member_id = public.generate_member_id(NEW.gym_id);
  END IF;
  
  IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
    NEW.qr_token = public.generate_qr_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_generate_member_identifiers_trigger
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_member_identifiers();

-- Update member visit count on attendance
CREATE OR REPLACE FUNCTION public.update_member_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.members
  SET 
    total_visits = total_visits + 1,
    last_visit_at = NEW.check_in_at
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_member_visit_count_trigger
  AFTER INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_member_visit_count();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Default role is gym_owner (SuperAdmin is assigned manually)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'gym_owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_members_gym_id ON public.members(gym_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_phone ON public.members(phone);
CREATE INDEX idx_members_qr_token ON public.members(qr_token);
CREATE INDEX idx_members_expiry_date ON public.members(expiry_date);
CREATE INDEX idx_attendance_gym_id ON public.attendance(gym_id);
CREATE INDEX idx_attendance_member_id ON public.attendance(member_id);
CREATE INDEX idx_attendance_check_in_at ON public.attendance(check_in_at);
CREATE INDEX idx_payments_gym_id ON public.payments(gym_id);
CREATE INDEX idx_payments_member_id ON public.payments(member_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_expenses_gym_id ON public.expenses(gym_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_audit_logs_gym_id ON public.audit_logs(gym_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- PLAN LIMITS CONFIGURATION
-- =====================================================
CREATE TABLE public.plan_limits (
  plan gym_plan PRIMARY KEY,
  member_limit INTEGER NOT NULL,
  has_advanced_analytics BOOLEAN NOT NULL DEFAULT false,
  has_multi_branch BOOLEAN NOT NULL DEFAULT false,
  has_expense_tracking BOOLEAN NOT NULL DEFAULT false,
  has_staff_management BOOLEAN NOT NULL DEFAULT false,
  has_automated_alerts BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.plan_limits (plan, member_limit, has_advanced_analytics, has_multi_branch, has_expense_tracking, has_staff_management, has_automated_alerts)
VALUES
  ('lite', 100, false, false, false, false, false),
  ('standard', 200, true, false, true, true, true),
  ('pro', 999999, true, true, true, true, true);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan limits"
  ON public.plan_limits FOR SELECT
  USING (true);

-- Function to check gym plan limits
CREATE OR REPLACE FUNCTION public.check_gym_member_limit(_gym_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce member limit
CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_gym_member_limit(NEW.gym_id) THEN
    RAISE EXCEPTION 'Member limit reached for your plan. Please upgrade to add more members.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_member_limit_trigger
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_member_limit();