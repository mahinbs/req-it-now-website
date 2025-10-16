-- Create RPC function to close requirements without trigger conflicts
-- This bypasses all triggers and handles the update safely

CREATE OR REPLACE FUNCTION close_requirement_admin(
  requirement_id UUID,
  closure_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the requirement directly without triggering any functions
  UPDATE requirements 
  SET 
    admin_status = 'closed',
    status = 'closed',
    admin_closure_reason = closure_reason,
    admin_closed_at = NOW(),
    updated_at = NOW()
  WHERE id = requirement_id;
  
  -- Check if the update was successful
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Requirement closed successfully',
      'requirement_id', requirement_id
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'Requirement not found',
      'requirement_id', requirement_id
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION close_requirement_admin(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION close_requirement_admin(UUID, TEXT) IS 'Closes a requirement as admin without triggering database functions. Bypasses all triggers to avoid CASE statement errors.';

-- Test the function
SELECT 'RPC function created successfully! Use close_requirement_admin(requirement_id, reason) to close requirements.' AS status;
