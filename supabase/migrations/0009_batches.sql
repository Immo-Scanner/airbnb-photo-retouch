-- Batches model: one purchase = N credits, the customer spends them across
-- as many upload "batches" as they want, with no time limit. Each batch has
-- its own delivery cycle (upload → process → 48h business delay → email).
--
-- After this migration:
--   - photos belong to a batch (batch_id), and the batch belongs to an order
--   - orders keep their photos_quota (= credits purchased) but lose meaningful
--     status transitions past PROCESSING — that lifecycle moves to batches
--   - cron deliver picks BATCHES instead of orders

do $$ begin
  create type batch_status as enum ('PROCESSING', 'READY', 'DELIVERED');
exception when duplicate_object then null; end $$;

create table if not exists public.batches (
  id                       uuid primary key default uuid_generate_v4(),
  order_id                 uuid not null references public.orders(id) on delete cascade,
  status                   batch_status not null default 'PROCESSING',
  upload_completed_at      timestamptz not null default now(),
  scheduled_delivery_at    timestamptz,
  delivered_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists batches_order_id_idx on public.batches(order_id);
create index if not exists batches_status_idx on public.batches(status);
create index if not exists batches_scheduled_delivery_at_idx
  on public.batches(scheduled_delivery_at)
  where status = 'READY';

drop trigger if exists batches_set_updated_at on public.batches;
create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.tg_set_updated_at();

alter table public.batches enable row level security;

-- Photos get linked to a batch. Nullable for now so the backfill below can run.
alter table public.photos
  add column if not exists batch_id uuid references public.batches(id) on delete cascade;

create index if not exists photos_batch_id_idx on public.photos(batch_id);

-- Backfill: every existing order that already has photos becomes one batch.
-- Status mirrors what the order has today so the deliver cron picks up
-- exactly the same set of due deliveries it was about to pick up.
with new_batches as (
  insert into public.batches (id, order_id, status, upload_completed_at, scheduled_delivery_at, delivered_at, created_at)
  select
    uuid_generate_v4(),
    o.id,
    case o.status
      when 'PROCESSING' then 'PROCESSING'::batch_status
      when 'READY' then 'READY'::batch_status
      when 'DELIVERED' then 'DELIVERED'::batch_status
    end,
    coalesce(o.upload_completed_at, o.created_at),
    o.scheduled_delivery_at,
    o.delivered_at,
    o.created_at
  from public.orders o
  where o.status in ('PROCESSING', 'READY', 'DELIVERED')
  returning id, order_id
)
update public.photos p
set batch_id = nb.id
from new_batches nb
where p.order_id = nb.order_id
  and p.batch_id is null;

-- Already-delivered orders: also mirror onto the matching batch.
update public.batches b
set status = 'DELIVERED'::batch_status,
    delivered_at = o.delivered_at
from public.orders o
where b.order_id = o.id
  and o.status = 'DELIVERED'
  and b.status <> 'DELIVERED'::batch_status;
