-- Fix verify_member_pin to prioritize members with PIN set
CREATE OR REPLACE FUNCTION public.verify_member_pin(_email text, _pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _member RECORD;
BEGIN
  -- Find member by email - prioritize those with PIN set
  SELECT * INTO _member
  FROM public.members
  WHERE LOWER(email) = LOWER(_email)
    AND deleted_at IS NULL
    AND pin_hash IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF _member IS NULL THEN
    -- Check if there's a member without PIN
    SELECT * INTO _member
    FROM public.members
    WHERE LOWER(email) = LOWER(_email)
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF _member IS NOT NULL AND _member.pin_hash IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'PIN not set. Check your email for setup link.');
    END IF;
    
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or PIN');
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