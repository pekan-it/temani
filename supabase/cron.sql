-- =============================================================================
-- Temani — Reminder scheduler
-- =============================================================================
-- The `send-medication-reminders` Edge Function only does work for the current
-- minute (it compares "now" against each reminder time within a ±1 minute
-- window). It must therefore be invoked once per minute. We do that from the
-- database with pg_cron + pg_net.
--
-- Run this ONCE in the Supabase SQL Editor after deploying the Edge Function.
-- Replace the two placeholders first:
--   <PROJECT_REF>        e.g. abcd1234   (Project Settings → General)
--   <SERVICE_ROLE_KEY>   the service_role key (Project Settings → API)
--
-- The service_role key is a secret: keep your filled-in copy OUT of version
-- control (only this placeholder template belongs in the repo).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace any previous definition so re-running is safe.
select cron.unschedule('temani-send-reminders')
where exists (
  select 1 from cron.job where jobname = 'temani-send-reminders'
);

select cron.schedule(
  'temani-send-reminders',
  '* * * * *', -- every minute
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-medication-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Inspect runs:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;
