# Making AUREUM live — step by step

Your two files (`pos-checkout.html` and `backoffice.html`) already had a real
backend designed into them (Supabase for data/auth, Stripe for cards, Paynow
for EcoCash/OneMoney) — it was just switched off, running on browser-only
`localStorage`. This package turns that on. Total time: ~30–45 minutes.

## What you're building

- **Supabase** = your database + login system (free tier is plenty to start)
- **Stripe** = card payments (you'll need a Stripe account)
- **Paynow** = EcoCash/OneMoney payments (you'll need a Paynow merchant account)
- **Netlify** = free hosting so the site has a real URL, works on any device,
  and both files can talk to each other

---

## 1. Create the Supabase project

1. Go to https://supabase.com → sign up (free) → **New project**.
2. Pick any name/region/password (save the DB password somewhere safe).
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this package, copy all of it, paste it in, click **Run**.
3. You should see "Success. No rows returned." This created 4 tables
   (`businesses`, `profiles`, `business_data`, `payment_settings`) with the
   correct security rules already applied.

## 3. Get your project URL + anon key

In Supabase: **Project Settings → API**. Copy:
- **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
- **anon / public key** (a long string starting with `eyJ...`)

These two are safe to put in client-side code — paste them into **both** files:

- `pos-checkout.html` — search for `SUPABASE_CONFIG` (around line 900)
- `backoffice.html` — search for `SUPABASE_CONFIG` (around line 2467)

```js
const SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJ...'
};
```

## 4. Deploy the 3 payment functions (Edge Functions)

These handle Stripe and Paynow — they must run server-side because that's
where the secret keys live (never in the HTML).

1. Install the Supabase CLI (needs Node.js):
   ```
   npm install -g supabase
   ```
2. From inside this package's folder, log in and link your project:
   ```
   supabase login
   supabase link --project-ref xxxxxxxx
   ```
   (`xxxxxxxx` is the ID in your project URL.)
3. Deploy all three functions:
   ```
   supabase functions deploy create-payment-intent
   supabase functions deploy paynow-initiate
   supabase functions deploy paynow-poll
   ```
That's it — no extra secrets to set. Each function looks up the *business's
own* Stripe/Paynow keys from the `payment_settings` table at request time
(see step 6), so multiple shops could each connect their own accounts later.

## 5. Add your Stripe publishable key to the POS file

- Get it from https://dashboard.stripe.com → **Developers → API keys**
  (`pk_live_...` or `pk_test_...` to try it safely first).
- In `pos-checkout.html`, find `STRIPE_CONFIG` (near `SUPABASE_CONFIG`) and paste it:
  ```js
  const STRIPE_CONFIG = {
    publishableKey: 'pk_test_...',
    createIntentUrl: 'https://xxxxxxxx.supabase.co/functions/v1/create-payment-intent'
  };
  ```
  (`createIntentUrl` already auto-fills once `SUPABASE_CONFIG.url` is set — just
  confirm it matches.)

## 6. Create your account and connect payments

1. Open `backoffice.html` in a browser (double-click the file, or once
   hosted, visit the URL).
2. On the sign-in screen, switch to **Create Business**, fill in your
   business name, your name, email, password → this creates your Supabase
   login (`owner` role) automatically.
3. Go to **Settings → Payment Integrations** and paste in:
   - Stripe **secret key** (`sk_test_...` / `sk_live_...`) and publishable key
   - Paynow **Integration ID** and **Integration Key** (from your Paynow
     merchant dashboard → Integrations)
4. Open `pos-checkout.html` and sign in with the same email/password — it
   now reads/writes the same live products, stock, staff, and receipts as
   the Back Office, from any device.

> Test with Stripe's test key + card `4242 4242 4242 4242` (any future date,
> any CVC) and Paynow's sandbox integration before switching to live keys.

## 7. Put it online (Netlify, free)

1. Go to https://app.netlify.com/drop
2. Drag the folder containing both `pos-checkout.html` and `backoffice.html`
   onto the page.
3. Netlify gives you a live URL immediately (e.g. `random-name-123.netlify.app`).
   Rename it in **Site settings → Change site name** if you like.
4. Bookmark `yoursite.netlify.app/backoffice.html` for management and
   `yoursite.netlify.app/pos-checkout.html` for the till — or open the POS
   from inside the Back Office with the "Open POS" button.

From here, every teammate you add in Back Office → Staff can sign into the
POS from their own device or tablet, and everything stays in sync live.

## Notes / things to sanity-check before going fully live

- **Paynow integration**: the `paynow-initiate` / `paynow-poll` functions
  follow Paynow's published Express Checkout (mobile-only) API, but payment
  gateway APIs do change — test a real EcoCash sandbox transaction end to
  end before taking real customer payments.
- **Stripe keys**: right now the POS uses one Stripe publishable key baked
  into the file (fine for one shop). If you later want each of several
  shops to use their *own* Stripe account automatically, that key would
  need to load from `payment_settings` at sign-in instead — happy to wire
  that up if you get there.
- Keep `pos-checkout.html` and `backoffice.html` in the same folder — the
  Back Office's "Open POS" button expects that.
