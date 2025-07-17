# Auto-Completion Deployment Guide

## 1. Deploy the Database Migration

Run the following command to apply the database migration:

```bash
supabase db push
```

This will create the necessary database functions for auto-completion.

## 2. Deploy the Edge Function

Deploy the auto-completion edge function:

```bash
supabase functions deploy auto-complete-requirements
```

## 3. Set Up Scheduled Execution (Choose One Method)

### Option A: Using External Cron Service (Recommended)

1. Set up a cron job service (like cron-job.org, EasyCron, or GitHub Actions) to call the edge function every hour:

```bash
# Example cron expression (runs every hour)
0 * * * *
```

2. The URL to call:
```
https://your-project-id.supabase.co/functions/v1/auto-complete-requirements
```

3. Include the following headers:
```
Authorization: Bearer YOUR_ANON_KEY
```

### Option B: Using Supabase Cron (if available)

Add to your Supabase dashboard or via SQL:

```sql
-- Note: This requires pg_cron extension to be enabled
SELECT cron.schedule(
  'auto-complete-requirements',
  '0 * * * *', -- Every hour
  'SELECT net.http_post(
    url := ''https://your-project-id.supabase.co/functions/v1/auto-complete-requirements'',
    headers := ''{"Authorization": "Bearer YOUR_ANON_KEY"}''
  )'
);
```

## 4. Test the Implementation

### Manual Testing

1. Test the database function directly:
```sql
SELECT auto_complete_requirements();
```

2. Test the edge function:
```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/auto-complete-requirements \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Check Pending Auto-Completions

```sql
SELECT get_pending_auto_completion();
```

## 5. Monitor the System

- Check the edge function logs in Supabase dashboard
- Monitor the database for auto-completed requirements
- Set up alerts for failed auto-completion attempts

## 6. Environment Variables

Make sure these are set in your Supabase project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Rollback Plan

If you need to disable auto-completion:

1. Stop the cron job
2. Optionally drop the functions:
```sql
DROP FUNCTION IF EXISTS auto_complete_requirements();
DROP FUNCTION IF EXISTS get_pending_auto_completion();
```

## Notes

- The system will auto-complete requirements exactly 24 hours after `completion_date`
- Auto-completion sets `accepted_by_client = true` and `acceptance_date = NOW()`
- The frontend will show real-time countdown until auto-completion
- All changes are logged in the database and edge function logs