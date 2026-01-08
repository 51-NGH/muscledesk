-- Make member_id and qr_token have default values so they can be auto-generated
ALTER TABLE public.members ALTER COLUMN member_id SET DEFAULT '';
ALTER TABLE public.members ALTER COLUMN qr_token SET DEFAULT '';