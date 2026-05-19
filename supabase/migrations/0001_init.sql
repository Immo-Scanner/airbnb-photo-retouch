-- Geoffrey photo-retouch — initial schema (idempotent).
-- Run in Supabase SQL editor (or via supabase CLI).
--
-- Buckets to create manually in Supabase Dashboard → Storage:
--   - "originals"  (private)  — gardés à vie pour le training IA
--   - "enhanced"   (private)  — livrés via signed URL au client

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type order_tier as enum ('S', 'M', 'L');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'AWAITING_UPLOAD',  -- payé, attend que le client upload ses photos
    'PROCESSING',       -- toutes les photos ont été uploadées + envoyées à AutoEnhance
    'READY',            -- AutoEnhance a fini, on attend l'heure de livraison "humaine"
    'DELIVERED'         -- mail envoyé au client, accessible au téléchargement
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_status as enum ('UPLOADED', 'PROCESSING', 'ENHANCED', 'FAILED');
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES
-- ============================================================
create table if not exists public.orders (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,

  stripe_session_id       text unique,
  stripe_payment_intent   text,

  tier                    order_tier not null,
  photos_quota            int not null,
  amount_cents            int not null,

  status                  order_status not null default 'AWAITING_UPLOAD',

  paid_at                 timestamptz not null default now(),
  upload_completed_at     timestamptz,
  scheduled_delivery_at   timestamptz,
  delivered_at            timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_scheduled_delivery_at_idx on public.orders(scheduled_delivery_at)
  where status = 'READY';

create table if not exists public.photos (
  id                       uuid primary key default uuid_generate_v4(),
  order_id                 uuid not null references public.orders(id) on delete cascade,

  original_path            text not null,
  original_filename        text not null,
  original_size_bytes      bigint not null,

  enhanced_path            text,
  status                   photo_status not null default 'UPLOADED',

  error_message            text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists photos_order_id_idx on public.photos(order_id);
create index if not exists photos_status_idx on public.photos(status);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.tg_set_updated_at();

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.orders enable row level security;
alter table public.photos enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own" on public.photos
  for select using (
    exists (select 1 from public.orders o where o.id = photos.order_id and o.user_id = auth.uid())
  );

-- All write paths go through service role (server actions / API routes)
-- so no INSERT/UPDATE/DELETE policies for anon/authenticated.

-- ============================================================
-- STORAGE POLICIES
-- ============================================================
-- Authenticated user can upload into originals/{user_id}/...
drop policy if exists "originals_insert_own" on storage.objects;
create policy "originals_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
