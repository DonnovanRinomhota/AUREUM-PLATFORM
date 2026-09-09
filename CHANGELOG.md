# Changelog

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
