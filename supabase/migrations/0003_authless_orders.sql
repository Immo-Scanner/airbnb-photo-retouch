-- 0003 — switch to email-based orders, no Supabase Auth required client-side.
--
-- Cold-traffic conversion needs zero friction: the user pays first (Stripe
-- collects the email), an order row is created with that email, and access to
-- the order page is granted via an HMAC-signed cookie set on the success URL.
-- No login, no magic link before payment.
--
-- This migration:
--   - Adds `email` to public.orders
--   - Drops the not-null constraint on `user_id` (kept nullable for legacy
--     and admin association)
--   - Drops the now-obsolete RLS policies (all writes go through service role,
--     all client reads go through API routes that validate the cookie)
--   - Drops the originals storage policy (uploads now use server-generated
--     signed upload URLs which bypass storage RLS by design)

alter table public.orders
  add column if not exists email text;

alter table public.orders
  alter column user_id drop not null;

create index if not exists orders_email_idx on public.orders(email);

-- We no longer rely on auth.uid() — drop the SELECT policies. RLS stays on
-- (defense in depth) so anon/authenticated cannot read directly; reads come
-- from API routes that use the service-role key.
drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "photos_select_own" on public.photos;

-- Storage uploads now flow via signed upload URLs generated server-side; the
-- bucket does not need an "authenticated insert" policy any more.
drop policy if exists "originals_insert_own" on storage.objects;
