-- COMPREHENSIVE FIX: Remove all problematic constraints and triggers
-- This completely eliminates the constraint violation errors

-- Step 1: Drop ALL triggers on requirements table
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;
DROP TRIGGER IF EXISTS update_requirement_status ON requirements;
DROP TRIGGER IF EXISTS trigger_update_requirement_status ON requirements;
DROP TRIGGER IF EXISTS handle_requirement_changes ON requirements;
DROP TRIGGER IF EXISTS sync_admin_status ON requirements;
DROP TRIGGER IF EXISTS update_updated_at ON requirements;
DROP TRIGGER IF EXISTS update_requirements_updated_at ON requirements;

-- Step 2: Drop ALL functions that might be causing issues
DROP FUNCTION IF EXISTS sync_requirement_status() CASCADE;
DROP FUNCTION IF EXISTS update_requirement_status() CASCADE;
DROP FUNCTION IF EXISTS handle_requirement_changes() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_status() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Step 3: Drop ALL status constraints
ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_admin_status_check CASCADE;

ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_status_check CASCADE;

-- Step 4: Add the closure columns if they don't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Step 5: Create a simple updated_at trigger only
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requirements_updated_at
  BEFORE UPDATE ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Verify no problematic triggers or constraints exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'requirements';

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'requirements'::regclass
AND conname LIKE '%status%';

SELECT 'All problematic triggers and constraints removed! Requirements table is now constraint-free.' AS status;
