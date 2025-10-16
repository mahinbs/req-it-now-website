-- Add 'closed' to status enum if it doesn't exist
-- This ensures the database accepts 'closed' as a valid status value

DO $$ 
BEGIN
  -- Check if the enum type exists and add 'closed' if not present
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'closed' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'status'
    )
  ) THEN
    -- Add 'closed' to the enum
    ALTER TYPE status ADD VALUE IF NOT EXISTS 'closed';
  END IF;
END $$;

-- If status column is just a text field (not enum), this will ensure it accepts 'closed'
-- Add check constraint if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'requirements_status_check'
  ) THEN
    -- If there's no enum and no constraint, the field is likely just text
    -- No action needed, text fields accept any value
    NULL;
  END IF;
END $$;

COMMENT ON COLUMN requirements.status IS 'Current status of the requirement. Values: pending, in_progress, completed, closed';
COMMENT ON COLUMN requirements.admin_status IS 'Admin-managed status. Values: pending, ongoing, completed, closed';

