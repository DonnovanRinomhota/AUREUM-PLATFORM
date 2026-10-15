# Google Play submission checklist (both apps)

**Status: drafts only. Nothing has been submitted. Re-check every item against the live Play policy on the day you submit.**

## A. Account type: personal (created after Nov 2023)
Before you can publish to Production you must run a **closed test with at least 12 testers opted in for 14 continuous days**, then apply for production access in the Console. Start this early, once per app:
1. Create the app in Play Console (name, language, App or Game = App, Free).
2. Testing → Closed testing → create a track, upload the `.aab`, add a tester list (12+ real people's Google emails), share the opt-in link.
3. Keep them opted in 14 days, then Dashboard → "Apply for production".
Target API: the builds target **API 36** (meets the August 2026 requirement; re-verify at submission).

## B. Same for both apps (do once per app)
- [ ] Unique application ID (`com.aureum.pos`, `com.aureum.backoffice`), upload `.aab` signed with the upload key (`docs/SIGNING.md`).
- [ ] Privacy policy URL: `https://aureum-platform.vercel.app/privacy/` (deploy the site first).
- [ ] Account deletion URL (App content → Data safety → Account deletion): `https://aureum-platform.vercel.app/delete-account/`.
- [ ] Support email: **needs your real address** (shown publicly on the store page). Also add it in `site-src/config.js` (`SUPPORT.email`) and run `node tools/build-site.mjs` so the policy pages show it.
- [ ] App category: Business. Content rating questionnaire (answer truthfully: no violence, no user-generated public content).
- [ ] Target audience: 18+ (business tool, not for children).
- [ ] Ads: **No ads**.
- [ ] App access: reviewers need a login. Create a demo business account and give the credentials in Play Console → App content → App access (an account with sample data, not your real business).
- [ ] Store listing: icon (from `play-store/icon-512.png`), feature graphic (`play-store/feature-graphic-1024x500.png`), **phone screenshots (min 2) that you capture from the running app** (install the debug APK; I cannot fabricate screenshots), 7-inch and 10-inch tablet screenshots recommended.
- [ ] Subscriptions/payments: the apps are **status-only** (no payment buttons or wording that steers to outside payment); subscriptions are taken on the website. Answer the Console's payments declarations honestly and expect review questions. If Google requires Play Billing for this, that is a separate build.
- [ ] Data safety form: see section D (verify each answer yourself).
- [ ] Release notes, then Send for review. Do not publish before the 14-day test.

## C. Store listing drafts
### AUREUM Back Office (`com.aureum.backoffice`)
- Short description (≤80): *Run your shops from your phone: stock, sales, staff and reports.*
- Full description: AUREUM Back Office is the management side of AUREUM POS & Inventory. See sales and profit at a glance, manage products and stock across shops, receive goods and create purchase orders, transfer stock, track customers and suppliers, schedule staff, review receipts and refunds, and read your accounts and reports. Works with the AUREUM POS app on your counter. Your subscription is managed from your account on the AUREUM website.
### AUREUM POS (`com.aureum.pos`)
- Short description (≤80): *Fast checkout for your shop: scan, sell, print receipts, close shifts.*
- Full description: AUREUM POS is the checkout side of AUREUM. Cashiers sign in with a name and PIN, scan barcodes with the camera or a scanner, build the cart, apply discounts, take cash, card or mobile-money payments, and give receipts by Bluetooth printer or share. Open the cash drawer after cash sales, run shifts and cash-up, and keep selling when the connection drops: sales are saved and sync automatically. Needs an AUREUM account created in the Back Office.

## D. Data safety draft (based on code review; confirm before submitting)
| Question | Draft answer |
|---|---|
| Collects data? | Yes |
| Shared with third parties? | No sale or advertising sharing. Processors (Supabase, Vercel, Stripe on web) act on our behalf; declare as "service providers / not shared" per Console wording |
| Encrypted in transit | Yes (HTTPS) |
| Users can request deletion | Yes (URL above) |
| Personal info: name, email | Collected, required for account; app functionality, account management |
| Personal info: phone, address | Optional, entered by the business for its customers/staff; app functionality |
| Financial info: purchase history | Sales records the business creates; app functionality. Card numbers are NOT collected (Stripe page on the web) |
| Photos | Optional product/logo images the user chooses; app functionality |
| App activity / diagnostics / location / contacts / audio | Not collected by AUREUM code (no analytics/ads SDK found in the web code or the Android plugins; re-verify with `npm ls` and a manifest review at release) |
| Device or other IDs | Not collected for ads. Sign-in session tokens only |
Camera permission: barcode scan only (nothing saved or uploaded). Bluetooth: printer/drawer only.
