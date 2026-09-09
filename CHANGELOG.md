# Changelog

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
