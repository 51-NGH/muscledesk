CREATE OR REPLACE FUNCTION public.generate_member_id(_gym_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  gym_prefix TEXT;
  next_number INTEGER;
  new_member_id TEXT;
  existing_numbers INTEGER[];
BEGIN
  -- Get gym prefix (first 3 letters uppercase)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO gym_prefix FROM public.gyms WHERE id = _gym_id;
  
  -- Get all existing member numbers for ACTIVE (non-deleted) members only
  SELECT ARRAY_AGG(
    CAST(SUBSTRING(member_id FROM 'M(\d+)$') AS INTEGER)
  ) INTO existing_numbers
  FROM public.members 
  WHERE gym_id = _gym_id 
    AND member_id ~ 'M\d+$'
    AND deleted_at IS NULL;  -- Only count active members
  
  -- If no active members exist, start with 1
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
$$;