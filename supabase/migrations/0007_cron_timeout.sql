-- pg_net's default HTTP timeout is 1000ms. Our /api/photos/process route runs
-- OpenAI image edits that take 30–50s, so every cron tick was being killed
-- by pg_net hanging up the connection before the function could finish.
-- Result: 19 photos stuck UPLOADED, nothing ever moves.
--
-- Bake a 60s timeout into both cron commands. After this migration, re-run
-- setup_process_cron(...) and setup_deliver_cron(...) so the schedule entries
-- get rebuilt with the new command body.

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
  exception when others then null;
  end;

  perform cron.schedule(
    'deliver-orders',
    p_schedule,
    format(
      $cmd$
        select net.http_get(
          url := %L,
          headers := jsonb_build_object('Authorization', %L),
          timeout_milliseconds := 60000
        );
      $cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
end
$$;

create or replace function public.setup_process_cron(
  p_url text,
  p_secret text,
  p_schedule text default '* * * * *'
)
returns void
language plpgsql
security definer
set search_path = public, cron, net
as $$
begin
  begin
    perform cron.unschedule('process-photos');
  exception when others then null;
  end;

  perform cron.schedule(
    'process-photos',
    p_schedule,
    format(
      $cmd$
        select net.http_get(
          url := %L,
          headers := jsonb_build_object('Authorization', %L),
          timeout_milliseconds := 60000
        );
      $cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
end
$$;
