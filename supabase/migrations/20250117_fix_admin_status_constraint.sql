-- Fix the admin_status check constraint to allow 'closed' status
-- This resolves the "violates check constraint" error

-- First, let's see what the current constraint looks like
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%admin_status%' 
AND conrelid = 'requirements'::regclass;

-- Drop the existing constraint
ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_admin_status_check;

-- Create a new constraint that includes 'closed'
ALTER TABLE requirements 
ADD CONSTRAINT requirements_admin_status_check 
CHECK (admin_status IN ('pending', 'ongoing', 'completed', 'closed'));

-- Also update the status constraint to include 'closed'
ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_status_check;

ALTER TABLE requirements 
ADD CONSTRAINT requirements_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'closed'));

-- Verify the constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%admin_status%' OR conname LIKE '%status%'
AND conrelid = 'requirements'::regclass;

SELECT 'Constraints updated to allow closed status!' AS status;
