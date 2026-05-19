-- Group every upload under a single AutoEnhance "order" so they show up
-- bundled in their dashboard, titled with the customer's name + email.

alter table public.orders
  add column if not exists customer_name text;

alter table public.orders
  add column if not exists autoenhance_order_id text;

create unique index if not exists orders_autoenhance_order_id_idx
  on public.orders(autoenhance_order_id)
  where autoenhance_order_id is not null;
