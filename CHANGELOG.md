# Changelog

## Back Office: drop-downs back to the original colours (sw v69)
- Filter and other drop-downs (dates, time, shop, category, chart type, rows per page) are back to the original text and box colours: no gold text, no gold highlight, native arrow. This also fixes the overlapping arrow on the chart "Line / Hours" boxes and the Rows-per-page number.

## Clean website links, import duplicates, rows-per-page (sw v68)
- Website: "Open POS", "Back Office", "Log in", "Free trial" and the other links into the apps now use the short addresses (/pos, /app, /app?mode=signin, /app?mode=signup) and open in a new tab.
- Back Office, Import products: products already in the system are now flagged ("N products are already in the system") with a choice: Yes, set the quantity to the number in the file; Yes, add the file's number to the current quantity; or No, leave them (not imported). Default is No. Quantity changes go into Product History. New products in the same file import as before.
- Back Office, Product list: the "Rows per page" number was hidden behind the drop-down arrow; fixed.

## Website: six business types, tagline, clearer trial buttons, launch checklist (sw v67)
- Business section now shows six cards: Bakery, Beauty, Retail, Grocery, Pharmacy, Electronics & Hardware, with the line "All your business operations right at the tip of your fingers." under them. The Beauty, Pharmacy and Electronics cards are gold line-art placeholders and Grocery reuses the supermarket photo: replace site/assets/img/card-beauty.webp, card-pharmacy.webp, card-electronics.webp and card-grocery-v3.webp with real photos (same names).
- "Let's get started" is now clearly visible and "14-Day Free Trial" and "Start free trial" are clickable gold-ringed buttons.
- New: Terms & Conditions page, custom 404 page, short cookie notice, Vercel Web Analytics (turn it on in the Vercel project: Analytics -> Enable), Terms link in the footer, privacy policy updated to mention anonymous visit counts.
- Contrast fixes on the light sections; page title and description no longer say "Zimbabwe".

## Own domain: aureumpos.com (sw v66)
- The website now uses https://www.aureumpos.com for canonical links, the sitemap and social previews. The vercel.app address keeps working (the Android apps still use it).
- Support email info@aureumpos.com now appears on the Support, Privacy and Delete-account pages.
- vercel.json: pos.aureumpos.com, app.aureumpos.com and admin.aureumpos.com open the POS, Back Office and control panel (they redirect to the one www address, as www.aureumpos.com/pos, /app and /admin, so sign-in and the offline queue stay in a single place). The short paths /app and /pos open the Back Office and POS; the old /backoffice.html and /pos-checkout.html addresses still work. These work after the DNS records for each subdomain are added.

## Bug fixes: shops, employees, tax, categories (sw v65)
- Back Office: adding or removing a shop no longer makes products seem to vanish. The new shop is empty by design, so it now shows a clear message with an "Add all products to this shop" button; shop changes in Settings are saved straight away.
- POS: employees added in Back Office now appear in the shift sign-in list (previously hidden when no PIN was set) and the list refreshes when data syncs. Employees without a PIN are marked "(no PIN set)". Back Office now requires a PIN for till roles.
- POS: tax is no longer editable at the till. It always uses the rate set in Back Office -> Settings -> Taxes (also when resuming a held ticket).
- Categories are listed A to Z in the POS category bar, the Back Office filters and the product form. The category drop-down uses the gold/green app colours.

## Sign-up: sign in on the device that created the account (sw v64)
- After **Create Business**, the "Check your email" page signs this device in automatically once the email is confirmed, even when the confirmation link is opened on another device. The other device shows "Email confirmed" and is not signed in. The password is kept in memory only while the page waits (up to 30 minutes).
- SETUP-EMAIL-TEMPLATE.md now explains how to send the confirmation email as "AUREUM" (custom SMTP in Supabase) instead of "Supabase Auth".

## Website trim-down, Category drop-down (sw v63)
- Back Office: the Category box on the product form is now a drop-down listing every category on every device, with "No category" and "+ New category…" (which shows a name box). Saving is unchanged.
- Website home: removed the "Why AUREUM", "What you get", "How it works" and pricing-band sections; the business types are now Bakery, Beauty, Retail and Fashion (names only) under "Empowering Business Owners World Wide", with an icon row (Easy Checkout, Track Sales, Manage Inventory, Sales Reports, Offline Access, Multi Device Use). The Beauty card uses a placeholder picture: replace site/assets/img/card-beauty-v2.webp with a real photo (same name).
- Pricing page: removed the "Pricing questions" section. Footer: logo only (no subtitle or description). The About page and its menu link are removed for now (the page source is kept in site-src/pages/about.js).

## Website: video hero (sw v62)
- Home page: new headline "A Point Of Sale System You Can Rely On.", then a full-width looping video ("Your Business Simplified"). The device pictures and the morph were removed. With reduced-motion settings the video stays on its first frame.
- Header and footer logo now match the new logo artwork: gold coin with the serif "A", "AUREUM" in gold Montserrat capitals and "POS & INVENTORY MANAGEMENT" in cream spaced capitals (live text, not a picture). Earlier note: gold serif "AUREUM" wordmark with "POS & INVENTORY MANAGEMENT" under it; the "Built for Zimbabwean businesses" note and the top Log in / Free trial links were removed (the floating bar has them). Headline is now "A Point Of Sale You Can Rely On."; "Your Business Simplified" is gold.
- The floating bar now shows Log in and Free trial (a Menu button remains on phones and tablets only). Website panels now run edge to edge on wide screens.
- The offline-copy code leaves video files to the browser.

## Website redesign (public marketing site)
- New look for the home, features, pricing, about, support, privacy and delete-account pages: light, tightly spaced Outfit type (self-hosted), small letter-spaced section labels, alternating dark and light panels, hairline rows, an accordion for features, underlined arrow links, a floating bottom bar and a large green call-to-action panel. The green AUREUM palette is kept, with gold touches: the gold "A" logo, gold section labels and rules, gold headline accents, and the original gold-framed "Built for every counter" section. A bar under the header gives Log in / Back Office / Open POS on every page, and on the home page the headline, text and buttons now sit inside the hero panel. The apps (Back Office, POS, admin) are unchanged.

## Accuracy, split payments, Hold, image receipts, QA fixes (sw v60)
- **One sales calculation** for Dashboard, Sales by Product (and its CSV), Sales by Category and Accounting. Ticket discounts and sales tax are shared out per item in whole cents, cost is the cost recorded at the time of sale, refunds reverse revenue, tax, discount and cost, and products that were later deleted still count. Net sales = after discounts and refunds, excluding sales tax; profit = net sales - cost. The pages now reconcile to the cent. (QA F02, F03, F09)
- Dashboard chart renamed "Net sales" (it plots net sales). Sales by Employee / Payment now show totals net of refunds; split payments are counted per method. Sales by Category shows which period/shop it uses. (F06, F09)
- POS: starts every ticket on the tax rate saved in Settings -> Taxes. Settings used to display an unsaved "15" that the till never received; it now shows the real rate. (F01)
- POS: percentage discount above 100 and fixed discount above the ticket are corrected visibly. (F04)
- POS: **Hold** saves the ticket (items, changed prices, discount, customer, note, tax) on this till; **Held** lists them to Resume (add items, complete the sale) or Delete. Survives reload and sign-out. (F11)
- POS: **Split** payment replaces "Other" (Other is still a choice inside Split). Receipts, shift totals (cash expected in drawer), drawer kick, refunds (shared back in proportion) and reports understand split payments.
- POS: **Email receipt** now makes a branded picture (business logo/name/details + AUREUM mark) to Share/Email (attached on phones/tablets), Save, or Open email.
- Back Office: stock boxes are switched off while Stock control is off (F05); Inventory Summary lists uncategorised products so rows add up (F07); Data Check page size matches its selector (F08); switches have a role, name, state and keyboard use, and common click-only controls are focusable (F10).

## Billing: manage after paying, invoice emails, Delete account (sw v59)
- Settings -> Billing: once a subscription is paid, "Subscribe with card" is hidden; the page shows a "Recurring monthly billing" note with the next payment date, plus **Update card details** and **Cancel subscription** (Stripe's portal).
- Accounts that paid but were never linked to Stripe are repaired automatically (webhook and portal).
- Invoice/payment email to the owner's registration email after each payment (needs Resend secrets, or switch on Stripe receipts - see SETUP-BILLING.md section 8). Each invoice is recorded/emailed once.
- Settings -> Business Profile: **Delete account** (owner only; business name + password; cancels subscription; deletes the business and all logins). New edge function `delete-account`.

## Android apps, privacy pages (sw v58)
- New: two Android apps (Capacitor) in `android/backoffice` (com.aureum.backoffice) and `android/pos` (com.aureum.pos), loading the live site with a bundled offline recovery page; separate icons, permissions and release signing. Build with GitHub Actions -> "Android build". See `android/README.md`.
- New: `native-bridge.js` (no effect in a normal browser): store-app mode, camera barcode scan, Bluetooth-LE printer and cash drawer, file save/share, "Print" shares the receipt text.
- POS: view-only strip in the app shows no Subscribe button (store rules).
- New: `/privacy/` and `/delete-account/` pages; footer links; `app-compat.json` (minimum native version); CI workflow `web-checks.yml`.

## Search boxes, Business Profile & cash drawer (sw v57)
- Fixed: Products/Employees search, Business name/phone and Tax name sometimes started with a date or "Any date". The browser was restoring text from the date-picker boxes into unrelated fields. New `noautofill.js` switches browser autofill/restore off for the app's boxes (login fields untouched) and clears any such stray date text; all three apps use it.
- Business phone, email, address and Tax name now save and reload (they were not being stored).
- New: Settings -> Receipts -> "Open cash drawer after cash sales" (on/off). Opens a printer-connected drawer (ESC/POS pulse over the USB/Bluetooth receipt printer); an "Open Drawer" button appears at the till when it is on.

## Barcode scanning
- The till now also recognises a UPC-A label that a scanner reads as a 13-digit number with a 0 in front. Labels made by Print labels (barcode or, if empty, the product code) are found at the till by scanning.

## Receipt, phone and guide fixes
- **Receipts** (till, Back Office receipt view, thermal print) now label the unit column **Price**, not Cost. The "Synced" note no longer prints on the paper receipt (it still shows on screen at the till).
- **Phone till:** the top bar, the "Back to products" bar and pop-ups now sit below the phone's clock/notch, so Sign Out, Shift and Back to products are always tappable; the page no longer slides up under the status bar; the receipt pop-up's buttons (including Print Receipt) wrap and fit instead of running off the side.
- **Income Statement:** the Export button is removed; Income tax % always starts at 0 (it is no longer remembered).
- **Product form:** "Sold by" now offers **Quantity** (existing weight products keep their weight option).
- **Guide:** an info step whose button you press no longer shows "I can't find that on this screen" (it moves on); the Adjust stock guide now makes you pick the type and reason and type the quantity, so Save no longer fails with a pop-up.

## Guide and till labels
- Back Office Guide, step "The menu", now simply says: Sales Tracking & Visualisation, Product Entry & Inventory Management and Control Panel.
- The Back Office button is now **Ready To Sell ? Switch To POS Check-Out**.
- Guide steps that ask you to type now put the cursor in the box they point at, so typing no longer lands in another field.
- New guides: **Create a till login (owner or cashier)** (the till cannot be signed into without one) and **Use the Employee Calendar**.
- Till: a **Sign Out** button next to the shop button at the top.

## View-only mode, Billing back in Settings, phone & till improvements
- **Expired trial / subscription no longer blocks sign-in.** The owner can log in and see everything, but the app is **view only**: a gold strip across the top says *Free trial period has ended · Subscribe to keep enjoying Aureum* (or *Subscription has expired · Subscribe to keep enjoying Aureum*), and every add, edit, delete, save and sale is switched off until they subscribe. Billing, Help, exports, search and navigation keep working. A suspended account is still blocked. The till switches to the same view-only mode (products cannot be added, no sales, holds, discounts or voids). New file `viewonly.js`.
- **Billing & Subscription is a Settings tab again**, and the left-menu entry (between Reports and Settings) is a shortcut that opens Settings on that tab.
- **Product form – Shops table shows real numbers** (e.g. 12.00 and 6.00) for every shop instead of "Same as ...", for new and saved products. A shop only keeps its own price/cost if you type a different number; otherwise it follows the regular price.
- **People menu order:** Employees, Suppliers, Customers.
- **Fiscalisation greyed out as "Coming soon"** again (switch in `fiscal/flag.js`).
- **Till:** product pictures now fill the card (no empty gap between picture and name/price); the arrow is labelled **Back Office** and the history button **Receipts**; the keyboard-shortcuts list was removed from Help and the Guide; fixed a product appearing in the cart before one was chosen (a stray tap through the closing sign-in screen); the receipt print no longer shows a dark-green area beside the receipt.
- **Phones & small screens:** the till's top bar wraps so every button is visible and labelled; search/scan and categories fit the width; the ticket panel and pop-ups sit below the subscription strip. In the Back Office, list pages no longer scroll sideways, Settings tabs scroll cleanly, and the Print labels window fits.

## Shop filters everywhere, Billing page, Income Statement export, product list fixes
- **Shop viewing filter now drives every section.** The shop picker at the top sets the starting shop for Sales by Product, Receipts, Products, Purchase Orders, Goods Received, Stock Adjustments, Transfer of Goods, Accounting and Reports (the dashboard as before). Each section has its own **Shop** filter: changing it only changes that section — the top picker and the other sections stay put. Picking a shop at the top again resets them all to it. New Shop filters: Purchase Orders, Transfer of Goods (from or to), Accounting, Reports (one filter for all report tabs).
- Expenses can now be assigned to a shop (or left business-wide). A shop's Accounting statement shows the expenses recorded for that shop; business-wide expenses appear under All Shops.
- **Reports always opens on Available Inventory** (it used to reopen on Low Stock after you had visited it). The "View low stock" links still open Low Stock.
- **Accounting → Income Statement can be exported** (CSV, Excel, PDF) with business, shop, period, every line and expenses by category.
- **Billing & Subscription is its own page** in the left menu, between Reports and Settings (it is no longer a Settings tab). The menu group "Operations" is now **Inventory Management**.
- Product list: removed the static Refresh and ⋮ buttons; removed the "Price change" / "Quantity change" switches from the product form; the shop price/cost boxes now say what they fall back to ("Same as 4.50") using the regular price and cost typed above. **Long press now selects the product** (before, the release click undid it; swiping no longer counts as a long press and the browser's own menu is suppressed).
- **Print labels** starts with only the products you ticked (empty if none), instead of everything on the page.
- **The round ? Help button** could stay unresponsive: the first-visit guide card sat on top of it, touch drags cancelled the tap, and an open pop-up hid the Help screen. All three fixed. Service worker v52.

## Print labels, sign-up email, synced receipts at the till
- **Print labels (Back Office → Products → Print labels)**, modelled on how the Loyverse label printer works: add products by search, by whole category or by supplier; set a quantity for each; choose a label type; choose where the barcode comes from (Barcode, SKU, or Barcode-else-SKU); pick which shop's price to show; switch the name, price and number on or off; preview, then print. Settings are remembered on the device. Also opens from purchase orders, goods received notes, stock adjustments (what was added) and transfers with the quantities filled in.
- Own barcode engine (`labels.js`): Code 128 (letters, digits, symbols, up to 80 characters), plus EAN-13, UPC-A and EAN-8 when a number is a valid retail barcode. Drawn as vector at an exact bar width (whole printer dots), so it prints sharply. Long codes get a warning instead of an unreadable label.
- 8 roll sizes (one / two / three across), 6 A4 sheet layouts, one US Letter sheet and a **Custom size** (roll or sheet, millimetres). **Start at label** for partly used sheets and **Move right / Move down** to correct printer drift.
- Products with no barcode can be given their own EAN-13 numbers (start with 2, so they never clash with a maker's barcode) after a confirmation.
- Tested by decoding every printed barcode with an independent scanner library (all printable characters, numbers of every length, EAN/UPC/Code 128, all templates), and by checking printed PDF page sizes, page counts, grid positions and offsets. `tests/labels.test.js` covers the engine. Service worker v50.
- **Sign-up now shows a "Check your email" screen** (with Resend after 30 s, "I've confirmed — sign in", "Use a different email"), sends the confirmation link back to the Back Office, shows a clear message if someone signs in before confirming, and welcomes them once confirmed. **Supabase must have "Confirm email" switched on** — see SETUP-EMAIL-TEMPLATE.md.
- **Till (POS): Synced / Not synced receipts.** Today's Sales shows a Synced / Not synced tag on every receipt, a **Not synced** tab (all days and shops on the device) with a count and a **Sync now** button, a dot on the Recent-sales button, and a status line on each receipt. Without a cloud account the till says "On this device".

## Country-driven fiscalisation + POS guide fix
- **Fiscalisation is greyed out as "Coming soon" for now** (master switch `fiscal/flag.js`, `window.FISCAL_COMING_SOON = true`): the Settings tab is dimmed and labelled, the page shows a notice instead of any setup, the Back Office makes no fiscal database calls, and the till does nothing fiscal (no submissions, no receipt wording, no toasts), even for a shop that already had it on. To launch, set the flag to `false` in `fiscal/flag.js` and bump the service-worker version. Service worker v49.
- **POS guide:** a new user now gets the highlighted tour automatically at first sign-in (like the Back Office), with or without products. Before, accounts with no products got no guide at all and everyone else only saw a small corner card.
- **Fiscalisation is country-driven, with no default country.** Each shop picks its country (your business country is only suggested). `fiscal/profiles.js` lists what the authority usually asks for in 15 countries, with a neutral profile for every other country. The setup form asks for the device/provider **model**, serial number, how sales are reported, the **tax details**, and the **authority portal** (never passwords). A per-shop **readiness checklist** shows what is left, and owners can finish setup before the country is approved.
- **Any device, any country, one adapter:** `fiscal/devices/local-connector.js` talks to a fiscal connector (documented protocol `aureum.fiscal.connector/1` in FISCALISATION.md), and `fiscal/countries/generic.js` builds the neutral request for any African country. Outcomes are unchanged and safe: only an answer with a fiscal reference counts, unknown outcomes become *uncertain* and are never resent, and a country still needs its integration approved by the AUREUM team.
- `tools/fiscal-connector-sim.cjs` simulates a connector for testing; its references are printed as **TEST ONLY — NOT A REAL FISCAL INVOICE**.
- New SQL `supabase/fiscalisation-v3.sql` (+ rollback): 53 African country rows and the connector device row, all *in development*; nothing is approved by it.
- Help bot: fiscalisation answers are country-neutral and a new "What details does fiscalisation ask for?" answer was added. Service worker v48.

## Guided tours & Guide centre
- New shared engine `guide.js` (spotlight, tooltip, progress, Back/Skip/Exit/Resume, Guide centre, first-run welcome card, one-time screen hints). Keyboard (Esc exits), screen-reader announcements, reduced-motion, phone layout.
- POS journeys (`guide-pos.js`): Find your way around, Complete your first sale, Find a receipt, Understand stock, Close your shift and sign out. Steps complete from real till state (ticket, receipts, open pop-ups); nothing is added, charged or saved by the guide.
- Back Office journeys (`guide-bo.js`): Explore the Back Office, Add or edit a product, Review sales and receipts, Stock alerts, Receive goods, Adjust stock, Transfer goods, short tours for Customers / Employees / Suppliers / Reports / Settings, Sign out safely. Role-aware: areas a person cannot open are never offered.
- Progress is stored per person in their account preferences (and on the device); usage counters hold no names, customers or amounts and go nowhere else.
- `tests/guide-journeys.test.js` checks every tour target exists and that tours cannot act on a sale.

## Per-shop cost, searchable currency, product history, currency conversion
- Cost typed on a Goods Received Note, Purchase Order or Stock Adjustment now changes the cost of that shop only (`shopCost`); other shops keep theirs. Product form has a per-shop Cost box; lists, valuation and reports use each shop's cost; the till records the shop's cost on each sale.
- Fiscalisation screens no longer mention ZIMRA by default; wording is country-neutral.
- Currency, secondary currency and time zone pickers are searchable.
- Product form: only Find a picture online and Google Images remain (Bing / DuckDuckGo removed).
- New Product history (top right of Products): permanent, non-deletable log of stock typed directly on a product, with date and product filters.
- Changing currency with existing records asks whether to convert them; fetches a market rate (editable), logs the rate in Settings, and the rate can be changed later (re-converts only records that conversion touched).

## Country, per-shop pricing & accuracy pass
- Sign-up asks for the country (flag + searchable list); sets default currency and time zone. Both can be changed in Settings; all currencies/time zones available.
- Currency symbol now follows the chosen currency everywhere (was hard-coded `$` in ~60 places), including PDFs.
- Per-shop selling price in the product form now saves and is used by product list, reports, valuation, documents and the POS.
- Editing a cost on a GRN, Purchase Order or Stock Adjustment updates the product cost.
- Settings → POS Devices lists tills signed in to each shop (auto-registered, Connected/Offline, last active), synced across devices.
- Accounting/dashboard: revenue excludes sales tax collected; cost of goods is the exact saved cost of items sold (less refunds), not a ratio estimate.
- Weight-product stock keeps decimals in the product form.
- New Reports → Data Check tab flags duplicate names/codes, zero price, missing cost, cost above price, cost equal to price, negative/fractional stock, mismatched document totals, long-open shifts.
- Aureum Bot: removed the stock "heads up" message; opening message only. POS tiles: photos fill the tile.

## New-account defaults (service worker v44)
- A new account starts **blank**: no sample products (Reusable Tote Bag etc.), no sample customers, **one** employee, and one shop called **Shop 1**.
- **Business name** in Settings is the name typed at sign-up.
- **Timezone** list now has every time zone (about 400), and the choice is saved.
- The gold **?** help button starts in the lower right (and resets for a newly signed-in account).
- The shop switcher's **+ add shop** button is no longer cut off in the left column.

## Units, expiry report & polish (service worker v43)
- **Unit column** on Goods Received, Purchase Orders, Stock Adjustments and Transfers: **Each** by default, or Pack of 5/6/10/12/20/24/50, or **Custom…** any pack size. Stock always moves by **Quantity × Unit** (4 × Pack of 12 = 48). Cost on GRN/PO follows the pack size until you type your own. Saved documents, pop-ups and PDFs show Unit and Total qty. This also fixes the GRN Unit cell that could not be changed.
- Removed the category filter above the line items on Goods Received and Purchase Orders.
- **Reports → Expired Products** (from the expiry dates on Goods Received), with an "expiring in 30 days" view.
- Accounting: **Income tax %** now sits on a gold plate.
- Aureum Bot opening message updated.
- POS: product photos have their empty white margins trimmed so items fill the tile.
- Stock Transfer PDF is now a print-out of the saved-transfer pop-up (same fields, columns and note).
- Website: removed the "Watch Demo" button and dialog.

## Quality check — customer-ready pass (service worker v42)
- **Security:** names, notes and descriptions typed by staff or customers could run as code in the owner's Back Office (a customer added at the till could attack the owner's session). New `safe-html.js` strips scripts, inline event handlers and `javascript:` links from everything the apps put on screen — in the Back Office, the till and the platform admin page. Tested with hostile text in every field type.
- **Data loss fixed:** suppliers were never saved to the account — they vanished on reload and a demo supplier appeared for every new business. They are now saved and synced like customers.
- **Speed:** Sales by Product and the Back Office start-up froze for ~38 s with 3,000 products and 20,000 receipts; now about half a second. The bot's reorder answer went from ~1 s to ~30 ms on the same data.
- **Accessibility:** new `a11y.js` adds missing field names, page landmarks, a page heading and keyboard access to scrollable tables (automated checker: 0 serious/critical issues on every Back Office screen, the till and the website).
- **Database hardening:** `supabase/hardening.sql` pins the search path of the two security helper functions (also applied in `schema.sql` for new projects).
- **Hosting headers:** clickjacking protection (`X-Frame-Options`), referrer policy and a camera-only permissions policy on every page except the already-locked admin page.
- Small fixes: a duplicated field in the till's receipt data, low-contrast "Remember me" text on the till sign-in.

## Phase 27 — Exact design, sharper and richer
- The Phase 22 design, unchanged (serif headings, tagline, photos, flag footer), with the HD laptop, tablet and phone screens (2560 × 1600, 2200 × 1600, 1170 × 2532) re-exported with richer colour and deeper contrast without clipping highlights.
- The four business photos are re-sampled to 1280 px with the same colour treatment.
- Verified that every device screen paints on every load at 2× density (12 of 12 loads).
- 121 automatic checks.
- Open item: the product tiles in the POS pictures still show illustrations; real photographs need to be supplied.

## Phase 26 — Original design, with HD screens
- The website is back to its original (Phase 22) design: the original serif headline typeface, the "POS & INVENTORY" tagline, the photo background and business cards, and the flag footer.
- **Kept:** the high-resolution laptop, tablet and phone screens (2560 × 1600, 2200 × 1600, 1170 × 2532) re-captured from the real application, with higher-quality WebP and a lift in contrast and vibrancy. Each ships in two sizes and the browser picks the right one, so ordinary screens stay fast and sharp displays get full resolution. The Features page pictures and the social-share image are upgraded too.
- 121 automatic checks (the original 111 plus 10 for the reset and the HD screens).

## Phase 22 — The public AUREUM website
- New public website: **Home, Features, Pricing, About, Support** — static pages in the AUREUM forest-green and gold style, with the real Back Office dashboard, POS checkout and receipt shown on a laptop, tablet and phone. Source in `site-src/`, built by `node tools/build-site.mjs`. See `SITE-GUIDE.md`.
- **Free Trial** opens the real Back Office on **Create Business**; **Log in** opens it on **Sign In**; Open POS and Back Office go to the real pages. `backoffice.html` now accepts `?mode=signup` / `?mode=signin` (no parameter = unchanged).
- **`/` is now the website** (the redirect to the Back Office is removed; the Back Office is `/backoffice.html`). `sw.js` v22. Emailed sign-up/reset links that land on the home page are forwarded to the Back Office.
- Pricing page uses the application's real billing (US$5 per shop per month, 14-day trial, 3-day grace). Support points to the in-app AUREUM Bot and tickets; contact details are left blank until real ones exist.
- Photos in the business cards and hero are stand-ins to be replaced. Watch Demo says "Coming soon" until a video is configured.

## Phase 21 — Product pictures: far more to choose from
- The **picture finder searches many more free-to-use sources at once**: Open Food Facts, **Open Beauty Facts, Open Pet Food Facts, Open Products Facts** and Wikimedia Commons. Openverse is still one tap away.
- **Exact barcode match**: if the product has a barcode, the finder shows that exact product first.
- **Show more pictures** pages through every source; a simpler wording of the name (without sizes) is tried automatically; results can be filtered by source.
- **Optional stock libraries — Pixabay, Pexels, Unsplash** — when the owner adds their own free key (kept on that device only).
- **Bring in a picture from anywhere**: paste a picture's web address, paste a copied picture (Ctrl+V), drag a picture or a picture from another web page onto the box, or use new **Bing** and **DuckDuckGo** shortcuts beside Google. If a website doesn't allow copying, **Try another way** (free image service wsrv.nl, sent only the picture's web address, only when asked).
- Credits are saved with every picture; the owner is reminded that pictures from ordinary websites are usually copyrighted.
- AUREUM Bot knows the new options (3 help entries). See IMPORT-AND-IMAGES.md.
- Note: it is not possible to search "every image online" directly — there is no free, open image search an app can use, and most pictures online are copyrighted. This covers every free-to-reuse source that can be searched without a paid service, plus easy ways to bring in anything else.

## Phase 20 — AUREUM Bot replaces the live AI (no external service, no subscription)

The Help screen's assistant is now **AUREUM Bot**, a built-in guide instead of a call to an AI service:
- **No AI, no internet, no key, no subscription.** It searches an internal library of ~120 questions and answers (`help-bot/kb.js`)
  with a small search engine (`help-bot/engine.js`) embedded in the Back Office. It works offline and sends nothing anywhere.
  A test proves the code contains no network calls, no storage, no eval and no AI-service names.
- Understands plurals, typos and synonyms; says how sure it is; shows "I think you're asking about…", a short "which one do you mean?"
  menu, related questions, **Did this answer your question? Yes / Not really**, and browse-by-topic buttons. Uses the current screen to
  settle vague questions. In app-store builds its billing answers give no payment instructions.
- **Honest by design:** when nothing fits it says "I couldn't find an answer" and offers **Send this to support**; asking for a human, or
  questions only your team can handle (refund disputes, missing data, bugs), go to the ticket button. The chat is attached to the ticket.
- Accuracy (questions written after tuning): ~92% reach the right answer first time; 9 of 10 unanswerable questions correctly declined.
  A cross-check test compares the library with the real app (menus, tabs, every switch label, prices, thresholds, buttons).
- **Removed:** the `help-agent` function, the Anthropic key, daily-limit counters (`help_usage`) and the AI knowledge file.
  Run `supabase functions delete help-agent` if you deployed it. Tickets and the control-panel Support tab are unchanged.
- New: `tools/build-bot.mjs` (copies the library + engine into backoffice.html). See `SETUP-HELP.md`.

## Phase 19 — $5 per shop (card only), help assistant, support tickets

### Billing: $5 per shop per month, Stripe only
- **Price is now $5 × the number of shops.** Free trial: every shop included. Checkout charges for the shop count read
  from the database (a browser can't change it). **Paynow is removed** for subscriptions (people already paid up keep access
  until their period ends and are asked to subscribe by card).
- **Adding a shop on a paid plan**: the owner sees "$10 → $15 a month" and confirms; Stripe charges the prorated amount
  immediately; **if the card is declined the shop is not added**. Both doors (Settings → Stores and the shop dropdown) use the same rule.
- **Removing a shop** lowers the next invoice by $5 (never charges, no refund for the month already paid).
- A **database rule** (`shop-billing.sql`) stops a paid card subscription adding a shop it hasn't paid for, even by editing
  data directly. Trials, complimentary accounts, removals and renames are never blocked; accounts with more shops than they pay for
  are not locked out (they get an "Update subscription to cover all N shops" button).
- The webhook now records shops paid for, follows plan changes made in Stripe (`customer.subscription.updated`), and no longer
  treats the small mid-month "new shop" invoice as a new billing period.
- New function `billing-stripe-shops`. Billing screen shows plan, shops, monthly total; lock-out screen is card-only.
  See `SETUP-BILLING.md` (rewritten). App-store builds never show payment buttons.

### Help assistant and support tickets (the AI part was replaced by the built-in AUREUM Bot in Phase 20)
- **Settings → Help & FAQ** is now three tabs: **Ask the assistant**, **Help topics** (the existing FAQ), **My tickets**; plus a
  **Help & support** button in the sidebar with a red dot when your team has replied.
- **The assistant** (`help-agent` function, Claude) answers from a ~3,500-word AUREUM knowledge base written from the real app,
  plus safe account facts (role, plan, shop count, screen). It cannot see or change business data, is told never to invent
  features, offers a ticket when it can't help, replies in the user's language, and has daily limits per person and business.
  A test cross-checks the knowledge against the app (menus, tabs, every switch label, prices, thresholds, buttons).
- **Tickets**: customers send a ticket (category, urgency, message, optional chat transcript). You answer from the control
  panel's new **Support** tab (filters, search, replies shown as "AUREUM Support", internal notes, status/priority/assign, audit log).
  Customers read only their own tickets and never your internal notes; they can't write to the tables directly or forge a reply.
- See `SETUP-HELP.md`.

### Deploy checklist (in order)
1. Run `supabase/shop-billing.sql` and `supabase/support-schema.sql` in the SQL Editor.
2. `supabase functions deploy billing-stripe-checkout admin-manage`, `supabase functions deploy billing-stripe-webhook --no-verify-jwt` (Stripe sends no Supabase sign-in token, so this flag is required) and
   `supabase functions deploy billing-stripe-shops`; `supabase functions delete billing-paynow-initiate` and then `supabase functions delete billing-paynow-webhook` (one name per command).
3. Stripe webhook: add the event `customer.subscription.updated`.
4. (No key is needed — the AI assistant was replaced in Phase 20.)
5. Push to GitHub; hard-refresh devices.

## Phase 18 — Settings switches that work (Taxes, Receipts, Payment Methods, Notifications, Users & Permissions)

### Root cause: the switches could not be moved
Every Settings switch was wired to flip **twice** per click (one handler for all switches, and a second one added for
Settings), so it went on and straight back off — it looked frozen, and "Save" just stored the screen's starting
positions. Fixed: one handler. A small "Unsaved changes — press Save" hint now shows next to Save when something moved.

### Every switch now does what it says
- **Taxes** — *Prices include tax* now shows the true state. *Apply tax to all new products by default* needed
  something to apply to, so products now have a **Charge tax on this product** switch (Products → add/edit) whose
  starting position is that setting. **Existing products stay taxed exactly as before** (verified identical on 600
  random carts). Tax-free items carry no tax; a discount is shared across lines; refunds apportion tax by the taxed
  lines only and always add up to the receipt to the cent (150 random mixed receipts refunded in random pieces).
- **Receipts** — header and footer messages were never printed; now they print on screen and on the thermal printer
  (HTML typed in them is shown as plain text). *Show logo*, *Show cashier* now work on screen and thermal.
  *Print automatically* prints after each new sale (USB printer if connected, else the browser print window; never
  for old receipts). *Email receipt* is a button that opens your email app with the receipt written out (addressed to
  the customer when their email is known).
- **Payment Methods** — the *Other* button now follows its switch (relabelled "Other (vouchers, bank transfer, store
  credit…)", which is what the till's Other button really is). *Split payments* is marked **Coming soon** and disabled
  because the till has no split-payment feature yet.
- **Notifications** (alerts appear while the Back Office is open): *Low stock alerts* controls the dashboard low-stock
  list (negative stock is always shown); *New sale*, *Refund* and *Shift opened/closed* pop-ups when a till does that
  (never for old activity, max 4 at once); *Daily sales summary* shows yesterday's sales the first time you open the
  Back Office each day. (Email delivery isn't possible without an email service, so the daily summary is in-app.)
- **Users & Permissions** (cashiers; managers/admins can always) — *Can apply discounts*, *Can process refunds*,
  *Can view Today's Sales*, *Can change an item's price at checkout* (new: tap the price on the ticket; this ticket
  only; the product price never changes; the receipt keeps the list price), and *Requires PIN* are enforced at the till.
- Changes made in the Back Office reach the tills within seconds, with no reload.

### One-time safe migration
Because the switches never worked, anything "saved" before is just the old starting positions. On first open after
this update they are put back to how the till actually behaved (Today's Sales still allowed, Other payment still shown,
cashier refunds off, PIN required…) so nothing changes by surprise. Settings that really were in effect (tax rate,
prices include tax, logo) are left alone. **If you ever pressed Save on the Taxes page, "Prices include tax" was
stored as ON — check it.**

## Phase 17 — Product codes, any-spreadsheet import, picture finder, GRN spacing, Z Fold dropdowns (2026-10)

### Product codes — every product always has one
- Two causes of missing/repeated codes fixed: a new product's suggested code was `100000 + list length + 1`
  (repeated after any deletion), and clearing the box saved the product with **no code**.
- New codes continue after the **highest** numeric code in use (100007, 100008…), skipping any taken.
- **Products already in the system without a code get one automatically** when the Back Office opens, and it is
  saved to the account. Existing codes are never changed.
- A code another product already has is refused (the message names that product); blank is never saved.
  Only the Back Office assigns codes, so the till and Back Office can never invent different codes.

### Product import — any Excel or CSV file
- **Only Product Name is needed.** Category, Price, Cost and Stock are optional (blank → Others / 0 / 0 / 0).
  The old import refused any file without a Price column and skipped rows without a valid price.
- Columns are matched by name automatically (many spellings: ITEM, Selling Price (USD), Qty, Department…) and
  can be matched **by hand** for any heading. Report titles above the headings are skipped; a list with no
  headings works ("first row contains headings" switch). Excel (.xlsx/.xls) and CSV (comma, semicolon, tab).
- Numbers are read the way people write them: `$1,200.50`, `1.234,50`, `12,50`, `R 45`; unreadable values become 0
  and are reported. 13-digit barcodes stored as numbers in Excel stay exact.
- **A preview before anything is saved:** what was matched, how many are ready, what will be skipped and why, and
  the product code each one will get. Downloadable Excel/CSV template.
- Stock goes to **one shop — the one you choose** (it used to land on the first shop silently).
  Same-name products are skipped and listed, never overwritten. Handles thousands of rows (3,000 in ~0.5 s).

### Product pictures
- **Find a picture online**: searches free-to-reuse libraries only — Open Food Facts, Wikimedia Commons and (on
  request) Openverse. NonCommercial/NoDerivatives pictures are excluded; each saved picture keeps its credit.
  Only the product name is sent, only when you press Search.
- **Search Google Images** button opens Google in a new tab (Google's image-search API is closed to new customers
  and ends 1 Jan 2027, so an app can't read Google's results).
- **Pictures are now shrunk** (max 480px JPEG) when added — including normal uploads. Previously a raw phone photo
  (several MB) was stored inside the business record.

### Saved Goods Received / detail tables
- Quantity and Expiry no longer run together: the detail tables had zero horizontal padding. There is now a clear
  gap between columns (48px between Quantity and Expiry), checked on desktop, Z Fold and phone.
- The saved-GRN footnote wrongly said to "delete and re-receive"; GRNs can't be deleted — it now says to record a
  Stock Adjustment.

### Dropdowns / date filters (Z Fold, tablets, short screens)
- Root cause: any dropdown that didn't fit below its button was always flipped above it — even when there was less
  room above. The ~640px date picker landed at −474px (off the top of the screen) on a Z Fold and on short laptops;
  on phones one dropdown also landed 257px off the right edge.
- Now: opens below when it fits, above only if it fully fits there, otherwise stays below, nudges the page and
  scrolls inside itself so every date and the Apply button are reachable. Verified for 210 dropdown openings
  across 10 screen sizes (both Z Fold shapes, tablets, phones, short laptops).

### Groundwork for app stores (inactive until used; fully tested)
- **Installable and works offline**: web app manifests (Back Office and POS install as separate apps), icons, and a
  service worker that keeps the apps, fonts and libraries on the device. It always asks the network first for the
  app screens (so updates arrive on the next open) and never touches data requests.
- Fonts, the Supabase client and the Excel library are now **hosted by AUREUM** (`/vendor`) instead of Google
  Fonts / a CDN: nothing is sent to third parties on opening the app, and the till opens with no internet.
- **Store-app mode** (`?store=1`, remembered; `?store=0` turns off): shows subscription status only — no payment
  buttons, wording or links — because Apple and Google require their own billing for paid access sold in a store app.
- vercel.json: headers for the service worker, manifests, static files and `nosniff`.
- Not included yet: in-app account deletion and privacy/terms pages (required by both stores) — still to do.

## Phase 16 — Swipe paging, receipt table, per-cashier shifts, alert views, GRN/transfers, password eye (2026-10)

### Product list (POS)
- **Swipe left / right** on a touch screen to move between pages. Only a deliberate, mostly-horizontal
  flick counts (60px+, under 0.8s): normal scrolling, short flicks, pinch-zoom, and swipes on the category
  chips or search box are ignored, and a swipe never adds a product. A small hint shows on touch devices.
- The product cards are now only redrawn when something visible changes. Previously a background refresh
  replaced the cards under a finger mid-swipe, so the gesture was occasionally lost.

### Receipts
- Items are shown as an aligned table: **Product · Quantity · Cost · Total**, on screen, on paper, and on
  the thermal printer (headings, then each item with Qty / Cost / Total in fixed columns; long names wrap).

### Shifts — now one per cashier
- **Each cashier has their own shift** at a shop: own opening float, own sales, own expected cash. Money
  from different cashiers is never mixed. A second cashier signing in starts their own shift while the first
  keeps running until it is closed.
- Sign-in tells each cashier about THEIR shift ("Your shift SH-4 is open…" / "You have no open shift… starts
  your own") and mentions other cashiers' shifts open at the shop.
- A cashier can close **their own** shift; managers/administrators can close **anyone's** (the Shift panel
  lists other cashiers' open shifts for them, and says so clearly when closing someone else's). Only
  managers/admins can open the closed-shifts list (now filterable by cashier).
- Refunds are recorded on the shift of whoever processes them (the cash comes from their drawer).
- Reports → Shifts (Back Office) shows the cashier for open and closed shifts.
- Shifts opened before this update belong to whoever opened them; their receipts are matched by shift id.

### Dashboard alerts
- "View all" on **Negative stock** shows only negatives; on **Low stock** only low stock. The Low Stock report
  has a switch (Everything / Negative stock / Low stock, with counts), a Shop column, and starts from
  Everything when opened from the tab. The dashboard and the report share one calculation.

### Goods Received
- **Measurement removed.** Quantity now comes before Expiry in the entry form, the saved view and the PDF
  (the form had them in the opposite order to the saved view, and the PDF had no expiry). The PDF now
  includes the expiry date. Stored data was never swapped.

### Transfers
- Saved transfers open **on screen** (row click or VIEW): from/to shop, date, status, each product with the
  quantity moved and stock before → after at both shops. Download PDF is still available inside the view
  and from the list.

### Passwords
- Show / hide **eye icon** on every password field (sign-in, reset, change password) and the cashier PIN, in
  the Back Office, POS and admin panel. Keyboard accessible, doesn't steal focus, keeps the numeric keypad for
  PINs, and re-hides when the app is backgrounded.

## Phase 15 — Real shifts, item-by-item refunds, today's sales, alerts layout, sidebar (2026-10)

### Shifts (see SHIFTS-GUIDE.md)
- **A shift is now a work period at a shop, not a browser session.** It opens (with an optional
  cash float) at the first sign-in and **stays open** — through reloads, other cashiers, other
  devices and other days — until a manager closes it. Signing in on a later day **continues** the
  shift with its original start time instead of starting a new one. Previously every page load or
  new day silently started a "new shift" and the old one's sales were left out of the close.
- Sign-in says whether a shift is already open (warning if it's from an earlier day) and offers
  "Continue Shift" / "Start Shift". The top bar's **Shift** button shows "since <date>" when a shift
  is left over from a previous day.
- **Closing** (managers/admins): sales by payment type, refunds, net sales, expected cash =
  float + cash sales − cash refunds, counted cash, over/short, and a **required note if it doesn't
  balance**. Only managers/admins can close; signing out never does.
- **Shift report** shown on closing and **printable** (browser, USB and Bluetooth thermal printers).
  Live "Print summary" available mid-shift.
- **Closed shifts** can be found again: at the till (date filter, paging, tap to reopen and
  re-print) and in **Back Office → Reports → Shifts** (also lists shifts open now). Old-format
  closures still appear.
- Two tills opening at the same moment can't leave two open shifts; the same shift closed on two
  devices keeps one record; a shift closed elsewhere is noticed and the next sale opens a new one.

### Refunds
- **No Refund button on the sales list.** Open a receipt → **Refund items…** → choose products
  and quantities (nothing pre-selected) → optional reason. Managers/admins only.
- Discount and tax are refunded in proportion, tax-inclusive sales are handled, stock goes back
  to the shop it was sold from, an item can't be refunded more than it was sold, and several
  partial refunds add up to exactly the original total. The sales list tags receipts
  "Partly refunded" / "Refunded"; receipts list the refunds made against them; the Back Office
  receipts screens say "partly/fully refunded".

### Today's Sales
- The till's sales list now shows **only today's** sales and refunds for the shop, with a day total.

### Dashboard alerts (Back Office)
- Negative stock (left) and low stock (right) are separate columns with a dividing line. Each
  says **"You have N negative-stock / low-stock items"**, lists **5**, and has **View all N**
  (opens Reports → Low Stock). Each side says when all is well. Stacks on small screens.

### Back Office sidebar
- The footer (name, **full email**, sync status, **Open POS Checkout**, **Sign out**) is stacked
  so nothing is cut off — the old single row was 30px wider than the sidebar, hiding the Open POS
  button. The sidebar scrolls to reach it; verified at several laptop heights and on a phone.

### Also fixed
- **Money is stored in whole cents.** Sales used to be saved with floating-point noise (a 10%
  discount sale as 12.420000000000002).
- **Sign-in screens couldn't scroll** and the card was a fixed 340px, so on a small/short phone
  the button could be unreachable. Both apps fixed.
- Phone top bar fits with the new Shift button (sync label shows as a dot on phones).

### Worth knowing
- After updating there is no open shift; the first sign-in starts one.
- Shift sales are matched by shop and time — keep each till's clock correct.
- Refunds made before this update (whole-receipt) remain as they were.

## Phase 14 — Safe saving (records no longer disappear), product paging/sorting, PO history, date filters (2026-10)

### Fixed — records disappearing (root causes, reproduced)
- **Every sale at the till deleted expenses, purchase orders, goods received, stock
  adjustments and transfers from the server.** Each app saved by replacing the
  whole business document with only the sections it knew; the till doesn't know
  those five, so it wiped them. The Back Office didn't know shift closures and
  wiped those. This is why records vanished "after some time" or after logging out.
- **A failed load was treated as a new business** and an empty copy was saved over
  the real data (Back Office and till).
- **The browser cache was shared between businesses**, so one business's data could
  appear in another on the same browser.
- **The offline queue stored a whole old copy** that could overwrite newer data later.
- Document numbers: PO/GRN/SA numbers came from list length (re-used after any
  loss), transfers restarted at TR-1001 on every reload, and CSV goods-received
  imports used a random number.

### How saving works now
- Each save re-reads the server's latest copy and **three-way merges** this app's
  changes into it (using the last-synced copy as the common ancestor): sections an
  app doesn't know are kept, records added on different devices are all kept,
  deletions stick, stock/customer counters combine as differences.
- **Compare-and-swap**: a save only lands if nobody saved in between; otherwise it
  re-reads, re-merges and retries. A save whose reply was lost is recognised and
  not applied twice.
- **Nothing is written before a successful load**; a failed load shows a message and
  retries. Offline edits are kept per business on the device and merge on reconnect.
- **Database safeguards** (`supabase/data-safety.sql`): version number, safe-save
  function, a guard that rejects the old overwrite-everything path, and rolling
  restore points (every 6 hours, newest 12).
- **Data recovery** (Settings → Business Profile): restores records an older version
  left only on this device; ignores demo data; can't create duplicates.
- New records get a unique id; saved documents keep an exact copy of each line.

### Added / changed
- **POS product list is paged** (12 / 24 / 48 per page, remembered) and **sortable**:
  A–Z, Z–A, Category, Quantity high→low / low→high. Search also matches code and
  barcode.
- **Purchase Orders:** Measurement column removed; each saved PO records the exact
  product, quantity, unit cost and line total (plus extra costs and subtotal in the
  detail view). Same exact-line snapshot for goods received, adjustments, transfers.
- **Date filters** on Purchase Orders and Transfers (new), and a real **"All time"**
  option, now the default, on Purchase Orders, Goods Received, Stock Adjustments and
  Transfers (the old GRN/Adjustment filters said "Today" while showing everything).
  A range with no results says so.
- **Reports:** Inventory, Valuation, Category summary, Low stock and Staff are all
  paged; KPI cards still total the whole list.
- Paging helper keeps the page valid when a filter shrinks the list (no empty table).

### Worth knowing
- Records the **server** already lost can't be re-created by this update (free
  Supabase plan has no backups); use Data recovery on the device where you last saw them.
- Refresh (Ctrl+Shift+R) every till and browser after deploying. Un-refreshed tabs are
  rejected by the guard and show "Sync problem" until they do — nothing is lost.
- The Measurement column is still on Goods Received (only Purchase Orders was changed).

## Phase 13 — Receipt accuracy, negative stock, sales history, phone layout (2026-10)

### Fixed — receipts & sales history (root causes found)
- **Receipt numbers were random.** The next sale's number was picked at random
  between 512 and 551, so numbers repeated within a handful of sales. The Back
  Office opened a receipt by looking up its number, so clicking a repeated
  number showed a **different sale's** products and totals. Numbers are now
  strictly sequential, and every receipt also carries a hidden unique key that
  all lookups use, so two receipts can never be confused again.
- **Old receipts that share a number now each open their own contents** (the
  hidden key is derived for receipts created before this fix). Their printed
  numbers are left as they were.
- **Sales history (POS) was broken by my Phase 10 work.** It read fields
  (`orderNo`, `time`, `itemCount`) that saved receipts don't have, so every row
  was blank, and refunds looked the sale up by the same missing field, so a
  refund could never find its sale. In Phase 11 I checked the wrong object and
  wrongly concluded this was already fixed — it wasn't. Rewritten around one
  receipt record shape used by sales, history, refunds and printing.
- **Sales history rows now show** receipt number, date/time, item count, value
  and payment type; **tap a row for the full receipt** — time, cashier, shop,
  every product with quantity and unit price, subtotal, discount, tax, total,
  tendered and change. Refunds appear as red negative entries linked to the
  sale they reverse.
- **Old receipts printed the *current* cashier and shop** rather than their own.
  Fixed on screen and on the thermal printer.
- **Refunds** now work, restore stock to the shop the item was sold from, get
  their own number (R0575), reverse the customer's order count/spend, and
  can't be done twice.
- **Back Office receipt detail** shows Subtotal, Discount, Tax and Grand total
  (it used to show only the grand total, so receipts with a discount or tax
  didn't appear to add up), labels tax-inclusive sales, and shows refunds as
  negatives. The receipts list gains an **Items** column (quantity × product).
- **"Total amount" on the Receipts page added refunds instead of subtracting
  them.** It is now net of refunds, and "Total number of receipts" no longer
  counts a refund as an extra sale.

### Fixed — stock
- **A sale at zero stock was never deducted.** Stock was clamped at 0 in both
  apps, so selling something the system thought was out of stock silently
  discarded the deduction and inventory drifted from reality. Stock can now go
  **negative**, as requested.
- **Negative stock is flagged on the Back Office dashboard**, shop by shop (the
  "All Shops" total could hide one shop being negative behind another's surplus),
  naming the product, the shop and the exact count. It is shown in red in the
  POS catalogue and the Products list.
- Stock Adjustment screens showed `max(0, …)` for "Reduce"; they now show the
  real resulting figure. Inventory valuation counts only stock that physically
  exists (oversold units aren't a negative asset).

### Fixed — POS on phones and small screens
- On a phone the page was wider than the screen (a product column and the top-bar
  buttons were cut off) and the ticket + **Complete Sale** were pushed below the
  bottom of the screen and unreachable. New phone layout (≤700px): the catalogue
  fills the screen, a bottom bar shows the live item count and total, and tapping
  it opens the ticket full-screen with the selected items, payment options and a
  pinned Complete Sale button; "Back to products" returns.
- **Tablets keep the product list and ticket side by side.** Landscape phones too.
- **Pinch-zoom in/out is enabled**, and a very narrow screen zooms out or scrolls
  sideways rather than clipping.

### Worth knowing
- **Your existing stock figures may be too high.** Any sale made while a product
  showed 0 was never deducted under the old behaviour. Do a stock count and
  correct with Stock Adjustments (Override). From now on deductions are exact.
- Hard-refresh (Ctrl+Shift+R) the apps after deploying so devices don't run
  cached older code.

## Phase 12 — Platform Control Panel, real subscription enforcement (2026-10)

### Added
- **Control Panel at `/admin`** (`admin.html`) for managing every business's
  account and subscription: search and filter all accounts, see exactly what
  each one can currently do (free trial, active, locked out, suspended…),
  and for any account: **extend the free trial**, **extend the paid
  subscription** (recorded as a $0 manual entry in their payment history),
  grant or remove **complimentary (exempt) access**, or override the status
  (active / past due / cancelled / suspended).
- **Admin access list.** Choose which emails can use the panel. Super admins
  can add/remove admins from inside the panel; regular admins can use it but
  not change who has access. Only confirmed-email accounts on the list get in.
- **Activity log** of every change: who did it, to which business, and what.
- Dashboard cards (Total / Trial / Active / Past due / Cancelled / Suspended /
  Complimentary) that double as one-click filters; server-side search and
  pagination so it stays fast with thousands of accounts.
- `SETUP-ADMIN.md` with the setup steps.

### Security
- Every control-panel action is checked **on the server** (valid session →
  confirmed email → on the allowlist) by the new `admin-manage` edge function.
  Hiding buttons in the browser is not what protects it; the database tables
  behind it have no client access at all.
- All business-supplied text (names, owner emails) is escaped in the panel, so
  a malicious sign-up name can't run code in an admin's browser.
- **Hardening:** removed two leftover client-side INSERT policies
  (`businesses`, `profiles`). Sign-up creates those rows through the
  `on_auth_user_created` trigger, so the policies weren't needed — but they
  would have let a signed-in user insert their own business row with
  `is_exempt = true` or a far-future trial date.

### Fixed — found while building this
- **Expired trials were a dead end.** A business whose trial ended (or whose
  subscription was cancelled) saw a message and a Sign Out button — no way to
  pay. The lock-out screen now shows **Pay with Card (Stripe)** and **Pay with
  Paynow** buttons. (Suspended accounts don't get them, since paying wouldn't
  fix that.)
- **Paid subscriptions never expired.** Nothing locked out an account whose
  paid period had ended, so one Paynow payment (or a manual extension) lasted
  forever. Active accounts are now locked out **3 days** after their period
  end date (grace period for late renewal webhooks). Stripe renewals update
  the end date automatically, so card subscribers are unaffected.
- Billing screen showed an unstyled badge for past-due/cancelled accounts.

### Changed
- Month-based extensions clamp to the end of the month (Jan 31 + 1 month =
  Feb 28/29, not Mar 3).
- `backoffice.html` tolerates the new `is_exempt` column not existing yet, so
  deploy order doesn't matter.

### Worth knowing
- **Behaviour change for existing accounts:** any account currently marked
  *Active* whose period end date has already passed (e.g. an old Paynow
  payment) will be locked out 3 days after deploy. Check the Accounts tab
  filtered to *Active* first and extend anyone you want to keep.
- The **POS does not check subscription status** — a locked-out business can
  still ring up sales at the till. This was already the case; it's a business
  decision whether the till should lock too, so it's unchanged.

## Phase 11 — Smart import, responsive layouts, more pagination, employee calendar (2026-09)

### Fixed
- **Product import now uses real smart column matching** — strips things
  like "(USD)" and punctuation, and recognizes many real-world header
  variants ("In hand stock", "Sub category", "Unit cost", etc.), so files
  exported from other POS systems can be imported without renaming every
  column to match ours exactly. Missing product codes are now
  auto-generated instead of left blank.
- **Recent Sales "undefined" values** — the function was already
  rewritten in Phase 10 to pull from real synced data and the field
  names check out correctly; added defensive fallbacks for any
  older/malformed records just in case, so a missing field now shows a
  safe default instead of the word "undefined".
- **Sidebar cut off at the bottom** (email/sign out/switch to POS not
  reachable) — a CSS Grid default was preventing the sidebar's own
  scroll from ever engaging even though it was configured correctly.
  Fixed (`min-height:0` on the grid item).
- **Receipt detail view** (Overview → Receipts → View) now shows a real
  line-item table: Product name, Quantity, Cost, Total — instead of a
  single condensed line per item.

### Added
- **Responsive layout pass** for both Back Office and the POS:
  - Back Office: every data table now scrolls horizontally on narrow
    screens instead of clipping or squishing columns; added a proper
    phone-sized breakpoint (≤600px) tightening KPI cards, forms, and
    toolbars to one column.
  - POS: tablets (641–900px) now keep the product list and ticket side
    by side as requested, just narrower — only genuinely phone-width
    screens (≤640px) stack vertically. Previously anything ≤900px
    (including iPad portrait) was stacking.
- **Pagination extended** to Sales by Products, Purchase Orders, GRN,
  Stock Adjustments, and Transfers (Products and Receipts already had it
  from Phase 10) — same reusable 10/20/30/50-per-page control throughout.
- **Employee Calendar** — Employees page now has two tabs: **Employee
  List** (unchanged) and **Calendar**, a real month view where clicking
  any day lets you log which employees worked and how many hours, with
  a running monthly hours/days-worked summary per employee below it.

### Confirmed already working (no change needed)
- **Owner/Administrator POS → Back Office access + shift close**: this
  was already built (Phase 4 and Phase 7) — any employee with the
  "Administrator" or "Shop Manager" role can open Back Office from the
  till and gets the full shift-close/cash-reconciliation flow when
  ending a shift. If the business owner wants this personally, add
  themselves in Back Office → Staff with the Administrator role and a
  PIN — there's no separate "Owner" role at the POS level since the
  underlying login is already the owner's own account.
- **Barcode scanning**: already fully implemented. Any USB or Bluetooth
  barcode scanner works automatically with zero setup (standard
  "keyboard wedge" mode, the same approach Square/Shopify POS use) — it
  matches against a product's Barcode field *or* its Product code. See
  the chat reply for how to actually assign a barcode to a product.

## Phase 10 — Pagination, real CSV/Excel import-export, refunds, settings-clobbering bug (2026-09)

### Fixed — likely the real cause of the recurring "settings buttons not working" reports
- Found a genuine, plausible root cause: any background sync (e.g. a sale
  made at the POS in another tab, or any other device syncing anything)
  triggered a full re-render in Back Office that unconditionally reset
  every Settings toggle back to its last-*saved* state — silently
  reverting a switch the owner had just clicked but not yet saved. If
  Back Office and the POS were open at the same time (a very normal way
  to test), a toggle click could get wiped out within a second or two,
  looking exactly like "the button doesn't work." Settings now only
  re-pull saved state when the page is first opened, not on every
  background sync while already sitting on it.

### Added
- **Pagination** on Products and Receipts (the two longest-growing
  lists) — page controls with a 10/20/30/50 rows-per-page selector,
  instead of one continuous scroll. Built as a reusable component, so
  extending it to other lists (Customers, Employees, Suppliers, PO/GRN/
  Stock Adjustments/Transfers) is straightforward if wanted next.
- **Product CSV/Excel import now matches the system's real column names**
  ("Product name", "Product code", "In stock", etc. — the exact headers
  the export produces) instead of different short aliases, so an
  exported file can be re-imported without renaming anything. Also
  expanded to support Barcode and Description columns, not just the
  handful before. Excel (.xlsx) import added alongside CSV.
- **Excel export** added next to CSV everywhere export already existed
  (Products, Receipts, Purchases, GRN, Stock Adjustments, Transfers,
  Accounting, Billing payment history — 12 places in total).
- **Refunds, restricted to Shop Manager / Administrator roles** — the POS
  had no way to refund a sale at all before this. Recent Sales now shows
  a Refund option (managers/admins only) that reverses the sale, restores
  stock, and records it as a linked refund receipt. Full-sale refund for
  now, not partial/line-item.

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
