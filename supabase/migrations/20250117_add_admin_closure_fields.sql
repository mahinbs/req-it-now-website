-- Add admin closure fields to requirements table
-- This allows admins to close requirements without completing them

ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS admin_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN requirements.admin_closure_reason IS 'Reason provided by admin for closing the requirement without completion';
COMMENT ON COLUMN requirements.admin_closed_at IS 'Timestamp when the requirement was closed by admin';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_requirements_admin_closed 
ON requirements(admin_status) 
WHERE admin_status = 'closed';

