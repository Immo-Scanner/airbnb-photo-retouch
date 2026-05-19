-- Add an optional schedule parameter to setup_deliver_cron so we can flip
-- between dev cadence (every minute) and prod cadence (every 15 min) without
-- editing the function body each time.
--
-- After this migration applies, re-run the setup with the schedule you want:
--
--   -- test (every minute):
--   select public.setup_deliver_cron(
--     'https://airbnb-photo-retouch.vercel.app/api/cron/deliver',
--     '<CRON_SECRET>',
--     '* * * * *'
--   );
--
--   -- prod (every 15 minutes):
--   select public.setup_deliver_cron(
--     'https://airbnb-photo-retouch.vercel.app/api/cron/deliver',
--     '<CRON_SECRET>',
--     '*/15 * * * *'
--   );

create or replace function public.setup_deliver_cron(
  p_url text,
  p_secret text,
  p_schedule text default '*/15 * * * *'
)
returns void
language plpgsql
security definer
set search_path = public, cron, net
as $$
begin
  begin
    perform cron.unschedule('deliver-orders');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'deliver-orders',
    p_schedule,
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
