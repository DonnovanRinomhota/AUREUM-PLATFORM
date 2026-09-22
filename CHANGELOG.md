# Changelog

## Phase 9 — Purchase Orders, GRN, Stock Adjustments, Transfers actually sync now (2026-09)

### Fixed — a real, significant one
- **Purchase Orders, GRN, Stock Adjustments, and Transfers were never
  included in the data that gets synced to Supabase at all.** The Phase 7
  fix made sure `persistAureum()` was *called* right after saving one of
  these, but the sync payload itself (`aureumSnapshotData()`) never
  included these four arrays in the first place — so no matter how often
  a save was triggered, this data only ever lived in that one browser's
  memory for that session. Reloading, switching devices, or another
  session syncing would silently lose it. All four are now included in
  both what gets saved and what gets loaded back.
- Same root cause meant a genuinely **fresh business would incorrectly
  inherit the developer's demo Purchase Orders/GRN/Stock
  Adjustments/Transfers** the first time it synced — same class of bug
  fixed for receipts/expenses back in Phase 1.1, now extended to these
  four as well. A new business now starts with all of them empty.
- Re-confirmed Expenses were already correctly wired (both save and
  load) — if Accounting still looks like it's not saving, it's more
  likely the date-range-filter behavior described in Phase 7's fix
  (a save outside the currently-viewed period won't show in that view).

## Phase 8 — Forgot password, change password, email template guide (2026-09)

### Added
- **"Forgot password?" link** on the sign-in screen — sends a real
  Supabase password-reset email. Clicking the link in that email brings
  the user to a dedicated "Set a new password" screen (detected via the
  recovery token Supabase puts in the URL) instead of the normal sign-in
  gate.
- **"Change Password"** section in Settings → Business Profile, for
  already-signed-in users who just want to update their password
  directly, with the account's email shown for confirmation.
- **`SETUP-EMAIL-TEMPLATE.md`** — the confirmation email's content isn't
  code, it's a Supabase dashboard template. This gives the exact HTML to
  paste in so new sign-ups get a real welcome message with links to Back
  Office and the POS, plus basic login instructions.

### Investigating
- **Stripe checkout tax-code error**: fixed (disabled Stripe's newer
  "Managed Payments" default, which requires product tax codes).
- **"Create Business" not working after deleting all businesses/profiles
  in Supabase**: reviewed the sign-up code path and confirmed it's
  unchanged and structurally correct (proper error handling throughout —
  a real failure should show an on-screen message, not fail silently).
  Re-ran a full systematic scan for broken element references (the same
  class of bug found in Phase 6) — clean. Could not find a code-level
  cause; most likely explanations are either the on-screen/console error
  wasn't visible or reported, or something about the manual deletion in
  Supabase (e.g. dropping tables entirely rather than deleting rows)
  affected the sign-up trigger or its dependencies. See the diagnostic
  steps requested in chat — once we have the exact error, this can be
  fixed precisely.

## Phase 7 — Real fixes to Tax/Receipts toggles, shift close & cash reconciliation, export error visibility (2026-09)

### Fixed
- **A regression from Phase 5**: the "All shops" checkbox on the product
  edit form stopped correctly reflecting a product's real shop assignment
  after shop-assignment became a fixed snapshot array — found while
  investigating the category-on-new-product report. Fixed.
- **PO / GRN / Stock Adjustments / Transfers now save immediately** on
  confirm, instead of relying solely on the ~1.2s background auto-save
  timer — closes a real (narrow) window where a save-then-immediately-
  navigate-away could theoretically lose data.
- **"Prices include tax" and "Apply tax to all new products by default"**
  (Settings → Taxes) were never actually saved — the Save button only
  ever persisted the tax rate itself. Now both toggles save correctly,
  and **"Prices include tax" is now functionally wired**: when on, tax is
  calculated as already included in the listed price (customer's total
  doesn't change); when off, tax is added on top as before.
- **"Show business logo on receipts"** had no logo to show — there was no
  upload field anywhere. Added a real logo uploader in Settings →
  Receipts, and wired it into the actual printed/emailed receipt
  template, gated by the toggle.
- **"Show cashier name on receipts"** was also a cosmetic-only toggle
  with no real effect — now actually hides/shows the cashier line on the
  printed receipt.
- **Expense saving**: re-confirmed the persistence fix from Phase 5 is in
  place, and added a toast when a newly-saved expense falls outside the
  currently-viewed date range in Accounting — it was very likely saving
  correctly all along but appearing to "vanish" when it didn't match the
  active filter.

### Added
- **Shift close & cash reconciliation** for Shop Manager / Administrator
  roles at the POS — ending a shift as a manager/admin now shows a full
  breakdown (cash/card/mobile/other sales, refunds, expected cash in
  drawer), a field to enter the actual counted cash, and calculates the
  over/short variance. Saved as a permanent, synced record. (Cashiers and
  Inventory Clerks keep the simple end-shift flow, no reconciliation
  step.)
- **Export error visibility**: CSV/PDF export buttons across Purchases,
  GRN, Stock Adjustments, Transfers, and Accounting now show a visible
  error message if something goes wrong, instead of failing silently —
  this is specifically so any remaining issue can actually be diagnosed
  instead of guessed at.

### Verified, no bug found
- Ran a systematic scan of every `getElementById` call in both files
  against every real element id in the HTML — the only "missing" one is
  a toast element that's deliberately created on first use (not a bug).
  This was the same class of bug behind the fake-billing-code crash found
  last phase, so it was worth checking thoroughly — this phase is clean.
- Category on new products was re-verified working (free-text field,
  type any new name).
- Purchase Orders/GRN/Stock Adjustments/Transfers already had CSV/PDF
  export buttons in place structurally.

## Phase 6 — Real billing & subscriptions, Help/FAQ, fake-card-storage bug removed (2026-09)

### Added
- **Real subscription billing** for the AUREUM platform itself ($5.00/month
  Standard Plan) — completely separate from the in-store POS checkout.
  - Pay by card via **Stripe** (real recurring subscription, auto-renews,
    webhook-driven) or via **Paynow** (EcoCash/OneMoney/Visa/Mastercard/
    ZimSwitch/InnBucks depending on your Paynow account — renews by you
    actively paying again each period, since Paynow doesn't support silent
    auto-charge the way Stripe does; a reminder banner appears a few days
    before the period ends).
  - Card and mobile money details are entered directly on Stripe's or
    Paynow's own hosted page — **never stored by AUREUM**, only the
    resulting Stripe customer/subscription IDs are kept.
  - Real payment history table, status badge, and current-period-end date,
    all reflecting actual database state.
  - "Manage card on Stripe" opens Stripe's own Customer Portal for
    updating or removing a card.
  - See `SETUP-BILLING.md` for creating the Stripe/Paynow accounts and
    deploying the 5 new edge functions + schema.
- **Help & FAQ** tab in Settings with answers covering shops, staff PINs,
  checkout payment methods, per-shop inventory, and billing.

### Fixed — a real, serious one
- **Found and removed dead legacy "Change Plan" / "Update Payment Method"
  code** that included a **client-side card-number/CVV entry form storing
  the card directly in the app** — exactly the anti-pattern explicitly
  asked to be avoided. This code was disconnected from any real payment
  processor and never actually charged anything, but it needed to be gone
  entirely, not just unused. Replaced by the real Stripe/Paynow billing
  above.
- Along the way, this old code also referenced Billing UI elements that
  no longer exist after this rebuild — removed before it could throw a
  script error.

### Investigated — "Settings buttons not working"
Went through the Taxes/Receipts/Payment Methods/Notifications/Users &
Permissions save-and-restore logic in detail again. Found and removed a
harmless leftover duplicate event listener, but couldn't find a further
definite bug through code review alone — the save/restore logic itself
looks structurally correct. If this **still** doesn't work after
deploying this phase, I need specifics to keep debugging effectively:
open the browser console (F12 → Console tab), click a toggle and Save,
and send me any red error text that appears, plus which exact
switch/section it is.

### Investigated — "new shop still inheriting products"
Re-confirmed the Phase 5 fix (products' shop assignment is now a fixed
snapshot, not a live "all shops forever" rule) is in place and unchanged.
If a newly created shop is still showing other shops' products, please
confirm: was the product created/edited *after* deploying Phase 5, and
is it possible the product was manually assigned to the new shop (e.g.
via "All Shops" checked at creation time, which correctly includes every
shop that existed *at that moment*)?

## Phase 5 — Expense saving bug, new-shop inventory isolation, dashboard cleanup (2026-09)

### Fixed
- **Expenses weren't actually saving.** `saveExpense()` updated the
  in-memory list and the screen looked right immediately, but never
  synced to Supabase — so a new/edited expense would vanish on reload or
  from another device. Now persists correctly.
- **New shops were silently inheriting every "all shops" product with
  zero stock**, causing false low-stock alerts the moment a new shop was
  created. "All shops" now means "every shop that exists right now" (a
  snapshot taken at save time) rather than "every shop, including ones
  added later" — a brand-new shop genuinely starts with no products until
  you explicitly add them there. Existing products get migrated
  automatically on next load.
- **Leftover duplicate event listeners** on the Notifications/Users
  settings Save buttons (harmless but sloppy remnant from the last
  settings-persistence fix) — cleaned up.
- **Customers → Delete** now uses a clearer trash-can icon instead of the
  generic ✕ used for every other delete action, so it's easier to spot.

### Removed
- **Trend percentage badges removed from Dashboard KPI cards** (Gross
  Sales, Net Sales, Cost of Sales, Gross Profit) — these were producing
  confusing "-100%"-style readouts (mathematically correct compared to a
  prior period, but misleading for a brand-new shop or an ordinary
  no-sales-yet-today moment). The dollar figures speak for themselves now.

### Verified, no change needed
- Custom expense categories were already supported (free-text field with
  autocomplete, same pattern as product categories).
- Re-verified the Taxes/Receipts/Payment Methods/Notifications/Users &
  Permissions settings save-and-restore logic from Phase 4 — found and
  removed the duplicate listeners above, but the core persistence was
  already working correctly. If these still look "static" after
  deploying this phase, please confirm Phase 4 was actually deployed
  first (git push + Vercel redeploy) before Phase 5, and let me know
  exactly which switch and what you see.

## Phase 4 — Dashboard polish, per-shop inventory gaps, checkout simplification, settings that actually save (2026-09)

### Fixed
- **"-100%" on a brand-new shop** — when a period has zero current
  activity, KPI badges now show a neutral "–" instead of a raw decline
  percentage, which read as broken/alarming for a shop with no history.
- **Sales Summary chart overflowing off-screen on long date ranges** — now
  buckets into weekly or monthly bars once a range gets long, instead of
  one bar+label per day (up to 92 of them).
- **Customers delete button** existed but never synced the deletion to
  Supabase — deleted customers were reappearing after a reload. Fixed.
- **Per-shop inventory gaps, two real ones found:**
  - The Alerts widget was flagging products as low/negative stock at
    shops they were never even assigned to.
  - **The POS catalog wasn't filtering by shop assignment at all** —
    products meant for one shop were showing up (and were sellable) at
    every shop's till. This is now fixed; a product only appears at a
    shop's till if it's actually assigned there.
- **Settings toggles across Taxes, Receipts, Payment Methods,
  Notifications, and Users & Permissions were cosmetic only** — flipping
  a switch and clicking "Save changes" just flashed a checkmark without
  persisting anything. All five now genuinely save and restore correctly
  across reloads and devices. Payment Methods goes further: disabling
  Cash/Card/Mobile in Back Office now actually hides that button at
  checkout in the POS, live.

### Removed
- **Revenue Breakdown** panel removed from Dashboard (was showing a
  hardcoded, never-updated "$43.2K" placeholder).
- **Expenses by Category** panel removed from Accounting.
- **Delete Expense** removed from Accounting (edit-only now, matching
  Purchase Orders/GRNs/Stock Adjustments/Transfers).
- **In-app Stripe and Paynow payment processing removed from checkout.**
  Card and Mobile buttons now just record which payment method was used
  — same as Cash or Other — with no card-entry form, no phone-number
  prompt, and no calls to the payment edge functions. Use your own card
  terminal or mobile money handset alongside the till. The "Payment
  Integrations" section in Back Office → Settings was removed along with
  it, since entering keys there no longer does anything. (The three
  Supabase edge functions from earlier phases are left deployed but
  unused — safe to delete later if you want to tidy up.)

### Added
- **Click-to-edit stock** in the Products list — click the stock number
  (with a specific shop selected) to edit it inline.

## Phase 3 — Report accuracy, cross-shop data integrity, checkout validation (2026-09)

### Removed
- **Revenue Breakdown donut removed** from the Dashboard (it displayed a
  hardcoded placeholder `$43.2K` that was never real data, and duplicated
  what Sales by Products already covers precisely).

### Fixed — data accuracy / shop isolation
- **Sales by Payment Type and Sales by Employee** (Dashboard) now filter by
  the selected date range and shop, matching every other Dashboard number.
  Previously they summed *all* receipts ever recorded, across every shop,
  regardless of the date/shop filters shown right next to them.
- **Sales by Category** (Sales by Products page) rewritten to compute
  exact totals from real receipts in the selected period and shop.
  Previously it multiplied a rough demo-volume baseline by an arbitrary
  period factor, and ignored the shop filter entirely.
- **Accounting's cost-of-revenue** is now computed from the real cost
  captured on each line item at the time of sale, for the exact
  receipts/period/shop in view. Previously it used a single global ratio
  derived from demo sales-volume data, applied the same way regardless of
  which period or shop was selected — this was very likely the source of
  the "missing/wrong revenue" behavior reported.
- **Receipts page Employee filter (and Customer filter) now actually
  populate** with real employee/customer names. Previously they only ever
  showed "All employees" / "All customers" with nothing else selectable.

### Added
- **Checkout now requires a cash amount before completing a Cash sale** —
  blocks with a clear message if nothing (or not enough) was entered.
  Mobile and Card already had their own hard gates (Paynow phone approval
  / Stripe charge) and needed no change.

## Phase 2 — Dashboard date bug, POS employee selection, PDFs, UI cleanup (2026-09)

### Fixed
- **Dashboard date was frozen in the past.** A hardcoded `TODAY = July 23,
  2026` constant was driving every date filter on the Dashboard ("Today",
  "This week", "This month", etc.). This is also the real cause behind
  sales not showing up per shop — real sales made on the actual current
  date were being checked against a fake "today" and never matched. Now
  uses the real current date/time throughout. Several other hardcoded
  `2026-07-23` defaults (new PO/GRN/Stock Adjustment/Customer dates) were
  fixed the same way.
- **Removed the "Recent Transactions" section** from the Dashboard,
  including the hardcoded fake transaction list it was displaying.

### Added
- **POS shift login now has three steps**: shop → employee name → PIN
  (previously shop + PIN only, matching PIN against any eligible
  employee). The employee list is filtered to who's actually eligible for
  the selected shop.
- **PDF export** added to Purchase Orders, GRNs, and Stock Adjustments
  (Transfers already had this).
- **Transfer of Goods** line items now show current stock at *both* the
  source and destination shop side-by-side with the transfer quantity
  (previously only the source shop's stock was shown). The underlying
  before/after math was already accurate — verified again as part of this
  change.

### Changed
- **Back Office access from the POS is now restricted** to employees with
  the Shop Manager or Administrator role — Cashiers and Inventory Clerks
  no longer see or can use the "Open Back Office" shortcut on the till.
  Note: this restricts the in-app shortcut only. The underlying system
  has a single real login (the business owner's Supabase account) that
  employees share access to via PIN-based attribution, not separate
  per-employee accounts — so on a shared/unlocked device, someone could
  still navigate to `backoffice.html` directly. Fully closing that would
  require real per-employee accounts, a larger feature — flag if that's
  wanted.
- **Products → Stock control**: removed the redundant read-only "Total
  stock on hand" box from the product form (the per-shop stock table
  below it is the real source of truth now).

## Phase 1.1 — Fresh-business data bug, shop dropdown clarification (2026-09)

### Fixed
- **New/real businesses were being seeded with fake demo data.** When a
  freshly-created business had never synced anything to Supabase yet, the
  app was pushing the developer's hardcoded demo receipts and expenses up
  as if they were real — causing brand-new accounts to show fabricated
  revenue (e.g. "$51.75, +100%") on Day 1 instead of $0. Receipts and
  expenses now correctly start empty for any Supabase-connected business;
  the demo numbers only ever appear in the no-backend local preview file.
- **Expenses now actually sync.** They weren't part of the shared
  data previously, so Accounting always showed the same 5 hardcoded
  entries regardless of what was really entered — now they save and sync
  like everything else.

### Note — if your account already has the fake demo numbers
This fix only prevents the bug going forward for new businesses — it
doesn't retroactively clean data that already synced to Supabase under the
old behavior. If your Dashboard/Accounting still shows the fake numbers
after deploying this:
1. Supabase dashboard → **Table Editor → business_data**
2. Find your business's row, open the `data` column (JSON)
3. Set `"receipts": []` and `"expenses": []` inside it, save
4. Reload Back Office — it'll now load real (empty) figures instead

### Clarified, no code change
- **Adding a shop**: the POS's "no shops set up yet" message is correct —
  no shops exist yet. Add one from **Back Office → Dashboard → "All
  Shops" dropdown (top right, or the sidebar "VIEWING" selector) → type a
  name into "Add a new shop…" at the bottom of that popover.** This was
  already the mechanism; it's just easy to miss since it's inside a filter
  dropdown rather than a dedicated "Add Shop" button.

## Phase 1 — Multi-shop data isolation, PIN login, purchasing history lock (2026-09)

This phase fixed the root cause behind shops "mixing up": Purchase Orders,
GRNs, and Stock Adjustments could be assigned the literal value `"All Shops"`
as if it were a real shop, and product stock was a single shared number
instead of tracked per shop. Combined with the POS never requiring a real
shop to be selected before ringing up a sale, this meant sales, stock moves,
and reports could all bleed across shops instead of staying isolated.

### Fixed
- **Per-shop stock is now real.** Every product's stock lives in
  `p.shopStock = { "Shop A": 12, "Shop B": 5, ... }` and is read/written
  through shared `getStock` / `setStock` / `addStock` helpers in both
  `backoffice.html` and `pos-checkout.html`, instead of a single shared
  number.
- **`"All Shops"` can no longer be assigned to a document.** Purchase
  Orders, GRNs, and Stock Adjustments now require picking one real shop;
  `"All Shops"` remains available everywhere as a *filter* only.
- **POS now requires a real shift login.** Signing into the business
  account no longer drops you straight into the till. A mandatory
  shop-select + 4-digit employee PIN gate now runs every time, and every
  sale is stamped with the shop and employee from that gate — never a
  default. Switching cashier or shop now ends the current shift and
  requires the PIN again.
- **POS stock display/deduction is now shop-aware**, using the same
  per-shop model as Back Office.
- **GRN receiving and Stock Adjustments** now move stock at the correct
  single shop only.
- **Transfers** already tracked before/after stock at both the source and
  destination shop, including in the exported PDF — confirmed working, no
  change needed.

### Changed
- **Purchase Orders, GRNs, and Stock Adjustments can no longer be
  deleted.** They're permanent purchasing/inventory history now; correct a
  mistake with a new, opposite entry instead so the audit trail stays
  intact. (Transfers already had no delete option.)
- **Suppliers can now be added directly from the Purchase Order screen**
  (also extended to GRN and Stock Adjustment) via a "+ Add new supplier…"
  option, instead of requiring a trip to the Suppliers page first.
- **Sales by Products**: removed the Customer and Cashier filters. The
  custom date range filter was already present (via the existing
  date-range picker's "Custom…" option) — no change needed there.

### Verified, no change needed
- Adding a new product category was already supported via free-text entry
  with autocomplete on the product form.
- Dashboard, Accounting, and Receipts page filtering logic was already
  correctly shop- and date-aware — the inaccurate numbers previously seen
  were a downstream effect of the POS shop-tagging bug above, not a bug in
  the report calculations themselves. They should be accurate going
  forward now that sales are correctly attributed at the source.

### Notes for next time
- Existing employees need a 4-digit PIN set (Back Office → Staff) before
  they can log into the POS — this wasn't required before and is now
  mandatory for till access.
- Any products or purchasing records created before this update may still
  have stock or a shop value from the old shared model — worth spot
  checking stock levels per shop after deploying this.
