-- Geoffrey photo-retouch — initial schema
-- Run in Supabase SQL editor (or via supabase CLI).
--
-- Buckets to create manually in Supabase Dashboard → Storage:
--   - "originals"  (private)  — gardés à vie pour le training IA
--   - "enhanced"   (private)  — livrés via signed URL au client

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type order_tier as enum ('S', 'M', 'L');

create type order_status as enum (
  'AWAITING_UPLOAD',  -- payé, attend que le client upload ses photos
  'PROCESSING',       -- toutes les photos ont été uploadées + envoyées à AutoEnhance
  'READY',            -- AutoEnhance a fini, on attend l'heure de livraison "humaine"
  'DELIVERED'         -- mail envoyé au client, accessible au téléchargement
);

create type photo_status as enum (
  'UPLOADED',
  'PROCESSING',
  'ENHANCED',
  'FAILED'
);

-- ============================================================
-- TABLES
-- ============================================================
create table public.orders (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,

  stripe_session_id       text unique,
  stripe_payment_intent   text,

  tier                    order_tier not null,
  photos_quota            int not null,         -- 1, 5 ou 20
  amount_cents            int not null,         -- 700, 2700, 9700

  status                  order_status not null default 'AWAITING_UPLOAD',

  paid_at                 timestamptz not null default now(),
  upload_completed_at     timestamptz,
  scheduled_delivery_at   timestamptz,          -- l'heure "humaine" calculée
  delivered_at            timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);
create index orders_scheduled_delivery_at_idx on public.orders(scheduled_delivery_at)
  where status = 'READY';

create table public.photos (
  id                       uuid primary key default uuid_generate_v4(),
  order_id                 uuid not null references public.orders(id) on delete cascade,

  original_path            text not null,                     -- path dans bucket "originals"
  original_filename        text not null,
  original_size_bytes      bigint not null,

  autoenhance_image_id     text unique,
  autoenhance_order_id     text,

  enhanced_path            text,                              -- path dans bucket "enhanced"
  status                   photo_status not null default 'UPLOADED',

  error_message            text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index photos_order_id_idx on public.photos(order_id);
create index photos_status_idx on public.photos(status);
create unique index photos_autoenhance_image_id_idx on public.photos(autoenhance_image_id)
  where autoenhance_image_id is not null;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.tg_set_updated_at();

create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.orders enable row level security;
alter table public.photos enable row level security;

-- Users only see their own orders
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

-- Users only see photos belonging to their orders
create policy "photos_select_own" on public.photos
  for select using (
    exists (select 1 from public.orders o where o.id = photos.order_id and o.user_id = auth.uid())
  );

-- All write paths go through service role (server actions / API routes)
-- so no INSERT/UPDATE/DELETE policies for anon/authenticated.

-- ============================================================
-- STORAGE POLICIES (run after creating the buckets)
-- ============================================================
-- "originals" bucket: clients ne peuvent PAS lire (signed URLs server-side only)
-- "enhanced"  bucket: même chose, livraison via signed URL
--
-- Insert policy : on autorise authenticated à uploader dans originals/{user_id}/{order_id}/...
create policy "originals_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
