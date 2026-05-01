# airbnb-photo-retouch

> Hidden SaaS — "Geoffrey, photographe pro retouche tes photos Airbnb en 48h".
> Côté client : portail simple, livraison humaine.
> Côté nous : AutoEnhance.ai fait le travail, on garde les originaux pour entraîner notre IA.

**Stack** : Next.js 15 (App Router) · Supabase (Auth/Storage/Postgres) · Stripe Checkout · AutoEnhance.ai v3 · Vercel (host + cron)

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

1. Crée un projet sur [supabase.com](https://supabase.com) (free tier OK).
2. Project Settings → API → copie `URL`, `anon` et `service_role` keys dans `.env.local`.
3. SQL Editor → colle le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) et exécute.
4. Storage → crée 2 buckets **privés** :
   - `originals` (les photos brutes que les clients uploadent — gardées à vie pour le training IA)
   - `enhanced` (les retouches livrées au client — signed URL 30j)
5. Authentication → Providers → Email → désactive "Confirm email" (magic link only) ou laisse activé selon ta préférence.

### 2. Stripe (~5 min, en mode test au début)

1. Sur [dashboard.stripe.com/test](https://dashboard.stripe.com/test), crée 3 produits :
   - **Geoffrey 1 photo** — prix `7,00 €` one-time → copie le Price ID dans `STRIPE_PRICE_S`
   - **Geoffrey 5 photos** — prix `27,00 €` one-time → `STRIPE_PRICE_M`
   - **Geoffrey 20 photos** — prix `97,00 €` one-time → `STRIPE_PRICE_L`
2. Developers → API keys → copie `Publishable` et `Secret` keys.
3. Developers → Webhooks → "Add endpoint" :
   - URL : `https://TON-DOMAINE/api/stripe/webhook` (en local : utilise [`stripe listen`](https://stripe.com/docs/webhooks/test))
   - Events : `checkout.session.completed`
   - Copie le signing secret dans `STRIPE_WEBHOOK_SECRET`.

**Test local du webhook** :
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. AutoEnhance.ai (~3 min)

1. Crée un compte sur [app.autoenhance.ai](https://app.autoenhance.ai).
2. API page → copie ta clé dans `AUTOENHANCE_API_KEY`.
3. Garde `AUTOENHANCE_DEV_MODE=true` pour le dev (pas de quota brûlé, watermark sur les enhanced).
4. Webhook URL : `https://TON-DOMAINE/api/autoenhance/webhook`, avec un token random dans `AUTOENHANCE_WEBHOOK_TOKEN` (le mettre aussi dans le champ "Authorization value" du dashboard AutoEnhance).

### 4. Resend (optionnel, mais recommandé pour les emails de livraison)

1. Compte sur [resend.com](https://resend.com), domaine vérifié → `RESEND_API_KEY`.
2. Si pas configuré, l'app log juste l'email au lieu de l'envoyer (utile en dev).

### 5. CRON_SECRET

Génère un random : `openssl rand -hex 32` → mets-le dans `CRON_SECRET`.
Vercel l'utilisera automatiquement pour appeler `/api/cron/deliver` toutes les 15 min.

---

## Déploiement Vercel

```bash
npm install -g vercel
vercel link
vercel env pull .env.local                  # pour récupérer les envs après les avoir set
vercel --prod
```

Ou plus simple : lie le repo GitHub à Vercel via l'interface web, et configure les env vars dans Settings → Environment Variables.

⚠️ **Le cron Vercel** (`vercel.json`) ne se déclenche que sur les déploiements Production, pas Preview.

---

## Architecture en 1 schéma

```
┌──────────┐     pay      ┌────────┐     webhook      ┌──────────┐
│ Landing  │ ───────────> │ Stripe │ ──────────────>  │  Order   │
└──────────┘              └────────┘  checkout.       │ created  │
                                       session.       └────┬─────┘
                                       completed           │
                                                           v
                                                     ┌──────────┐
                                                     │ /upload/ │
                                                     │  [orderId]│ ← drag&drop
                                                     └────┬─────┘
                                                          │
                                          PUT photos      │
                                     ┌────────────────────┘
                                     v
                              ┌──────────────┐
                              │  Supabase    │
                              │  Storage     │ ─────┐
                              │  "originals" │      │ keep forever (AI training)
                              └──────┬───────┘      │
                                     │              v
                                     │ POST       /admin
                                     v
                              ┌──────────────┐
                              │ AutoEnhance  │
                              │     v3       │
                              └──────┬───────┘
                                     │ webhook image_processed
                                     v
                              ┌──────────────┐
                              │ Supabase     │
                              │ "enhanced"   │
                              └──────┬───────┘
                                     │ all done?
                                     │ → status = READY
                                     │ scheduled_delivery_at
                                     │  = upload_at + 48 business hours,
                                     │    randomized in [9h, 19h] Paris
                                     v
                              ┌──────────────┐
                              │ Vercel cron  │ every 15 min
                              │  /deliver    │ → flip DELIVERED + email
                              └──────┬───────┘
                                     v
                            ┌──────────────────┐
                            │ "Geoffrey a fini"│
                            │  email + zip dl  │
                            └──────────────────┘
```

---

## Trucs à savoir

- **AUTOENHANCE_DEV_MODE=true** : gratuit, mais les enhanced auront un watermark. Set `false` quand tu veux passer en prod réelle (et que tu as crédité ton compte AutoEnhance).
- **Le délai 48h ouvré + heure random** est implémenté dans `lib/business-hours.ts`. Tunable.
- **Tous les uploads passent par Supabase Storage avec RLS**. Le bucket `originals` n'est jamais lisible côté client : on signe les URLs côté serveur.
- **Admin** : `/admin` accessible aux emails listés dans `ADMIN_EMAILS` (csv).
- **Quand tu accumules assez d'images** dans `originals`, tu peux les exporter en bulk depuis le bucket Supabase pour ton training set.
