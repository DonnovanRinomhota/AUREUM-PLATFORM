# AUREUM Platform

A multi-shop point-of-sale + back-office web app, backed by Supabase (database + sign-in) and hosted on Vercel.
Customers subscribe by card (Stripe): **$5 per shop, per month**.

## Structure

```
backoffice.html        → management dashboard (products, stock, staff, purchasing, reports, settings)
pos-checkout.html      → the till (cashier checkout, shifts, refunds, receipts)
admin.html             → platform control panel at /admin (accounts, trials, subscriptions)
sw.js, offline.html    → offline support (apps open with no internet once loaded)
manifest*.webmanifest  → makes the Back Office and POS installable as apps
icons/, vendor/        → app icons; fonts and libraries hosted by AUREUM (see vendor/LICENSES.md)
supabase/              → database SQL files + edge functions
site-src/              → source of the public website (build with node tools/build-site.mjs); output: index.html + features/ pricing/ about/ support/ + site/assets/
help-bot/              → AUREUM Bot: kb.js (the help library) + engine.js (the search engine); no AI, no internet
tools/                 → build-bot.mjs (copies the Bot into backoffice.html after you edit help-bot/)
vercel.json            → redirects, /admin route, headers
```

## SQL to run in Supabase (SQL Editor), once each, in this order
`schema.sql` → `billing-schema.sql` → `admin-schema.sql` → `data-safety.sql` → `shop-billing.sql` → `support-schema.sql`

## Guides
- `SETUP-INSTRUCTIONS.md` — first-time setup
- `SITE-GUIDE.md` — the public website (pages, buttons, editing, pictures)
- `SETUP-HELP.md` — AUREUM Bot (built-in help) and support tickets
- `SETUP-BILLING.md`, `SETUP-ADMIN.md`, `SETUP-DATA-SAFETY.md`, `SETUP-EMAIL-TEMPLATE.md`
- `SETTINGS-GUIDE.md` — what every Settings switch does
- `SHIFTS-GUIDE.md` — how shifts, closing and refunds work
- `IMPORT-AND-IMAGES.md` — importing products from Excel/CSV, and product pictures
- `CHANGELOG.md` — what changed in each phase

## Security note
Never commit Stripe or Paynow **secret** keys. They belong only in Supabase secrets, used by the edge functions.
