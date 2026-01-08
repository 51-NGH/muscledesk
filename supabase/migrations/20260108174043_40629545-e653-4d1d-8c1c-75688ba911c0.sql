-- Update generate_qr_token to use the correct schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  RETURN encode(extensions.gen_random_bytes(16), 'hex');
END;
$function$;