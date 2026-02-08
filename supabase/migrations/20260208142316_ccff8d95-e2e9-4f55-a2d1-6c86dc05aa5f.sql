
-- Add columns to track imported record IDs for revert functionality
ALTER TABLE public.import_logs 
  ADD COLUMN imported_member_ids TEXT[] DEFAULT '{}',
  ADD COLUMN imported_attendance_ids TEXT[] DEFAULT '{}',
  ADD COLUMN imported_payment_ids TEXT[] DEFAULT '{}',
  ADD COLUMN reverted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
