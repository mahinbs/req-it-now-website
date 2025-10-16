-- Complete fix for 'closed' status support
-- Run this script in Supabase SQL Editor to fix the "case not found" error

-- Step 1: Add the closure fields if they don't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN requirements.admin_closure_reason IS 'Reason provided by admin for closing the requirement without completion';
COMMENT ON COLUMN requirements.admin_closed_at IS 'Timestamp when the requirement was closed by admin';
COMMENT ON COLUMN requirements.status IS 'Current status of the requirement. Values: pending, in_progress, completed, closed';
COMMENT ON COLUMN requirements.admin_status IS 'Admin-managed status. Values: pending, ongoing, completed, closed';

-- Step 3: Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;
DROP FUNCTION IF EXISTS sync_requirement_status();

-- Step 4: Create the updated trigger function with 'closed' support
CREATE OR REPLACE FUNCTION sync_requirement_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync admin_status to status field based on admin_status value
  -- Added ELSE clause to handle all cases
  NEW.status := CASE 
    WHEN NEW.admin_status = 'pending' THEN 'pending'
    WHEN NEW.admin_status = 'ongoing' THEN 'in_progress'
    WHEN NEW.admin_status = 'completed' THEN 'completed'
    WHEN NEW.admin_status = 'closed' THEN 'closed'
    ELSE COALESCE(NEW.status, 'pending')  -- Default to pending if admin_status is not recognized
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

-- Step 5: Create the trigger
CREATE TRIGGER sync_requirement_status
  BEFORE INSERT OR UPDATE OF admin_status ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION sync_requirement_status();

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_requirements_admin_status_closed 
ON requirements(admin_status) 
WHERE admin_status = 'closed';

CREATE INDEX IF NOT EXISTS idx_requirements_status_closed 
ON requirements(status) 
WHERE status = 'closed';

-- Step 7: Add comment on the function
COMMENT ON FUNCTION sync_requirement_status() IS 'Syncs admin_status to status field and sets appropriate flags. Handles pending, ongoing, completed, and closed statuses with proper ELSE clause.';

-- Verify the fix
SELECT 'Migration completed successfully! The closed status is now supported.' AS status;

