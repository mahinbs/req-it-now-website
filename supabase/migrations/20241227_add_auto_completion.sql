-- Create a function to auto-complete requirements after 24 hours
CREATE OR REPLACE FUNCTION public.auto_complete_requirements()
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  updated_count INTEGER := 0;
  requirement_record RECORD;
  result json;
BEGIN
  -- Find requirements that should be auto-completed
  -- Requirements that have been completed by admin for more than 24 hours
  -- and haven't been accepted or rejected by client
  FOR requirement_record IN
    SELECT id, title, user_id, completion_date
    FROM public.requirements
    WHERE admin_status = 'completed'
      AND completed_by_admin = true
      AND accepted_by_client = false
      AND rejected_by_client = false
      AND completion_date IS NOT NULL
      AND completion_date < (NOW() - INTERVAL '24 hours')
  LOOP
    -- Update the requirement to be auto-accepted
    UPDATE public.requirements
    SET 
      accepted_by_client = true,
      acceptance_date = NOW(),
      status = 'accepted_by_client',
      updated_at = NOW()
    WHERE id = requirement_record.id;
    
    -- Log the auto-completion
    RAISE NOTICE 'Auto-completed requirement ID: %, Title: %', 
      requirement_record.id, requirement_record.title;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  -- Return result summary
  SELECT json_build_object(
    'success', true,
    'message', 'Auto-completion check completed',
    'updated_count', updated_count,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Create a function to get requirements pending auto-completion (for monitoring)
CREATE OR REPLACE FUNCTION public.get_pending_auto_completion()
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  pending_records json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'completion_date', completion_date,
      'hours_remaining', EXTRACT(EPOCH FROM (completion_date + INTERVAL '24 hours' - NOW())) / 3600
    )
  )
  INTO pending_records
  FROM public.requirements
  WHERE admin_status = 'completed'
    AND completed_by_admin = true
    AND accepted_by_client = false
    AND rejected_by_client = false
    AND completion_date IS NOT NULL
    AND completion_date > (NOW() - INTERVAL '24 hours');
  
  RETURN COALESCE(pending_records, '[]'::json);
END;
$function$;

-- Update the existing trigger to ensure completion_date is always set properly
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_complete_requirements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_auto_completion() TO authenticated;