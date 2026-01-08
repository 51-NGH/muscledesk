-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the generate_qr_token function to ensure it works
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$function$;