-- pg_cron + pg_net setup for the "deliver orders" job.
--
-- After this migration applies, call once (in the SQL editor) with your
-- production URL and the CRON_SECRET you set in Vercel:
--
--   select public.setup_deliver_cron(
--     'https://airbnb-photo-retouch.vercel.app/api/cron/deliver',
--     'YOUR_CRON_SECRET'
--   );
--
-- That function unschedules any existing 'deliver-orders' job and schedules
-- a fresh one running every 15 minutes that hits /api/cron/deliver with the
-- Bearer token. The secret never leaves Postgres — not committed in git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper to (re)install the schedule. Idempotent: each call wipes the previous
-- 'deliver-orders' entry so you can rotate the URL or the secret freely.
create or replace function public.setup_deliver_cron(p_url text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public, cron, net
as $$
begin
  -- Drop any existing schedule with the same name. Tolerate "no such job".
  begin
    perform cron.unschedule('deliver-orders');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'deliver-orders',
    '*/15 * * * *',
    format(
      $cmd$
        select net.http_get(
          url := %L,
          headers := jsonb_build_object('Authorization', %L)
        );
      $cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
end
$$;

-- Convenience: a teardown function for when you want to stop the cron.
create or replace function public.teardown_deliver_cron()
returns void
language plpgsql
security definer
as $$
begin
  begin
    perform cron.unschedule('deliver-orders');
  exception when others then null;
  end;
end
$$;
