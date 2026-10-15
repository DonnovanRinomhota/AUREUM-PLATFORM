# Test report (actual results, 2026-10-15)

## Run and passed
- Existing node suites: bot-insights 61, fiscal-connector 52, fiscal-core 35, fiscal-countries 55, fiscal-rules 14, guide-journeys 267, labels 51: all passed.
- Browser (Playwright/Chromium) regression of web apps on desktop and 390 px phone: Back Office billing/navigation/view-only, phone overflow audit, POS cart/receipts/print CSS, guides (auto-driver both apps), barcode scan, label printing, till login: no failures, no page errors.
- Autofill/“Any date” fix: all text inputs in Back Office, POS, admin checked; none start with stray values.
- Native bridge (with a simulated Capacitor environment): store-app mode applied; USB button hidden; camera-scan result adds the product to the cart; BLE write path sends the exact ESC/POS bytes as hex; cash-drawer kick over BLE; Print shares receipt text; blob download is saved and shared; store-mode view-only strip has no Subscribe button.
- Config: `vercel.json`, `app-compat.json`, workflow YAML parse; no secret keys found in repo by the CI grep.
- Capacitor projects generated and synced for both apps (targetSdk/compileSdk 36, minSdk 24).

## NOT run (and why)
- **No Android build was run here**: the Android SDK cannot be downloaded in this sandbox. The first GitHub "Android build" run is the first real compile. Fix anything it reports before trusting the artefacts.
- No testing on a physical Android device, real Bluetooth printer, cash drawer, camera, or tablet; no Play pre-launch report; no accessibility run on the native shell.
- Tenant/shop isolation (RLS) penetration tests, payment-failure/idempotency tests and dependency vulnerability scan (`npm audit`) are still outstanding.
