> **PAUSED (v89).** In-app Google Play subscribing is switched off; subscriptions are web-only. Nothing below is needed. To bring it back: set `PLAY_BILLING_ENABLED = true` in backoffice.html, re-add the `@capgo/native-purchases` plugin and the `com.android.vending.BILLING` permission to the Back Office Android project, and follow the steps below.

# Google Play Billing — setup (Back Office Android app)

Nothing here is live until you do these steps. None of it can be tested end-to-end without Google Play, so the final check is a **license-tester purchase on a real device** (step 7).

## What it does
- One shop = one monthly subscription, product ids `aureum_shop_1` … `aureum_shop_10`, base plan id `monthly`, price $5.
- The app buys through Google Play's own sheet, then calls the `billing-play` Supabase function. The function asks Google (Play Developer API) whether each purchase is valid, acknowledges it, and only then sets the business to `billing_processor='google_play'`, `shops_paid = number of active shop subscriptions`.
- Each purchase carries `appAccountToken` = SHA-256 of the business id, so a purchase cannot be claimed by another business.
- Optional: Google's real-time notifications (RTDN) keep renewals/cancellations current even when the app is closed. Without it the app syncs whenever it is opened.

## Steps
1. **Supabase SQL Editor:** run `supabase/google-play-billing.sql` (after `shop-billing.sql`). Safe to re-run.
2. **Play Console → Monetize → Subscriptions:** create 10 subscriptions `aureum_shop_1` … `aureum_shop_10`, each with one base plan id `monthly` (auto-renewing, 1 month, $5.00, set prices for your countries), then **Activate** them. (Start with 2–3 if you prefer; the app limit is the number you create — tell me if it differs from 10.)
3. **Google Cloud:** create a service account, enable the *Google Play Android Developer API*, and in Play Console → Users and permissions invite the service account email with *View financial data* and *Manage orders and subscriptions*. Create a JSON key. **Never paste the key in chat.**
4. **Supabase → Edge Functions → Secrets** (set yourself): `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (the JSON key), `PLAY_WEBHOOK_KEY` = any long random string, and optionally `PLAY_PACKAGE_NAME` (defaults to `com.aureum.backoffice`).
5. **Deploy** the function `billing-play` (`supabase functions deploy billing-play`). Deploy it with **Verify JWT turned OFF** (`--no-verify-jwt`): the function checks the signed-in owner's session itself, and Google's notifications are authorised by `PLAY_WEBHOOK_KEY`.
6. *(Optional, recommended)* Pub/Sub: create a topic, give `google-play-developer-notifications@system.gserviceaccount.com` Publisher on it, add a **push** subscription to `https://<project>.supabase.co/functions/v1/billing-play?key=<PLAY_WEBHOOK_KEY>`, then set the topic in Play Console → Monetization setup → Real-time developer notifications.
7. **Rebuild the Back Office app** (it now includes the billing plugin and the `BILLING` permission): bump `AUREUM_VERSION_CODE` above your last upload, build the .aab, upload to a closed/internal track. Add your Gmail as a **license tester** (Play Console → Settings → License testing) and test: subscribe 1 shop, add a second, cancel in Google Play, and check Settings → Billing updates.
8. Play policy: the app may now sell the subscription through Google Play. Keep the data-safety form and store listing consistent (subscription $5/shop/month, cancel in Google Play).

## Notes
- Web (card/Stripe) subscribers are unchanged. A business already paying by card is told so instead of being sold a second subscription.
- Prices Google shows may be in the user's local currency; the app text says "$5".
- Google takes its service fee on these subscriptions (typically 15% for subscriptions).
