-- Check for unread messages in the database
-- Run this in your Supabase SQL Editor to see what messages exist

-- 1. Check all messages
SELECT 
  id,
  requirement_id,
  sender_id,
  is_admin,
  content,
  created_at
FROM public.messages 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Check requirements with messages
SELECT 
  r.id as requirement_id,
  r.title,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.is_admin = false THEN 1 END) as client_messages,
  COUNT(CASE WHEN m.is_admin = true THEN 1 END) as admin_messages,
  MAX(m.created_at) as last_message_time
FROM public.requirements r
LEFT JOIN public.messages m ON r.id = m.requirement_id
GROUP BY r.id, r.title
HAVING COUNT(m.id) > 0
ORDER BY last_message_time DESC;

-- 3. Check admin users
SELECT 
  au.user_id,
  au.created_at
FROM public.admin_users au
ORDER BY au.created_at DESC;

-- 4. Test the unread function for a specific admin (replace with actual admin user ID)
-- SELECT * FROM public.get_unread_counts_for_admin('your-admin-user-id-here');

-- 5. Check if read status tables have any data
SELECT 
  'admin_read_status' as table_name,
  COUNT(*) as record_count
FROM public.admin_read_status
UNION ALL
SELECT 
  'client_read_status' as table_name,
  COUNT(*) as record_count
FROM public.client_read_status;

-- 6. Check recent messages that should be unread for admin
-- (Client messages that admin hasn't read)
SELECT 
  m.id,
  m.requirement_id,
  r.title as requirement_title,
  m.sender_id,
  m.is_admin,
  m.content,
  m.created_at,
  ars.last_read_at,
  CASE 
    WHEN ars.last_read_at IS NULL THEN 'Never read'
    WHEN m.created_at > ars.last_read_at THEN 'Unread'
    ELSE 'Read'
  END as read_status
FROM public.messages m
JOIN public.requirements r ON m.requirement_id = r.id
LEFT JOIN public.admin_read_status ars ON 
  ars.requirement_id = m.requirement_id 
  AND ars.admin_id = 'your-admin-user-id-here'  -- Replace with actual admin ID
WHERE m.is_admin = false  -- Only client messages
ORDER BY m.created_at DESC
LIMIT 10;
