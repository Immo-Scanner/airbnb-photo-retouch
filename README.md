# airbnb-photo-retouch

> Hidden SaaS — "Geoffrey, photographe pro retouche tes photos Airbnb en 48h".
> Côté client : portail simple, livraison humaine.
> Côté nous : OpenAI `gpt-image-1` fait la retouche, on garde les originaux pour entraîner notre IA.

**Stack** : Next.js 15 (App Router) · Supabase (Auth/Storage/Postgres/pg_cron) · Stripe Checkout · OpenAI `gpt-image-1` · Vercel

---

## Setup local (dev)

```bash
# 1. deps
npm install

# 2. env
cp .env.example .env.local
# remplis les valeurs (voir section "Provisioning" ci-dessous)

# 3. lance le dev server
npm run dev
```

App sur http://localhost:3000

---

## Provisioning des services externes

### 1. Supabase (~3 min)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Project Settings → API → copie `URL`, `anon` et `service_role` keys.
3. Database → Extensions → active `pg_cron` ET `pg_net`.
4. SQL Editor → applique les migrations dans l'ordre (`supabase/migrations/000X_*.sql`). En CI, la GitHub Action `supabase-migrations.yml` fait ça pour toi.
5. Storage → crée 2 buckets **privés** : `originals` (gardés à vie pour le training IA) et `enhanced` (livrés via signed URL).

### 2. Stripe (~5 min, mode test)

1. Crée 3 produits one-time : 7€, 27€, 97€ → copie les Price IDs dans `STRIPE_PRICE_S/M/L`.
2. Developers → API keys → `Publishable` (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) + `Secret` (STRIPE_SECRET_KEY).
3. Developers → Webhooks → `https://TON-DOMAINE/api/stripe/webhook`, event `checkout.session.completed` → `STRIPE_WEBHOOK_SECRET`.

### 3. OpenAI

1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → "Create new secret key" → coche les permissions image generation/edit.
2. Colle dans `OPENAI_API_KEY`.
3. Ajoute un budget mensuel dans Settings → Limits — `gpt-image-1` coûte ~$0.04 par photo en `quality=high`.

### 4. SendGrid

1. Settings → Sender Authentication → vérifie `immoscan.fr` (domain auth recommandé) ou `contact@immoscan.fr` (single sender).
2. Settings → API Keys → "Create API Key" → Restricted Access → Mail Send Full → `SENDGRID_API_KEY`.
3. `EMAIL_FROM=contact@immoscan.fr`.

### 5. CRON_SECRET + ORDER_TOKEN_SECRET

```bash
openssl rand -hex 32  # pour CRON_SECRET
openssl rand -hex 32  # pour ORDER_TOKEN_SECRET
```

Une fois Vercel déployé, lance dans le SQL Editor Supabase :

```sql
-- planifie les 2 crons
select public.setup_process_cron(
  'https://airbnb-photo-retouch.vercel.app/api/photos/process',
  '<CRON_SECRET>',
  '* * * * *'        -- toutes les minutes : 1 photo OpenAI par tick
);
select public.setup_deliver_cron(
  'https://airbnb-photo-retouch.vercel.app/api/cron/deliver',
  '<CRON_SECRET>',
  '*/15 * * * *'     -- toutes les 15 min en prod, '* * * * *' en test
);
```

---

## Architecture en 1 schéma

```
┌──────────┐     pay      ┌────────┐     webhook      ┌──────────┐
│ Landing  │ ───────────> │ Stripe │ ──────────────>  │  Order   │
└──────────┘              └────────┘                  │ created  │
                                                      └────┬─────┘
                                                           v
                                                  ┌─────────────────┐
                                                  │ /order/[id]/    │
                                                  │   upload        │ ← drag&drop
                                                  └────┬────────────┘
                                                       │
                                       PUT photos      │
                                  ┌────────────────────┘
                                  v
                           ┌──────────────┐
                           │  Supabase    │
                           │  Storage     │ ─────┐
                           │  "originals" │      │ keep forever (AI training)
                           └──────┬───────┘      v
                                  │           /admin
                                  v
                           ┌──────────────────────┐
                           │ pg_cron: process     │ every minute
                           │ /api/photos/process  │ 1 photo per tick
                           └──────┬───────────────┘
                                  │ POST /v1/images/edits  (gpt-image-1)
                                  v
                           ┌──────────────┐
                           │  OpenAI      │
                           └──────┬───────┘
                                  │ b64_json
                                  v
                           ┌──────────────┐
                           │ Supabase     │
                           │ "enhanced"   │
                           └──────┬───────┘
                                  │ all photos done?
                                  │ → order.status = READY
                                  v
                           ┌──────────────────────┐
                           │ pg_cron: deliver     │ every 15 min
                           │ /api/cron/deliver    │ flips READY → DELIVERED
                           └──────┬───────────────┘ + sends email via SendGrid
                                  v
                         ┌──────────────────────┐
                         │ "Vos photos sont     │
                         │ prêtes" email + link │
                         └──────────────────────┘
```

---

## Trucs à savoir

- **Le délai 48h ouvré + heure random** est dans `lib/business-hours.ts`. `DELIVERY_DELAY_HOURS=0` pour tester immédiat.
- **OpenAI prompt** : default dans `lib/openai-image.ts`, overridable via `OPENAI_IMAGE_PROMPT`. Quality/size aussi.
- **Concurrent processing** : on traite 1 photo par tick (toutes les minutes) parce que `gpt-image-1` prend 25-50s par image et Vercel Hobby capte les fonctions à 60s. Tier S = 1 min, tier M = 5 min, tier L = 20 min. Largement OK avec un délai 48h ouvré.
- **Tous les uploads passent par signed upload URLs Supabase**. Les buckets ne sont jamais lisibles côté client.
- **Admin** : `/admin` accessible aux emails listés dans `ADMIN_EMAILS` (csv).
- **Photos failed** : bouton "Réessayer" sur `/order/[id]` qui les remet en `UPLOADED` pour le prochain tick.
