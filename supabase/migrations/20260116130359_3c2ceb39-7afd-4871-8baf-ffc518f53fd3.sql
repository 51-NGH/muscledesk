-- Create a function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _gym_id uuid;
  _entity_id uuid;
  _old_data jsonb;
  _new_data jsonb;
BEGIN
  -- Determine gym_id and entity_id based on operation
  IF TG_OP = 'DELETE' THEN
    _gym_id := OLD.gym_id;
    _entity_id := OLD.id;
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _gym_id := NEW.gym_id;
    _entity_id := NEW.id;
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    _gym_id := NEW.gym_id;
    _entity_id := NEW.id;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    gym_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    _gym_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    _entity_id,
    _old_data,
    _new_data
  );

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for members table
CREATE TRIGGER audit_members_insert
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_members_update
  AFTER UPDATE ON public.members
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_members_delete
  AFTER DELETE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- Create triggers for payments table
CREATE TRIGGER audit_payments_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_payments_update
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_payments_delete
  AFTER DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- Create triggers for expenses table
CREATE TRIGGER audit_expenses_insert
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_expenses_update
  AFTER UPDATE ON public.expenses
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_expenses_delete
  AFTER DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- Create triggers for membership_plans table
CREATE TRIGGER audit_membership_plans_insert
  AFTER INSERT ON public.membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_membership_plans_update
  AFTER UPDATE ON public.membership_plans
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_membership_plans_delete
  AFTER DELETE ON public.membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();