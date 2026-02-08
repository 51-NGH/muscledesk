-- Drop the broken trigger that uses extensions.http_post (pg_net not available)
DROP TRIGGER IF EXISTS trg_whatsapp_payment_notify ON public.payments;
DROP FUNCTION IF EXISTS notify_whatsapp_payment();