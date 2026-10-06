# Shifts, closing, and refunds — how they work

## What a shift is
A shift is a **work period for one cashier at one shop** — not a browser session. It stays open until it is
closed, so a shift that runs past midnight (or is never closed one evening) simply **continues the next day**,
keeping its original start time, instead of silently restarting.

**Every cashier has their own shift** — own float, own sales, own cash to count — so money from different
cashiers is never mixed. When a second cashier signs in, they start their own shift; the first one keeps running.

| Step | What happens |
|---|---|
| **Open** | A cashier with no open shift at the shop starts their own when they sign in, and can enter their cash float (money already in their drawer). |
| **Trade** | Each cashier's sales add to their own shift. Refunds are recorded on the shift of whoever processes them. |
| **Continue** | Signing in when a shift is already open says so ("Shift SH-4 is already open… started Oct 4, 7:30 AM"). Nothing new is started. A warning shows if it's from an earlier day. |
| **Close** | The cashier closes **their own** shift (counts their drawer). Managers/administrators can close **anyone's**. |
| **Report** | A shift report is kept permanently, shown immediately, and can be printed (browser, USB or Bluetooth thermal printer). |

One shift per shop at a time. Signing out **never** closes a shift.

## Closing a shift
Till → **Shift** (top bar) → **Close shift…**
- Shows sales by payment type, refunds, net sales, and **expected cash** = opening float + cash sales − cash refunds.
- Enter the **counted cash**. The difference (Over / Short / Balanced) shows instantly.
- If it doesn't balance, a **note is required**.
- On closing, the report appears (print it before pressing Done), then the till returns to sign-in.

A cashier sees only their own shift and can close it. A manager/administrator also sees the other
cashiers' open shifts at the shop (and can close them), and can open the closed-shifts list (filter by cashier).

## Looking back
- **At the till (Shift → Closed shifts):** every closed shift, newest first, with a date filter and
  paging. Tap one to reopen the full report and print it again.
- **Back Office → Reports → Shifts:** shifts open right now (flagged if left open from an earlier
  day) and all closed shifts with the cash difference.

## Today's Sales (at the till)
Shows **today's** sales and refunds for this shop only, with a day total. Tap any row for the full
receipt (time, cashier, every product and quantity). Older receipts: Back Office → Receipts.

## Refunds
Managers/Administrators only, **item by item** — never the whole receipt by default:
1. Open the receipt (Today's Sales → tap it) → **Refund items…**
2. Pick the products and how many of each (nothing is selected to start with).
3. Add an optional reason → **Refund selected items**.

Discount and tax are returned in proportion; stock goes back to the shop it was sold from; an item
can't be refunded more times than it was sold; several partial refunds always add up to exactly
the original total. Each refund has its own number (R…) and a slip you can print.

## Good to know
- After updating, no shift is open. The first sign-in starts one (and asks for the float).
- A shift's sales are found by **shop and time**, so make sure each till's clock is correct.
- Shifts closed before this update still appear in the lists (they have fewer details).
- Money is now stored in whole cents everywhere (previously a 10% discount could be saved as
  $12.420000000000002). Older receipts keep their stored values.
