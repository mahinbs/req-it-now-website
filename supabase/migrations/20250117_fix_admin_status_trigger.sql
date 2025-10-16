-- Fix the admin_status trigger to handle 'closed' status
-- This fixes the "case not found" error when closing requirements

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;
DROP FUNCTION IF EXISTS sync_requirement_status();

-- Create or replace the trigger function with support for 'closed' status
CREATE OR REPLACE FUNCTION sync_requirement_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync admin_status to status field based on admin_status value
  NEW.status := CASE 
    WHEN NEW.admin_status = 'pending' THEN 'pending'
    WHEN NEW.admin_status = 'ongoing' THEN 'in_progress'
    WHEN NEW.admin_status = 'completed' THEN 'completed'
    WHEN NEW.admin_status = 'closed' THEN 'closed'
    ELSE NEW.status  -- Keep existing status if admin_status is not recognized
  END;
  
  -- Set appropriate boolean flags based on status
  IF NEW.admin_status = 'ongoing' THEN
    NEW.approved_by_admin := TRUE;
    NEW.approval_date := COALESCE(NEW.approval_date, NOW());
  END IF;
  
  IF NEW.admin_status = 'completed' THEN
    NEW.completed_by_admin := TRUE;
    NEW.completion_date := COALESCE(NEW.completion_date, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER sync_requirement_status
  BEFORE INSERT OR UPDATE OF admin_status ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION sync_requirement_status();

-- Add comment
COMMENT ON FUNCTION sync_requirement_status() IS 'Syncs admin_status to status field and sets appropriate flags. Handles pending, ongoing, completed, and closed statuses.';

