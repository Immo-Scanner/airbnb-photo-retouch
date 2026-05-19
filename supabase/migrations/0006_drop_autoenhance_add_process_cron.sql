-- Drop AutoEnhance leftovers (replaced by OpenAI image edit) and add a
-- helper to schedule the photo-processing cron.
--
-- After this migration applies, call:
--
--   select public.setup_process_cron(
--     'https://airbnb-photo-retouch.vercel.app/api/photos/process',
--     '<CRON_SECRET>',
--     '* * * * *'   -- every minute; use '*/2 * * * *' or longer in prod
--   );

-- 1. Drop the orders ↔ AutoEnhance columns
drop index if exists orders_autoenhance_order_id_idx;
alter table public.orders drop column if exists autoenhance_order_id;

-- 2. Drop the photos ↔ AutoEnhance columns
drop index if exists photos_autoenhance_image_id_idx;
alter table public.photos drop column if exists autoenhance_image_id;
alter table public.photos drop column if exists autoenhance_order_id;

-- 3. Photo-processing cron helper. Same shape as setup_deliver_cron.
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
  exception when others then
    null;
  end;

  perform cron.schedule(
    'process-photos',
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

create or replace function public.teardown_process_cron()
returns void
language plpgsql
security definer
as $$
begin
  begin
    perform cron.unschedule('process-photos');
  exception when others then null;
  end;
end
$$;
