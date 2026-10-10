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

---

# Multi-country architecture (v2)

Fiscalisation is now country-independent. Three layers, kept strictly apart:

| Layer | Owns | Lives in |
|---|---|---|
| **Engine** | transaction states, idempotency, safe retry, uncertain-never-resubmit, audit trail | `fiscal/fiscal-core.js` |
| **Country adapter** | tax rules, invoice/receipt format, signing & QR rules, reporting calendar, credit-note rules | `fiscal/countries/<cc>.js` |
| **Device adapter** | manufacturer protocol / SDK / connection | `fiscal/devices/<id>.js` |

* The engine speaks one **standard transaction** (`AureumFiscal.toStandardTransaction`). A country adapter turns it into that jurisdiction's request and validates it; a device adapter delivers the request. Neither knows the other's internals.
* **Pairing is explicit and two-sided.** A country lists the device adapters it accepts; a device adapter lists the countries it is approved for. Both must agree — a device approved for one country is refused in another.
* **Status ladder** for every integration: `disabled → in_development → testing → approved`. Only **approved** is ever shown to shop owners and the engine refuses to fiscalise through anything else. Nothing is called "supported" before that.
* **Add a country or device without touching checkout:** add a file under `fiscal/countries/` or `fiscal/devices/`, load it with a `<script>` tag, add a catalogue row (platform admin page), done. The till only ever calls `fiscaliseReceipt`.

## Database (v2, additive) — `supabase/fiscalisation-v2.sql`
Run it **after** `fiscalisation.sql`, once, in the SQL Editor (needs your approval — nothing is applied for you). Undo: `fiscalisation-v2-rollback.sql`.
* `fiscal_integrations` — platform catalogue. Owners can only read **approved** rows; only the admin edge function (service role) can write. A DB constraint refuses `testing` without verified docs, and `approved` without verified docs **and** an approval reference.
* `fiscal_shop_settings` and `fiscal_devices` get `country`, `authority`, `integration_id`, `integration_version` / `adapter_version`. **A shop can only be switched ON with an approved integration for its own country** (database trigger); authority and version are copied from the catalogue, never trusted from the browser. Shops switched on under v1 keep working.
* `fiscal_audit_log` — append-only record of every settings/device change and who made it (readable by owners/managers; nobody can edit or delete it).
* Seeded: Zimbabwe (country) and the ZIMRA virtual device, both **in_development**. No other country exists.

## Platform admin page — `admin.html` → **Fiscalisation** tab
Lists integrations; an authorised platform admin can record "documentation verified" (+ which documents), notes, the authority's approval reference, and move the status **one step at a time**. **Approving requires a super admin.** Every change goes to `admin_audit_log`. Needs the updated `admin-manage` edge function:
```
supabase functions deploy admin-manage
```
Platform admins (`platform_admins`): see `supabase/seed-platform-admins.sql` (adds simonmuzviyo@gmail.com and don99business@gmail.com as ordinary admins if missing — promote to super in the Admin access tab).

## Shop owners
Back Office → Settings → Fiscalisation: choose the shop's country from the **approved** list, then switch on. Device forms only offer device integrations approved for that country. With nothing approved the tab says "Fiscalisation isn't available for your country yet".

---

# Zimbabwe (ZIMRA) — documentation read and what it means

Sources (public): ZIMRA **Fiscal Device Gateway API Specification v7.2** — https://www.zimra.co.zw/downloads/9-domestic-taxes?download=3807%3Afiscalisation-api-documentation ; ZIMRA "Fiscalisation Explained" — https://www.zimra.co.zw/domestic-taxes/corporate/fiscalisation-explained ; Public Notice 26 of 2024 — https://www.zimra.co.zw/public-notices?download=3847%3Apublic-notice-26-of-2024-zimra-virtual-fiscalisation-and-api-fdms . Read 2026-10-10 through a text extract that **omitted spec sections 9, 10.x, 11 and 13** — those must be read from the official PDF.

**Two approved routes** (ZIMRA): (1) a hardware fiscal device / ESD / register from an **Approved Supplier**, upgraded to FDMS; (2) **virtual fiscalisation** — software talks to FDMS through ZIMRA's API (free spec; built in-house or by a third party). AUREUM's adapter targets route 2; route 1 needs each manufacturer's own protocol (none available).

**What the API requires** (v7.2): HTTPS/JSON; **mutual TLS with a device certificate** issued by FDMS (registration: portal gives deviceID + activation key → CSR → `registerDevice` → certificate; renew with `issueCertificate`); the same key **signs** receipts and fiscal-day reports (ECDSA P-256/SHA-256 preferred, or RSA-2048); a **fiscal day** must be opened (`openDay`), receipts submitted (`submitReceipt`, strictly increasing `receiptCounter`/`receiptGlobalNo`, unique `invoiceNo`), and the day closed (`closeDay`) with **fiscal counters**; offline mode uses `submitFile`; receipts with validation problems are marked Grey/Red and a day with those cannot be closed; test host `fdmsapitest.zimra.co.zw`, production `fdmsapi.zimra.co.zw`; 30 s timeout.

**What is implemented** (`fiscal/countries/zw.js`, 55 + 35 automated checks): mapping of a sale to the `Receipt` structure; the tax formulas; MoneyType mapping; credit-note structure; and validation of the receipt rules written in the spec (RCPT015-018, 023-025, 034, 039, 040, 047, HS-code length, invoiceNo length, taxCode all-or-none).

**NOT implemented / NOT verified** (listed in the adapter itself under `docs.unverified` / `docs.notImplemented`):
* signing (spec §13 field order not obtained), QR code and verification code (§11), tax rounding rules (RCPT026/027 — half-up assumed), discount-line representation (discounted sales are refused for now), credit-note line sign rules, fiscal counters, offline files, receipt print layout (§10);
* the **server-side gateway**: mutual TLS, certificate/private-key custody, signing, fiscal-day management. The browser must never hold these. It would be a Supabase edge function (`fiscal-zw-gateway`) — **not built**; until it exists every ZIMRA sale is saved and marked **NOT fiscalised**;
* product → ZIMRA tax ID / HS code mapping (matched by percentage for now; VAT payers need HS codes per product);
* ZIMRA's approval/certification steps for software providers (the notice does not state them) — ask ZIMRA (Contact Centre 585, contactcentre@zimra.co.zw).

So Zimbabwe stays **in_development**. To move it forward: obtain the official PDF sections 10, 11, 13; register a **test** device with ZIMRA; build the gateway; test against `fdmsapitest.zimra.co.zw`; get ZIMRA's confirmation; only then record the approval reference and a super admin sets it to Approved.

## Tests added (all actually run)
`node tests/fiscal-core.test.js` (35) · `node tests/fiscal-countries.test.js` (55) · `node tests/fiscal-rules.test.js` (14, needs `tsc`) · `tests/fiscal-rls-test.sh` (24) · `tests/fiscal-v2-rls-test.sh` (38; both need a throwaway local Postgres) · browser tests of Back Office, till and admin page against a simulated Supabase. **Not tested:** the edge function itself running on Supabase (Deno), real devices, ZIMRA's environment.
