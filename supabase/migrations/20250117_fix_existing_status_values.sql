-- Fix existing status values that violate the new constraint
-- This handles existing data before applying the new constraint

-- First, let's see what status values currently exist
SELECT DISTINCT status, COUNT(*) as count
FROM requirements 
GROUP BY status
ORDER BY status;

SELECT DISTINCT admin_status, COUNT(*) as count
FROM requirements 
GROUP BY admin_status
ORDER BY admin_status;

-- Update any invalid status values to valid ones
UPDATE requirements 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'closed');

UPDATE requirements 
SET admin_status = 'pending' 
WHERE admin_status NOT IN ('pending', 'ongoing', 'completed', 'closed');

-- Now drop and recreate the constraints
ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_admin_status_check;

ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_status_check;

-- Create new constraints with all valid values
ALTER TABLE requirements 
ADD CONSTRAINT requirements_admin_status_check 
CHECK (admin_status IN ('pending', 'ongoing', 'completed', 'closed'));

ALTER TABLE requirements 
ADD CONSTRAINT requirements_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'closed'));

-- Verify the constraints are working
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%admin_status%' OR conname LIKE '%status%'
AND conrelid = 'requirements'::regclass;

SELECT 'Status values fixed and constraints updated!' AS status;
