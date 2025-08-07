-- Fix for unread messages not showing in MessagesPage
-- Run this in your Supabase SQL Editor

-- Create admin_read_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, requirement_id)
);

-- Create client_read_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.client_read_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  requirement_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, requirement_id)
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_read_status_requirement_id_fkey') THEN
    ALTER TABLE public.admin_read_status 
    ADD CONSTRAINT admin_read_status_requirement_id_fkey 
    FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_read_status_requirement_id_fkey') THEN
    ALTER TABLE public.client_read_status 
    ADD CONSTRAINT client_read_status_requirement_id_fkey 
    FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to get unread message counts for admin
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_admin(admin_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
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

-- Create function to get unread message counts for client
CREATE OR REPLACE FUNCTION public.get_unread_counts_for_client(client_user_id text)
RETURNS TABLE(requirement_id text, unread_count bigint)
LANGUAGE plpgsql
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

-- Create function to mark requirement as read for admin
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read(admin_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.admin_read_status (admin_id, requirement_id, last_read_at)
  VALUES (admin_user_id, req_id, now())
  ON CONFLICT (admin_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Create function to mark requirement as read for client
CREATE OR REPLACE FUNCTION public.mark_requirement_as_read_for_client(client_user_id text, req_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.client_read_status (client_id, requirement_id, last_read_at)
  VALUES (client_user_id, req_id, now())
  ON CONFLICT (client_id, requirement_id)
  DO UPDATE SET last_read_at = now();
END;
$function$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts_for_client(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_requirement_as_read_for_client(text, text) TO authenticated;
GRANT ALL ON public.admin_read_status TO authenticated;
GRANT ALL ON public.client_read_status TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_read_status_admin_id ON public.admin_read_status(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_read_status_requirement_id ON public.admin_read_status(requirement_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_client_id ON public.client_read_status(client_id);
CREATE INDEX IF NOT EXISTS idx_client_read_status_requirement_id ON public.client_read_status(requirement_id);

-- Test the functions (optional - remove these lines after testing)
-- SELECT * FROM public.get_unread_counts_for_admin('your-admin-user-id');
-- SELECT * FROM public.get_unread_counts_for_client('your-client-user-id');
