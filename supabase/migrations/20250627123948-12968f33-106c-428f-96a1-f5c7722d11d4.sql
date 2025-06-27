
-- Create a function to properly reset requirement status and maintain consistency
CREATE OR REPLACE FUNCTION public.reset_requirement_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When admin_status changes to 'pending', reset all completion/acceptance flags
  IF NEW.admin_status = 'pending' AND OLD.admin_status != 'pending' THEN
    NEW.approved_by_admin = false;
    NEW.completed_by_admin = false;
    NEW.accepted_by_client = false;
    NEW.rejected_by_client = false;
    NEW.approval_date = NULL;
    NEW.completion_date = NULL;
    NEW.acceptance_date = NULL;
    NEW.rejection_reason = NULL;
    NEW.status = 'pending';
  END IF;
  
  -- When admin_status changes to 'ongoing', set proper approval flags
  IF NEW.admin_status = 'ongoing' AND OLD.admin_status != 'ongoing' THEN
    NEW.approved_by_admin = true;
    NEW.completed_by_admin = false;
    NEW.accepted_by_client = false;
    NEW.rejected_by_client = false;
    NEW.approval_date = COALESCE(NEW.approval_date, now());
    NEW.completion_date = NULL;
    NEW.acceptance_date = NULL;
    NEW.status = 'approved_by_admin';
  END IF;
  
  -- When admin_status changes to 'completed', set proper completion flags
  IF NEW.admin_status = 'completed' AND OLD.admin_status != 'completed' THEN
    NEW.approved_by_admin = true;
    NEW.completed_by_admin = true;
    NEW.accepted_by_client = false;
    NEW.rejected_by_client = false;
    NEW.approval_date = COALESCE(NEW.approval_date, now());
    NEW.completion_date = COALESCE(NEW.completion_date, now());
    NEW.acceptance_date = NULL;
    NEW.status = 'completed_by_admin';
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger to maintain status consistency
DROP TRIGGER IF EXISTS reset_requirement_status_trigger ON public.requirements;
CREATE TRIGGER reset_requirement_status_trigger
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_requirement_status();

-- Clean up existing inconsistent data
UPDATE public.requirements 
SET 
  approved_by_admin = false,
  completed_by_admin = false,
  accepted_by_client = false,
  rejected_by_client = false,
  approval_date = NULL,
  completion_date = NULL,
  acceptance_date = NULL,
  status = 'pending',
  updated_at = now()
WHERE admin_status = 'pending' 
  AND (approved_by_admin = true OR completed_by_admin = true OR accepted_by_client = true);

-- Clean up requirements where admin_status is 'ongoing' but flags are inconsistent
UPDATE public.requirements 
SET 
  approved_by_admin = true,
  completed_by_admin = false,
  accepted_by_client = false,
  rejected_by_client = false,
  approval_date = COALESCE(approval_date, created_at),
  completion_date = NULL,
  acceptance_date = NULL,
  status = 'approved_by_admin',
  updated_at = now()
WHERE admin_status = 'ongoing' 
  AND (approved_by_admin = false OR completed_by_admin = true OR accepted_by_client = true);

-- Clean up requirements where admin_status is 'completed' but flags are inconsistent
UPDATE public.requirements 
SET 
  approved_by_admin = true,
  completed_by_admin = true,
  accepted_by_client = false,
  rejected_by_client = false,
  approval_date = COALESCE(approval_date, created_at),
  completion_date = COALESCE(completion_date, created_at),
  acceptance_date = NULL,
  status = 'completed_by_admin',
  updated_at = now()
WHERE admin_status = 'completed' 
  AND (approved_by_admin = false OR completed_by_admin = false OR accepted_by_client = true);
