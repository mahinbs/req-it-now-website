-- CRITICAL FIX: Update the sync_requirement_status function to handle 'closed' status
-- This specifically fixes the "case not found" error

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;
DROP FUNCTION IF EXISTS sync_requirement_status();

-- Step 2: Create the updated function with 'closed' support and ELSE clause
CREATE OR REPLACE FUNCTION sync_requirement_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync admin_status to status field with proper ELSE clause
  NEW.status := CASE 
    WHEN NEW.admin_status = 'pending' THEN 'pending'
    WHEN NEW.admin_status = 'ongoing' THEN 'in_progress'
    WHEN NEW.admin_status = 'completed' THEN 'completed'
    WHEN NEW.admin_status = 'closed' THEN 'closed'
    ELSE COALESCE(NEW.status, 'pending')  -- This ELSE clause fixes the error
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

-- Step 3: Recreate the trigger
CREATE TRIGGER sync_requirement_status
  BEFORE INSERT OR UPDATE OF admin_status ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION sync_requirement_status();

-- Step 4: Add the closure columns if they don't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Step 5: Verify the fix
SELECT 'Trigger function updated successfully! Closed status is now supported.' AS status;
