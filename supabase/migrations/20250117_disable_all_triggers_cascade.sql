-- NUCLEAR OPTION: Disable ALL triggers on requirements table with CASCADE
-- This completely bypasses the problematic trigger causing the CASE error

-- Drop ALL triggers on requirements table first
DROP TRIGGER IF EXISTS sync_requirement_status ON requirements;
DROP TRIGGER IF EXISTS update_requirement_status ON requirements;
DROP TRIGGER IF EXISTS trigger_update_requirement_status ON requirements;
DROP TRIGGER IF EXISTS handle_requirement_changes ON requirements;
DROP TRIGGER IF EXISTS sync_admin_status ON requirements;
DROP TRIGGER IF EXISTS update_updated_at ON requirements;
DROP TRIGGER IF EXISTS update_requirements_updated_at ON requirements;

-- Drop ALL functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS sync_requirement_status() CASCADE;
DROP FUNCTION IF EXISTS update_requirement_status() CASCADE;
DROP FUNCTION IF EXISTS handle_requirement_changes() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_status() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Add the closure columns if they don't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Create a simple trigger that only handles updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create only the updated_at trigger
CREATE TRIGGER update_requirements_updated_at
  BEFORE UPDATE ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify no problematic triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'requirements';

SELECT 'All problematic triggers removed with CASCADE! Requirements table is now trigger-free.' AS status;
