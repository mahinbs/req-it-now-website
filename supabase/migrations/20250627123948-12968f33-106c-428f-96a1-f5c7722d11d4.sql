
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

-- Create function to get unread message counts for admin
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_admin(admin_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.requirement_id::text,
    COUNT(*)::bigint as unread_count
  FROM public.messages m
  LEFT JOIN public.admin_read_status ars ON 
    ars.requirement_id = m.requirement_id AND 
    ars.admin_id = admin_user_id
  WHERE 
    m.requirement_id IS NOT NULL
    AND m.is_admin = false  -- Only count client messages
    AND m.sender_id != admin_user_id  -- Don't count admin's own messages
    AND (
      ars.last_read_at IS NULL 
      OR m.created_at > ars.last_read_at
    )
  GROUP BY m.requirement_id
  HAVING COUNT(*) > 0
  ORDER BY unread_count DESC;
END;
$function$;

-- Create function to get unread message counts for client
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_client(client_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.requirement_id::text,
    COUNT(*)::bigint as unread_count
  FROM public.messages m
  LEFT JOIN public.client_read_status crs ON 
    crs.requirement_id = m.requirement_id AND 
    crs.client_id = client_user_id
  WHERE 
    m.requirement_id IS NOT NULL
    AND m.is_admin = true  -- Only count admin messages
    AND m.sender_id != client_user_id  -- Don't count client's own messages
    AND (
      crs.last_read_at IS NULL 
      OR m.created_at > crs.last_read_at
    )
  GROUP BY m.requirement_id
  HAVING COUNT(*) > 0
  ORDER BY unread_count DESC;
END;
$function$;

-- Create function to mark requirement as read for admin
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read(admin_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.admin_read_status (admin_id, requirement_id, last_read_at)
  VALUES (admin_user_id, req_id, now())
  ON CONFLICT (admin_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Create function to mark requirement as read for client
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read_for_client(client_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.client_read_status (client_id, requirement_id, last_read_at)
  VALUES (client_user_id, req_id, now())
  ON CONFLICT (client_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_client(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read_for_client(text, text) TO authenticated;
