-- Temporarily disable the problematic trigger
-- This allows the frontend to update status directly without trigger conflicts

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;

-- Add the closure columns if they don't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Create a simple function that doesn't cause conflicts
CREATE OR REPLACE FUNCTION sync_requirement_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple status sync without complex CASE statements
  IF NEW.admin_status = 'pending' THEN
    NEW.status := 'pending';
  ELSIF NEW.admin_status = 'ongoing' THEN
    NEW.status := 'in_progress';
    NEW.approved_by_admin := TRUE;
    NEW.approval_date := COALESCE(NEW.approval_date, NOW());
  ELSIF NEW.admin_status = 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_by_admin := TRUE;
    NEW.completion_date := COALESCE(NEW.completion_date, NOW());
  ELSIF NEW.admin_status = 'closed' THEN
    NEW.status := 'closed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the simplified function
CREATE TRIGGER sync_requirement_status
  BEFORE INSERT OR UPDATE OF admin_status ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION sync_requirement_status();

SELECT 'Trigger simplified and should work now!' AS status;
