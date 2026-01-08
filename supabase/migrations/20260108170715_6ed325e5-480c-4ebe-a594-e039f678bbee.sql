-- Fix function search path security warnings
-- Adding SET search_path = public to all functions that were missing it

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix calculate_member_status
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
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix generate_member_id
CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix generate_qr_token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix auto_generate_member_identifiers
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix update_member_visit_count
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'gym_owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix check_gym_member_limit
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix enforce_member_limit
CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_gym_member_limit(NEW.gym_id) THEN
    RAISE EXCEPTION 'Member limit reached for your plan. Please upgrade to add more members.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;