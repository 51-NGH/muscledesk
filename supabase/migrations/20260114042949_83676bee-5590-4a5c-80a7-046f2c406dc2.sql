-- Fix the generate_member_id function to check ALL members (including deleted) 
-- to avoid unique constraint violations
CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gym_prefix TEXT;
  next_number INTEGER;
  new_member_id TEXT;
  existing_numbers INTEGER[];
BEGIN
  -- Get gym prefix (first 3 letters uppercase)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO gym_prefix FROM public.gyms WHERE id = _gym_id;
  
  -- Get all existing member numbers for ALL members (including deleted)
  -- This prevents unique constraint violations
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
    -- Use max + 1 to always get a new unique number
    next_number := (SELECT MAX(n) FROM unnest(existing_numbers) AS n) + 1;
  END IF;
  
  new_member_id := gym_prefix || '-M' || LPAD(next_number::TEXT, 4, '0');
  RETURN new_member_id;
END;
$$;