# Billing & Subscription — $5 per shop, per month (card only)

AUREUM (your platform) charges **your customers** through **your** Stripe account:
**$5 per shop, per month**. Card details are typed on Stripe's own page and never touch your server or database.

| Situation | What happens |
|---|---|
| Free trial | Every shop is included, however many. |
| Subscribing | Checkout charges **$5 × the number of shops** (read from the database, not from the browser). |
| Adding a shop on a paid plan | The owner sees "$10 → $15 a month", confirms, Stripe charges the prorated amount **immediately**, and **only then** is the shop added. A declined card = no shop. |
| Removing a shop | The next invoice drops by $5 (no refund for the month already paid). |
| Paynow | **No longer accepted** for subscriptions. People already paid up on Paynow keep access until their period ends and are asked to subscribe by card. |

## 1. Run the database SQL (once)
Supabase → SQL Editor → run, in this order (skip any you already ran): `schema.sql` → `billing-schema.sql` → `admin-schema.sql` → `data-safety.sql` → **`shop-billing.sql`**.

`shop-billing.sql` adds `shops_paid` (what the subscription covers) and `shop_count`, and a database rule so that **a paid card subscription cannot add a shop it hasn't paid for — even by editing data directly.**
It never blocks trials, complimentary accounts, removing shops, or a business that already has more shops than it pays for.

## 2. Stripe account and secrets
Create a Stripe account at https://stripe.com (use **test mode** first). Set these as Supabase **secrets** (never in the app files):
```
supabase secrets set PLATFORM_STRIPE_SECRET_KEY=sk_test_...
supabase secrets set PLATFORM_STRIPE_WEBHOOK_SECRET=whsec_...      # from step 4
```

## 3. Deploy the functions
```
supabase functions deploy billing-stripe-checkout
supabase functions deploy billing-stripe-portal
supabase functions deploy billing-stripe-webhook --no-verify-jwt
supabase functions deploy billing-stripe-shops          # NEW: adding / updating / lowering shops
```
**Remove the Paynow billing functions** (no longer used):
```
supabase functions delete billing-paynow-initiate
supabase functions delete billing-paynow-webhook
```
(`paynow-initiate` / `paynow-poll` / `create-payment-intent` are older, separate functions and are not part of subscriptions.)

## 4. Stripe webhook
Stripe → Developers → Webhooks → Add endpoint → URL = your `billing-stripe-webhook` function URL. Listen for these **five** events:
`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, **`customer.subscription.updated`** (new), `customer.subscription.deleted`.
Copy the signing secret into `PLATFORM_STRIPE_WEBHOOK_SECRET`.

## 5. Customers who subscribed before this change
They were paying a flat $5. Nothing is forced on them:
- Their subscription covers **1 shop** (that is what $5 bought). Everything keeps working, including shops they already have.
- Settings → Billing shows a calm banner and an **"Update subscription to cover all N shops — $X/month"** button. Pressing it charges the prorated difference once.
- They **cannot add a further shop** without paying for it.
- If you'd rather bill them for their existing shops, ask them to press that button (or tell me and I can add an admin action for it).

## 6. Test it (Stripe test mode)
Use card `4242 4242 4242 4242`, any future date, any CVC.
1. New business, 3 shops, trial → Settings → Billing → **Subscribe with card — $15/month (3 shops × $5)** → pay. Billing now shows "$15 / month · 3 shops".
2. Settings → Stores → **Add store** → the dialog shows $15 → $20 → **Pay & add shop**. The shop appears; an extra small invoice shows in your Stripe dashboard and under Payment history.
3. Decline test: Stripe card `4000 0000 0000 0341` (saves fine, then fails to charge). Add a shop → it is declined, the message is shown, **no shop is added**.
4. Remove a shop → a few seconds later you are told the plan drops from the next payment; Stripe's quantity goes down with no charge.
5. Open the app signed in as a **non-owner**: they cannot subscribe or add paid shops.

## 7. Going live
Switch Stripe to live mode, replace the secrets with the live ones (`sk_live_...`, the live webhook `whsec_...`), recreate the webhook endpoint in live mode, and redeploy.

## Good to know
- The shop limit is enforced by the **database**, so it can't be bypassed from the browser.
- Adding a shop mid-month creates a small *proration* invoice. The webhook records it as a payment but does **not** treat it as a new billing period.
- App-store builds (`?store=1`) never show payment buttons: adding a shop that needs payment tells the owner to manage the subscription from their account on the web.
