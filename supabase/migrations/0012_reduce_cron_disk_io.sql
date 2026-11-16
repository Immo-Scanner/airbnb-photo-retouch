-- Reduce Disk IO caused by pg_cron + pg_net (Supabase "Disk IO budget" alert).
--
-- pg_stat_statements showed the top writers were all cron bookkeeping:
-- ~280k inserts into cron.job_run_details (never purged) and ~276k
-- net.http_get calls, each storing a row in net._http_response — mostly
-- ticks with nothing to process.
--
-- 1. The two crons only call Vercel when there is actual work to do.
--    pg_cron still runs every minute (cheap), but no HTTP request and no
--    pg_net response row is written when the queue is empty.
-- 2. cron.job_run_details is purged every night (keeps 7 days).
--
-- No secret needed: the existing jobs are rewritten in place (their command
-- already contains the URL + Bearer token).

-- 1a. Work conditions, shared by the live jobs and the setup helpers.
create or replace function public.has_photos_to_process()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.photos where status in ('UPLOADED', 'PROCESSING')
  );
$$;

create or replace function public.has_batches_to_deliver()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.batches
    where status = 'READY' and scheduled_delivery_at <= now()
  );
$$;

-- 1b. Rewrite the existing jobs: "select net.http_get(...);" becomes
--     "select net.http_get(...) where public.has_xxx();".
do $$
declare
  j record;
  guard text;
begin
  for j in
    select jobid, jobname, command from cron.job
    where jobname in ('process-photos', 'deliver-orders')
  loop
    guard := case j.jobname
      when 'process-photos' then 'public.has_photos_to_process()'
      else 'public.has_batches_to_deliver()'
    end;
    if position(guard in j.command) = 0 then
      perform cron.alter_job(
        j.jobid,
        command := regexp_replace(j.command, '\)\s*;\s*$', ') where ' || guard || ';')
      );
    end if;
  end loop;
end
$$;

-- 1c. Same guard in the setup helpers, so a future re-run keeps it.
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
        ) where public.has_photos_to_process();
      $cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
end
$$;

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
        ) where public.has_batches_to_deliver();
      $cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
end
$$;

-- 2. Nightly purge of the cron run history (03:30 UTC), plus a first purge now.
delete from cron.job_run_details where end_time < now() - interval '7 days';

select cron.schedule(
  'purge-cron-history',
  '30 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
