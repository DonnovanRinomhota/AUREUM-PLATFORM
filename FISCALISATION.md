# AUREUM — Fiscalisation (optional physical fiscal device, Zimbabwe / ZIMRA)

**Status: framework only.** The settings screen, database, security rules, safe transaction engine and the
till hook are built and tested. **No real fiscal device or ZIMRA integration exists yet**, because no
manufacturer protocol/SDK or ZIMRA FDMS documentation has been supplied. Until a verified adapter is added:

* nothing is sent to any device or to ZIMRA,
* no sale is ever marked "fiscalised",
* receipts in a fiscalisation-enabled shop say **NOT A FISCAL TAX INVOICE**,
* this is **not** a claim of ZIMRA approval or compliance.

Shops that do not switch it on behave exactly as before (the till makes no fiscal calls for them).

## Where things are
| Part | File |
|---|---|
| Settings → **Fiscalisation** tab (shops on/off, devices, test, history) | `backoffice.html` |
| Till hook (after a sale/refund is saved; receipt wording) | `pos-checkout.html` (`fiscaliseReceipt`, `fiscalReceiptBlock`) |
| Shared logic: validation, adapter registry, state machine, idempotency | `fiscal/fiscal-core.js` |
| Database (additive) / undo | `supabase/fiscalisation.sql` / `supabase/fiscalisation-rollback.sql` |
| Tests | `tests/fiscal-core.test.js`, `tests/fiscal-rls-test.sh` |

## Apply the database change (needs your approval — nothing is applied automatically)
1. Supabase Dashboard → SQL Editor → paste `supabase/fiscalisation.sql` → Run. It only **adds** three tables
   (`fiscal_shop_settings`, `fiscal_devices`, `fiscal_transactions`), two helper functions and their RLS policies. No existing table, policy or row is touched. Safe to run twice.
2. Back Office → Settings → Fiscalisation should now load. (Before this it shows "tables not installed".)
3. To undo: run `supabase/fiscalisation-rollback.sql` (deletes fiscal records — export first).

No new environment variables are needed for this framework. A future real adapter will need server-side
secrets (set with `supabase secrets set …` and used from an edge function) — never stored in these tables or in the page.

## Security model
* Every row carries `business_id` (AUREUM's tenant) and `shop`. RLS: members read their own business only.
* Only **owner / manager** (per `profiles.role`) can enable shops, add/edit/deactivate devices.
* Cashiers can create/update fiscal *transactions* (they complete the sale) but cannot configure anything.
* No delete policy exists: records cannot be deleted by the app — devices are **deactivated**, history kept.
* Database triggers enforce: a transaction's identity can't change; `fiscalised`/`rejected` are final; an `uncertain` one can't jump back to "submitting"; history is append-only.
* A CHECK constraint refuses secret-looking keys (password, token, api_key, certificate…) in a device's connection settings.
* Membership is per business, so "shop-level" access means business-level access; shops are separated by the `shop` column, not by separate permissions.

## How a sale is handled (when a shop has fiscalisation ON)
1. The sale is saved exactly as today (stock, payment, receipt number) — fiscalisation runs **afterwards** and can never block or undo it.
2. A fiscal transaction row is created with key `sale:<receipt uid>` (unique per business → no duplicates, even on refresh/retry/two tills).
3. The row is saved as `submitting` **before** the adapter is called; a crash leaves it recoverable.
4. Only a response carrying a fiscal reference counts as `fiscalised`. `rejected` and `fiscalised` are final.
5. Timeout / exception / interrupted = `uncertain`. It is **never re-submitted automatically** — the adapter's status check is called first; only if the device confirms it never received it can it be retried.
6. No device / no adapter → `not_configured` ("Not fiscalised") + a warning at the till + "NOT A FISCAL TAX INVOICE" on the receipt.
7. If the database is unreachable the record waits in a local outbox and is pushed later; the sale itself is never lost.
8. Refunds create a `credit_note` record the same way (only supported when the adapter supports credit notes).

## Writing a real adapter (when documentation exists)
Register one per manufacturer/protocol in `fiscal/` and call `AureumFiscal.registerAdapter(id, adapter)`.
Required methods: `testConnection`, `getDeviceStatus`, `submitFiscalTransaction`, `disconnect`
(optional: `getFiscalTransactionStatus`, `submitCreditNote`). Contract is documented at the top of the adapter section in `fiscal-core.js`.
Do not invent protocols: build only from the manufacturer's and ZIMRA's official documents.
USB / serial devices cannot be reached from a web page: they need a **separate, isolated local connector program**
(listening on localhost only) supplied for that device. None is included.

## To configure & test a device (once an adapter exists)
1. Settings → Fiscalisation → switch the shop **on** (confirm the prompt).
2. **+ Add fiscal device**: name, shop, manufacturer/model, serial, ZIMRA device ID, registration status, connection type and its fields.
3. **Test** — today it honestly answers "Awaiting supported adapter" (not a real test).
4. Use the **test** registration status and ZIMRA's test environment first. Do **not** run real fiscal transactions without ZIMRA test approval.
5. Watch "Fiscal transactions & errors"; **History** shows every attempt; **Retry / Check status** for problems.

## Known limits
* If a till has never loaded the settings (brand-new device, offline, nothing cached) it cannot know a shop is fiscalised, so that sale is not recorded as a fiscal transaction. Open the till online once first.
* The printed thermal slip / emailed text receipt do not yet carry the fiscal block (screen receipt does). Add when the real protocol dictates the required fields.
* Still required before use: ZIMRA registration, a verified device adapter, ZIMRA test-environment sign-off, per-product tax codes if the protocol needs them.
