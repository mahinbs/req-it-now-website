-- Test script for unread message functions
-- Run this after applying the complete-fix-unread-messages.sql script

-- Test 1: Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('admin_read_status', 'client_read_status');

-- Test 2: Check if functions exist
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_unread_counts_for_admin',
    'get_unread_counts_for_client',
    'mark_requirement_as_read',
    'mark_requirement_as_read_for_client'
  );

-- Test 3: Check recent messages to understand the data structure
SELECT 
  id,
  requirement_id,
  sender_id,
  is_admin,
  content,
  created_at
FROM public.messages 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 4: Check if there are any requirements with messages
SELECT 
  r.id as requirement_id,
  r.title,
  COUNT(m.id) as message_count,
  COUNT(CASE WHEN m.is_admin = false THEN 1 END) as client_messages,
  COUNT(CASE WHEN m.is_admin = true THEN 1 END) as admin_messages
FROM public.requirements r
LEFT JOIN public.messages m ON r.id = m.requirement_id
GROUP BY r.id, r.title
HAVING COUNT(m.id) > 0
ORDER BY message_count DESC
LIMIT 10;

-- Test 5: Test the admin function (replace 'your-admin-user-id' with actual admin user ID)
-- SELECT * FROM public.get_unread_counts_for_admin('your-admin-user-id');

-- Test 6: Test the client function (replace 'your-client-user-id' with actual client user ID)
-- SELECT * FROM public.get_unread_counts_for_client('your-client-user-id');

-- Test 7: Check current admin users
SELECT 
  au.user_id,
  au.created_at
FROM public.admin_users au
ORDER BY au.created_at DESC;

-- Test 8: Check if there are any existing read status records
SELECT 
  'admin_read_status' as table_name,
  COUNT(*) as record_count
FROM public.admin_read_status
UNION ALL
SELECT 
  'client_read_status' as table_name,
  COUNT(*) as record_count
FROM public.client_read_status;
