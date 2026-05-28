-- One-shot tokens for the customer-facing /order/[id]/redo page.
-- Admin POSTs to /api/admin/orders/[id]/generate-redo-link → row inserted
-- with a random token → URL handed to the customer. The customer's submit
-- atomically marks `used_at` so the same URL cannot be re-used to spawn
-- more free redo batches.
--
-- Admin can generate as many tokens as needed (one per justified redo
-- request); each is a single-use voucher.

create table if not exists public.redo_tokens (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  token           text not null unique,
  used_at         timestamptz,
  used_batch_id   uuid references public.batches(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists redo_tokens_order_id_idx on public.redo_tokens(order_id);
-- Fast "is this token still valid?" lookup.
create index if not exists redo_tokens_unused_idx on public.redo_tokens(token)
  where used_at is null;

alter table public.redo_tokens enable row level security;
