-- Complete fix for unread messages not showing in MessagesPage
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Create admin_read_status table
CREATE TABLE IF NOT EXISTS public.admin_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, requirement_id)
);

-- Step 2: Create client_read_status table
CREATE TABLE IF NOT EXISTS public.client_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, requirement_id)
);

-- Step 3: Add foreign key constraints (with error handling)
DO $$ 
BEGIN
  -- Add admin_read_status foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_read_status_requirement_id_fkey'
  ) THEN
    ALTER TABLE public.admin_read_status 
    ADD CONSTRAINT admin_read_status_requirement_id_fkey 
    FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;
  END IF;
  
  -- Add client_read_status foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'client_read_status_requirement_id_fkey'
  ) THEN
    ALTER TABLE public.client_read_status 
    ADD CONSTRAINT client_read_status_requirement_id_fkey 
    FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Create function to get unread message counts for admin
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_admin(admin_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.requirement_id::text,
    COUNT(*)::bigint as unread_count
  FROM public.messages m
  LEFT JOIN public.admin_read_status ars ON 
    ars.requirement_id = m.requirement_id AND 
    ars.admin_id = admin_user_id
  WHERE 
    m.requirement_id IS NOT NULL
    AND m.is_admin = false  -- Only count client messages
    AND m.sender_id != admin_user_id  -- Don't count admin's own messages
    AND (
      ars.last_read_at IS NULL 
      OR m.created_at > ars.last_read_at
    )
  GROUP BY m.requirement_id
  HAVING COUNT(*) > 0
  ORDER BY unread_count DESC;
END;
$function$;

-- Step 5: Create function to get unread message counts for client
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_client(client_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.requirement_id::text,
    COUNT(*)::bigint as unread_count
  FROM public.messages m
  LEFT JOIN public.client_read_status crs ON 
    crs.requirement_id = m.requirement_id AND 
    crs.client_id = client_user_id
  WHERE 
    m.requirement_id IS NOT NULL
    AND m.is_admin = true  -- Only count admin messages
    AND m.sender_id != client_user_id  -- Don't count client's own messages
    AND (
      crs.last_read_at IS NULL 
      OR m.created_at > crs.last_read_at
    )
  GROUP BY m.requirement_id
  HAVING COUNT(*) > 0
  ORDER BY unread_count DESC;
END;
$function$;

-- Step 6: Create function to mark requirement as read for admin
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read(admin_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.admin_read_status (admin_id, requirement_id, last_read_at)
  VALUES (admin_user_id, req_id, now())
  ON CONFLICT (admin_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Step 7: Create function to mark requirement as read for client
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read_for_client(client_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.client_read_status (client_id, requirement_id, last_read_at)
  VALUES (client_user_id, req_id, now())
  ON CONFLICT (client_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_client(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read_for_client(text, text) TO authenticated;
GRANT ALL ON public.admin_read_status TO authenticated;
GRANT ALL ON public.client_read_status TO authenticated;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_read_status_admin_id ON public.admin_read_status(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_read_status_requirement_id ON public.admin_read_status(requirement_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_client_id ON public.client_read_status(client_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_requirement_id ON public.client_read_status(requirement_id);

-- Step 10: Enable Row Level Security (RLS) for the new tables
ALTER TABLE public.admin_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_read_status ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies
-- Admin can only see their own read status
CREATE POLICY "Admin can view own read status" ON public.admin_read_status
  FOR SELECT USING (auth.uid()::text = admin_id);

-- Admin can insert/update their own read status
CREATE POLICY "Admin can manage own read status" ON public.admin_read_status
  FOR ALL USING (auth.uid()::text = admin_id);

-- Client can only see their own read status
CREATE POLICY "Client can view own read status" ON public.client_read_status
  FOR SELECT USING (auth.uid()::text = client_id);

-- Client can insert/update their own read status
CREATE POLICY "Client can manage own read status" ON public.client_read_status
  FOR ALL USING (auth.uid()::text = client_id);

-- Step 12: Test the functions (optional - you can run these manually)
-- SELECT * FROM public.get_unread_counts_for_admin('your-admin-user-id');
-- SELECT * FROM public.get_unread_counts_for_client('your-client-user-id');

-- Step 13: Show success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Tables created: admin_read_status, client_read_status';
  RAISE NOTICE 'Functions created: get_unread_counts_for_admin, get_unread_counts_for_client, mark_requirement_as_read, mark_requirement_as_read_for_client';
  RAISE NOTICE 'Permissions and indexes configured';
END $$;
