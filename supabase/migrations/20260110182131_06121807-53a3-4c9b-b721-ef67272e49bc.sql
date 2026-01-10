-- Add PIN field to members table for portal authentication
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Add portal_token for secure PIN setup links
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_token TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Function to generate a secure portal token
CREATE OR REPLACE FUNCTION public.generate_portal_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$function$;

-- Function to verify member PIN login (returns member data if valid)
CREATE OR REPLACE FUNCTION public.verify_member_pin(_email TEXT, _pin TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _member RECORD;
  _pin_hash TEXT;
BEGIN
  -- Find member by email
  SELECT * INTO _member
  FROM public.members
  WHERE LOWER(email) = LOWER(_email)
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or PIN');
  END IF;
  
  IF _member.pin_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN not set. Check your email for setup link.');
  END IF;
  
  -- Verify PIN using pgcrypto
  IF _member.pin_hash = crypt(_pin, _member.pin_hash) THEN
    RETURN jsonb_build_object(
      'success', true,
      'member_id', _member.id,
      'gym_id', _member.gym_id,
      'full_name', _member.full_name,
      'email', _member.email
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or PIN');
  END IF;
END;
$function$;

-- Function to set member PIN using portal token
CREATE OR REPLACE FUNCTION public.set_member_pin(_token TEXT, _pin TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _member RECORD;
BEGIN
  -- Validate PIN format (4 digits)
  IF NOT (_pin ~ '^\d{4}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN must be exactly 4 digits');
  END IF;
  
  -- Find member by token
  SELECT * INTO _member
  FROM public.members
  WHERE portal_token = _token
    AND portal_token_expires_at > NOW()
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired setup link');
  END IF;
  
  -- Set PIN hash and clear token
  UPDATE public.members
  SET 
    pin_hash = crypt(_pin, gen_salt('bf')),
    portal_token = NULL,
    portal_token_expires_at = NULL
  WHERE id = _member.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'PIN set successfully',
    'member_name', _member.full_name
  );
END;
$function$;

-- Function to validate portal token (for setup page)
CREATE OR REPLACE FUNCTION public.validate_portal_token(_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _member RECORD;
  _gym RECORD;
BEGIN
  SELECT m.*, g.name as gym_name INTO _member
  FROM public.members m
  JOIN public.gyms g ON g.id = m.gym_id
  WHERE m.portal_token = _token
    AND m.portal_token_expires_at > NOW()
    AND m.deleted_at IS NULL
  LIMIT 1;
  
  IF _member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired link');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_name', _member.full_name,
    'gym_name', _member.gym_name,
    'email', _member.email
  );
END;
$function$;