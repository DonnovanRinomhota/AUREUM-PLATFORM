# Shifts, closing, and refunds — how they work

## What a shift is
A shift is a **work period at one shop's till** — not a browser session. It stays open until a
manager closes it, so a shift that runs past midnight (or is never closed one evening) simply
**continues the next day**, keeping its original start time, instead of silently restarting.

| Step | What happens |
|---|---|
| **Open** | The first person to sign in at a shop with no open shift starts one, and can enter the cash float (money already in the drawer). |
| **Trade** | Every sale and refund at that shop adds to the open shift. Any cashier can sign in and out — the shift carries on. |
| **Continue** | Signing in when a shift is already open says so ("Shift SH-4 is already open… started Oct 4, 7:30 AM"). Nothing new is started. A warning shows if it's from an earlier day. |
| **Close** | A **Shop Manager / Administrator** counts the drawer and closes it. |
| **Report** | A shift report is kept permanently, shown immediately, and can be printed (browser, USB or Bluetooth thermal printer). |

One shift per shop at a time. Signing out **never** closes a shift.

## Closing a shift
Till → **Shift** (top bar) → **Close shift…**
- Shows sales by payment type, refunds, net sales, and **expected cash** = opening float + cash sales − cash refunds.
- Enter the **counted cash**. The difference (Over / Short / Balanced) shows instantly.
- If it doesn't balance, a **note is required**.
- On closing, the report appears (print it before pressing Done), then the till returns to sign-in.

Only managers/admins can close a shift or open the closed-shifts list. Cashiers can print the
running summary and sign out.

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
