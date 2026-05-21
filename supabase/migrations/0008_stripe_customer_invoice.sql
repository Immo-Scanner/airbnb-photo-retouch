-- Keep Stripe customer + invoice IDs on the order so we can link back from
-- our DB to the Stripe dashboard (refunds, accounting, customer-history
-- queries, etc.).

alter table public.orders
  add column if not exists stripe_customer_id text;

alter table public.orders
  add column if not exists stripe_invoice_id text;

create index if not exists orders_stripe_customer_id_idx
  on public.orders(stripe_customer_id)
  where stripe_customer_id is not null;
