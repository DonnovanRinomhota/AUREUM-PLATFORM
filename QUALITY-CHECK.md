# AUREUM quality check — what was tested, what was found, what is still open

## Tested and passing
| Area | How | Result |
|---|---|---|
| Script errors | Every inline script parsed; undefined-name lint | 0 real errors (1 duplicate field fixed) |
| Every screen, desktop and phone | Opened each Back Office page, each Settings tab, each report tab, the till, the admin page and every website page; watched for script errors, failed files, broken images, sideways scrolling | 0 problems |
| Files and links | Every link, image, script, manifest icon, sitemap URL and service-worker file checked | 0 missing |
| Secrets | Searched all files for live keys | none (the only keys in the code are Supabase's public "anon" key, which is meant to be public) |
| Money maths | 3,000 random tickets (tax on/off, inclusive/exclusive, % and fixed discounts, weighed items) | always whole cents, never negative, totals consistent |
| Hostile text | Script-injection text in product, category, customer, employee, supplier, expense, receipt and shop fields | nothing runs |
| Accessibility | axe-core on the website, till, admin and 8 Back Office screens | 0 serious/critical |
| Speed | 3,000 products, 20,000 receipts, 2,000 customers | start-up 0.6 s; every page under 2 s |
| Database | Row-level-security tests for the fiscalisation tables (62 checks); schema + hardening applied to a scratch database | pass |
| Logic tests | fiscal core 35, fiscal countries 55, fiscal rules 14, AUREUM Bot 61 | all pass |

## Fixed in this pass
See `CHANGELOG.md` → "Quality check".

## Not verified (cannot be checked from here) — do these before your first paying customer
1. **Real payments:** live Stripe checkout, the live webhook, and Paynow/EcoCash were not run against real accounts.
2. **Real hardware:** receipt printers, barcode scanners and cash drawers (only simulated).
3. **Fiscalisation:** ZIMRA is deliberately still "in development". Sales are saved and marked NOT fiscalised. Do not tell customers it is ZIMRA-compliant until the gateway exists and ZIMRA has signed it off.
4. **Edge functions** (`supabase/functions`) were reviewed but not run on Supabase.
5. **Real browsers/devices:** tested in Chromium only (desktop and phone-sized). Please also try Safari on an iPhone and Chrome on an Android phone.
6. **Content you must supply:** real support email/phone on the website, real product photographs, a demo video (the "Watch Demo" button says "Coming soon"), and your final domain name.
7. **Legal pages:** Terms of Service and Privacy Policy (customers' personal data is stored) — have these written/reviewed before launch.
8. **Backups:** confirm Supabase point-in-time recovery or daily backups are on for your project plan.

## Known limits (not bugs, but customers may ask)
- Text containing the characters `<` or `>` (for example a product called `A<B`) can display oddly, because lists are built from raw text. It is safe (nothing runs) but not pretty.
- The Back Office thumbnails crop pictures to fill the square; the till shows the whole picture.
