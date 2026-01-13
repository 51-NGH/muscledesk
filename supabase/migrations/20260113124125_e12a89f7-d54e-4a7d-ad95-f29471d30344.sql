-- Update generate_member_id to reuse deleted member IDs
CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  gym_prefix TEXT;
  next_number INTEGER;
  new_member_id TEXT;
  existing_numbers INTEGER[];
  i INTEGER;
BEGIN
  -- Get gym prefix (first 3 letters uppercase)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO gym_prefix FROM public.gyms WHERE id = _gym_id;
  
  -- Get all existing member numbers for this gym
  SELECT ARRAY_AGG(
    CAST(SUBSTRING(member_id FROM 'M(\d+)$') AS INTEGER)
  ) INTO existing_numbers
  FROM public.members 
  WHERE gym_id = _gym_id 
    AND member_id ~ 'M\d+$';
  
  -- If no members exist, start with 1
  IF existing_numbers IS NULL THEN
    next_number := 1;
  ELSE
    -- Find the first gap in the sequence, or use max + 1
    next_number := 1;
    LOOP
      IF NOT (next_number = ANY(existing_numbers)) THEN
        EXIT;
      END IF;
      next_number := next_number + 1;
    END LOOP;
  END IF;
  
  new_member_id := gym_prefix || '-M' || LPAD(next_number::TEXT, 4, '0');
  RETURN new_member_id;
END;
$function$;

-- Update validate_portal_token to check if PIN is already set
CREATE OR REPLACE FUNCTION public.validate_portal_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _member RECORD;
  _gym RECORD;
BEGIN
  -- First check if there's a member with this token (even if expired)
  SELECT m.*, g.name as gym_name INTO _member
  FROM public.members m
  JOIN public.gyms g ON g.id = m.gym_id
  WHERE m.portal_token = _token
    AND m.deleted_at IS NULL
  LIMIT 1;
  
  -- If no member found with this token, check if token was already used (PIN set)
  IF _member IS NULL THEN
    -- Try to find a member who might have had this token but already set their PIN
    -- The token gets cleared after PIN is set, so we can't find them this way
    -- Just return invalid/expired
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired link');
  END IF;
  
  -- Check if PIN is already set (token exists but PIN was set via another link)
  IF _member.pin_hash IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'pin_already_set', true,
      'member_name', _member.full_name,
      'gym_name', _member.gym_name,
      'email', _member.email
    );
  END IF;
  
  -- Check if token is expired
  IF _member.portal_token_expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link has expired. Contact your gym for a new link.');
  END IF;
  
  -- Token is valid and PIN not yet set
  RETURN jsonb_build_object(
    'success', true,
    'pin_already_set', false,
    'member_name', _member.full_name,
    'gym_name', _member.gym_name,
    'email', _member.email
  );
END;
$function$;