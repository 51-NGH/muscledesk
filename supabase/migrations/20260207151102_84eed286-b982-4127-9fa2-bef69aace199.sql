
-- Create a function that fires whatsapp-payment-hook via pg_net on payment insert
CREATE OR REPLACE FUNCTION public.notify_whatsapp_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Only fire for completed payments
  IF NEW.status = 'completed' THEN
    PERFORM extensions.http_post(
      url := 'https://thjckvsuymxwyjsviokj.supabase.co/functions/v1/whatsapp-payment-hook',
      body := jsonb_build_object(
        'member_id', NEW.member_id,
        'amount', NEW.amount,
        'gym_id', NEW.gym_id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoamNrdnN1eW14d3lqc3Zpb2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODQzNTksImV4cCI6MjA4MzQ2MDM1OX0.4sFb90-FrX8GFauh5HkwFsYnliAGOGtYyv06ZBu-EcQ'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to payments table
CREATE TRIGGER trg_whatsapp_payment_notify
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_whatsapp_payment();
