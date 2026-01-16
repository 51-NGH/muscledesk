-- Ensure attendance table has replica identity for realtime to work properly
ALTER TABLE public.attendance REPLICA IDENTITY FULL;