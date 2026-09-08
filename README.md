# AUREUM Platform

A point-of-sale + back-office web app, backed by Supabase (database + auth),
with Stripe (card) and Paynow (EcoCash/OneMoney) payments.

## Structure

```
pos-checkout.html      → the till (cashier-facing checkout screen)
backoffice.html         → management dashboard (products, stock, staff, reports, settings)
supabase/schema.sql     → database schema + security rules — run once in Supabase
supabase/functions/     → 3 edge functions (Stripe + Paynow payment processing)
SETUP-INSTRUCTIONS.md   → full step-by-step setup guide — start here
```

## Quick start

See [SETUP-INSTRUCTIONS.md](./SETUP-INSTRUCTIONS.md) for the full walkthrough
(create Supabase project → run schema → deploy functions → connect Stripe/Paynow → host it).

Once set up:
- Host `pos-checkout.html` and `backoffice.html` anywhere static (Netlify,
  Vercel, GitHub Pages — see below for GitHub Pages).
- Open `backoffice.html` first to create your business account.
- Staff sign into `pos-checkout.html` with accounts created in Back Office → Staff.

## Deploying this repo with GitHub Pages (free, alternative to Netlify)

1. Push this repo to GitHub (see below).
2. In the repo: **Settings → Pages → Source → Deploy from a branch → `main` / `(root)`**.
3. Your site will be live at `https://<your-username>.github.io/AUREUM-PLATFORM/backoffice.html`
   (and `/pos-checkout.html` for the till).

## Security note

Never commit real Stripe or Paynow **secret** keys into this repo — those
belong only in the Back Office's Settings screen (stored in Supabase, used
server-side by the edge functions). Only the Stripe *publishable* key and
the Supabase project URL/anon key are safe to have in these HTML files.
