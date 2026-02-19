-- Enable the pg_cron extension if not enabled
create extension if not exists pg_cron;

-- Schedule the daily theme generation for 6:00 AM Brazil time (09:00 UTC)
-- The function ai-generate-theme will be called via an edge function wrapper or direct HTTP call if possible, 
-- but usually pg_cron calls a SQL function. 
-- Since we have an Edge Function, we can use pg_net (if available) or a webhook.
-- Alternatively, if this is just a SQL snippet for the user to run, we can guide them.

-- However, a better approach for Supabase Edge Functions is to use pg_cron to make an HTTP request.
-- Make sure pg_net is enabled too.
create extension if not exists pg_net;

-- Job to call the Edge Function every day at 6am
select
  cron.schedule(
    'generate-daily-theme',
    '0 9 * * *', -- 09:00 UTC is 06:00 BRT
    $$
    select
      net.http_post(
        url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/ai-generate-theme',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
  );
