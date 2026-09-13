# Setting up Billing & Subscription (Phase 6)

This is AUREUM (your platform) charging **your customers** $5.00/month —
completely separate from the in-store checkout, which no longer processes
real payments at all. Card/mobile details are entered on Stripe's or
Paynow's own page and never touch your server.

You don't have Stripe or Paynow accounts yet, so start there.

## 1. Run the new database schema

1. Supabase dashboard → **SQL Editor** → New query
2. Paste in `supabase/billing-schema.sql` (from this package), run it.

## 2. Create your Stripe account (for card payments)

1. Sign up free at https://dashboard.stripe.com/register
2. Once in, go to **Developers → API keys**. Copy the **Secret key**
   (`sk_test_...` while testing, `sk_live_...` when ready for real charges).
3. You'll set this as a secret in step 4 below — **not** pasted into any
   file.

## 3. Create your Paynow account (for EcoCash/OneMoney/cards/ZimSwitch/InnBucks)

1. Sign up at https://www.paynow.co.zw as a merchant (needs your business
   and bank details for payouts).
2. Once approved, go to **Integrations** in your Paynow merchant
   dashboard → create a new integration → copy the **Integration ID** and
   **Integration Key**.

## 4. Set the secrets (platform-level — these are YOURS, not per-customer)

Using the Supabase CLI, from this project folder:

```bash
supabase secrets set PLATFORM_STRIPE_SECRET_KEY=sk_test_...
supabase secrets set PLATFORM_PAYNOW_INTEGRATION_ID=your_integration_id
supabase secrets set PLATFORM_PAYNOW_INTEGRATION_KEY=your_integration_key
```

(You'll add `PLATFORM_STRIPE_WEBHOOK_SECRET` in step 6, after Stripe gives
it to you.)

## 5. Deploy the 5 new billing edge functions

```bash
supabase functions deploy billing-stripe-checkout
supabase functions deploy billing-stripe-webhook
supabase functions deploy billing-stripe-portal
supabase functions deploy billing-paynow-initiate
supabase functions deploy billing-paynow-webhook
```

## 6. Connect Stripe's webhook (this is what makes renewals automatic)

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL:
   ```
   https://pizwuzwkzfwgfjeolmqp.supabase.co/functions/v1/billing-stripe-webhook
   ```
3. Select these events: `checkout.session.completed`, `invoice.paid`,
   `invoice.payment_failed`, `customer.subscription.deleted`
4. Save, then copy the **Signing secret** (`whsec_...`) it gives you.
5. Set it as a secret:
   ```bash
   supabase secrets set PLATFORM_STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. Redeploy the webhook function so it picks up the new secret:
   ```bash
   supabase functions deploy billing-stripe-webhook
   ```

Paynow doesn't need a separate webhook setup step — the `resulturl` is
already wired into the `billing-paynow-initiate` function automatically.

## 7. Test it

- **Stripe**: while your secret key is still `sk_test_...`, use test card
  `4242 4242 4242 4242`, any future date, any CVC.
- **Paynow**: use their sandbox/test integration if they provide one
  before switching to your live integration.

Go to Back Office → Settings → Billing & Subscription, click **Pay with
Card (Stripe)** or **Pay with Paynow**, and confirm:
- The payment completes on Stripe's/Paynow's own page
- You're redirected back and the status updates to "Active"
- A row appears in Payment History
- The "Current period ends" date is exactly one month out

## Honest limitation worth knowing

Stripe subscriptions **auto-renew** every month automatically (that's
what the webhook is for). **Paynow does not** — there's no "charge saved
card automatically" concept for EcoCash/OneMoney/most Paynow methods.
Each period, the business owner (or a reminder banner a few days before
the period ends, which is already built in) needs to actively pay again
via the same "Pay with Paynow" button. This is a real constraint of how
Paynow works, not a bug.

## When you're ready for real charges

Swap `PLATFORM_STRIPE_SECRET_KEY` for your `sk_live_...` key, switch your
Paynow integration from test to live, and redeploy:
```bash
supabase secrets set PLATFORM_STRIPE_SECRET_KEY=sk_live_...
supabase functions deploy billing-stripe-checkout
```
