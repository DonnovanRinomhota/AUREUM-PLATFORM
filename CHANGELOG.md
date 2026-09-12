# Changelog

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
