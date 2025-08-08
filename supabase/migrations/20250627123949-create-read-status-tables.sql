-- Create admin_read_status table
CREATE TABLE IF NOT EXISTS public.admin_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, requirement_id)
);

-- Create client_read_status table
CREATE TABLE IF NOT EXISTS public.client_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, requirement_id)
);

-- Add foreign key constraints
ALTER TABLE public.admin_read_status 
ADD CONSTRAINT admin_read_status_requirement_id_fkey 
FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;

ALTER TABLE public.client_read_status 
ADD CONSTRAINT client_read_status_requirement_id_fkey 
FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;

-- Grant permissions
GRANT ALL ON public.admin_read_status TO authenticated;
GRANT ALL ON public.client_read_status TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_read_status_admin_id ON public.admin_read_status(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_read_status_requirement_id ON public.admin_read_status(requirement_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_client_id ON public.client_read_status(client_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_requirement_id ON public.client_read_status(requirement_id);
