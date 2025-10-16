-- Fix the status check constraint to allow all necessary values
-- This resolves the "violates check constraint" error when updating status

-- First, let's see what constraints exist
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'requirements'::regclass
AND conname LIKE '%status%';

-- Drop both status constraints
ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_admin_status_check CASCADE;

ALTER TABLE requirements 
DROP CONSTRAINT IF EXISTS requirements_status_check CASCADE;

-- Recreate admin_status constraint with all valid values
ALTER TABLE requirements 
ADD CONSTRAINT requirements_admin_status_check 
CHECK (admin_status IN ('pending', 'ongoing', 'completed', 'closed'));

-- Recreate status constraint with ALL valid values including legacy ones
-- This allows for both new and old status values during migration
ALTER TABLE requirements 
ADD CONSTRAINT requirements_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'closed', 'approved', 'rejected'));

-- Verify the new constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'requirements'::regclass
AND conname LIKE '%status%';

SELECT 'Status constraints updated successfully! All status values now allowed.' AS status;
