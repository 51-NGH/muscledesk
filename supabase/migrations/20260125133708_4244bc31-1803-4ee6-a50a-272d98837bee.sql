-- ============================================
-- FINGERPRINT ATTENDANCE SYSTEM - ADDITIVE ONLY
-- Does NOT modify existing tables or logic
-- ============================================

-- 1️⃣ Add 'fingerprint' to attendance_source enum (safe - additive)
ALTER TYPE attendance_source ADD VALUE IF NOT EXISTS 'fingerprint';

-- 2️⃣ Create Fingerprint Device Registry Table
CREATE TABLE public.fingerprint_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_serial text NOT NULL UNIQUE,
  device_ip text,
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for fast API key lookups
CREATE INDEX idx_fingerprint_devices_api_key ON public.fingerprint_devices(api_key);
CREATE INDEX idx_fingerprint_devices_gym_id ON public.fingerprint_devices(gym_id);

-- Add trigger for updated_at
CREATE TRIGGER update_fingerprint_devices_updated_at
  BEFORE UPDATE ON public.fingerprint_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.fingerprint_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fingerprint_devices
CREATE POLICY "Gym owners can manage their devices"
  ON public.fingerprint_devices
  FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can view devices"
  ON public.fingerprint_devices
  FOR SELECT
  USING (public.is_gym_staff(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all devices"
  ON public.fingerprint_devices
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- 3️⃣ Create Fingerprint Templates/Mapping Table
CREATE TABLE public.fingerprint_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.fingerprint_devices(id) ON DELETE SET NULL,
  fingerprint_uid text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Unique constraint: one fingerprint UID per gym
  UNIQUE(gym_id, fingerprint_uid)
);

-- Add indexes for fast lookups
CREATE INDEX idx_fingerprint_templates_member_id ON public.fingerprint_templates(member_id);
CREATE INDEX idx_fingerprint_templates_gym_id ON public.fingerprint_templates(gym_id);
CREATE INDEX idx_fingerprint_templates_uid ON public.fingerprint_templates(fingerprint_uid);
CREATE INDEX idx_fingerprint_templates_lookup ON public.fingerprint_templates(gym_id, fingerprint_uid);

-- Enable RLS
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fingerprint_templates
CREATE POLICY "Gym owners can manage fingerprint templates"
  ON public.fingerprint_templates
  FOR ALL
  USING (public.owns_gym(auth.uid(), gym_id));

CREATE POLICY "Staff can view fingerprint templates"
  ON public.fingerprint_templates
  FOR SELECT
  USING (public.is_gym_staff(auth.uid(), gym_id));

CREATE POLICY "Super admin can manage all fingerprint templates"
  ON public.fingerprint_templates
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- 4️⃣ Create helper function for fingerprint attendance (mirrors QR logic)
CREATE OR REPLACE FUNCTION public.ingest_fingerprint_attendance(_api_key text, _fingerprint_uid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device record;
  _template record;
  _member record;
  _today date := CURRENT_DATE;
  _existing_id uuid;
  _new_attendance_id uuid;
BEGIN
  -- 1. Validate device API key
  SELECT * INTO _device
  FROM public.fingerprint_devices
  WHERE api_key = _api_key
    AND is_active = true
  LIMIT 1;
  
  IF _device IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or inactive device'
    );
  END IF;
  
  -- Update device last_seen_at
  UPDATE public.fingerprint_devices
  SET last_seen_at = NOW()
  WHERE id = _device.id;
  
  -- 2. Find fingerprint template
  SELECT * INTO _template
  FROM public.fingerprint_templates
  WHERE gym_id = _device.gym_id
    AND fingerprint_uid = _fingerprint_uid
  LIMIT 1;
  
  IF _template IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fingerprint not registered'
    );
  END IF;
  
  -- 3. Get member details
  SELECT * INTO _member
  FROM public.members
  WHERE id = _template.member_id
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member not found'
    );
  END IF;
  
  -- 4. Check if blocked
  IF _member.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member is blocked',
      'reason', COALESCE(_member.block_reason, 'Contact gym staff'),
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  -- 5. Check if expired
  IF _member.expiry_date < _today THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Membership expired',
      'expiry_date', _member.expiry_date,
      'member_name', _member.full_name,
      'member_id', _member.member_id
    );
  END IF;
  
  -- 6. Check for duplicate (same day) - matches QR logic
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
  
  -- 7. Record attendance with source = 'fingerprint'
  INSERT INTO public.attendance (gym_id, member_id, source)
  VALUES (_device.gym_id, _member.id, 'fingerprint')
  RETURNING id INTO _new_attendance_id;
  
  -- 8. Return success (visit count already updated by trigger)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded',
    'member_name', _member.full_name,
    'member_id', _member.member_id,
    'total_visits', _member.total_visits + 1,
    'status', 'checked_in'
  );
END;
$$;

-- 5️⃣ Create function to register fingerprint template
CREATE OR REPLACE FUNCTION public.register_fingerprint_template(
  _member_id uuid,
  _fingerprint_uid text,
  _device_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member record;
  _template_id uuid;
BEGIN
  -- Get member
  SELECT * INTO _member
  FROM public.members
  WHERE id = _member_id
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;
  
  -- Check access
  IF NOT public.has_gym_access(auth.uid(), _member.gym_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Check if fingerprint already exists for this gym
  IF EXISTS (
    SELECT 1 FROM public.fingerprint_templates
    WHERE gym_id = _member.gym_id AND fingerprint_uid = _fingerprint_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fingerprint already registered');
  END IF;
  
  -- Insert template
  INSERT INTO public.fingerprint_templates (member_id, gym_id, device_id, fingerprint_uid)
  VALUES (_member_id, _member.gym_id, _device_id, _fingerprint_uid)
  RETURNING id INTO _template_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', _template_id,
    'member_name', _member.full_name
  );
END;
$$;