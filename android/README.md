# AUREUM Android apps

Two separately installable apps built with **Capacitor** around the existing AUREUM web code and the same Supabase backend.

| | Back Office | POS Checkout |
|---|---|---|
| Folder | `android/backoffice` | `android/pos` |
| Application ID | `com.aureum.backoffice` | `com.aureum.pos` |
| Opens | `/backoffice.html?store=1&app=backoffice` | `/pos-checkout.html?store=1&app=pos` |
| Native extras | file save/share | file save/share, camera barcode scan (ML Kit), Bluetooth-LE receipt printer + cash drawer |
| Permissions | Internet | Internet, Camera, Bluetooth |
| Icon | gold "A" coin | gold "A" coin + "POS" band |

## How it loads (important)
Each app loads the live site from `https://aureum-platform.vercel.app` (only that host and `*.supabase.co` are allowed). One origin means the sign-in session, offline queue and service-worker cache all live in one place. If the site cannot be reached at launch (first start offline, or an outage), the app shows a branded **recovery page** bundled inside the app, which retries automatically when the network returns. After the first successful load the web app's own service worker keeps working offline, exactly as the website does.
*Why not "bundled first, website second"?* Two different origins would each hold their own copy of unsynced sales, and a till could strand sales on the wrong one. If you prefer bundled-first later, it is a config change plus a migration step; ask before doing it.

## What reaches the apps automatically, and what needs a Play release
| Change | Reaches installed apps | Needs new Play release |
|---|---|---|
| Edit HTML/CSS/JS in `backoffice.html`, `pos-checkout.html`, shared `.js` | Yes, after Vercel deploys `main` (and the service worker version `sw.js` is bumped) | No |
| Supabase SQL, RLS, edge functions, business rules | Yes, immediately | No (keep it backward compatible) |
| Website pages, privacy policy | Yes | No |
| Native code, permissions, plugins, app name/icon, target API, signing, package id | No | **Yes** |
| A web change that needs a newer native build | Raise `minNativeVersionCode` in `app-compat.json`; older apps then show "please update" | Yes (upload first) |

Rules that keep this safe: no downloading or running new native code; the web UI is ordinary web content loaded over HTTPS from one fixed host; Google Play review still covers each uploaded build.

## Build (no Android Studio needed)
GitHub → Actions → **Android build** → Run workflow (choose app, version code, version name). It produces a debug APK (install on a phone to test) and, if signing secrets exist, a signed `.aab`. See `docs/SIGNING.md`.
Local build (needs JDK 21 + Android SDK): `cd android/pos && npm ci && npx cap sync android && cd android && ./gradlew assembleDebug`.

## Regenerating icons
`python3 android/make-icons.py` (reads `/icons/icon-maskable-512.png`). Replace that master with your final artwork any time and re-run.

## Known limits (honest list)
- **Not yet run on a real phone, printer or drawer.** Native pieces were tested against mocks only (see `docs/TEST-REPORT.md`).
- **Bluetooth printers:** only printers that expose the common BLE UART services work (same two services as the browser version). Printers that use classic Bluetooth (SPP), which many cheap 58/80 mm printers do, will not be found. A classic-Bluetooth plugin can be added in a later build once you tell me the printer model. USB printers are not supported in the app yet.
- **Printing:** "Print Receipt" shares the receipt as text (Android's share sheet / any print-capable app). A true A4/80 mm PDF print service is not built.
- Camera scan uses Google's code-scanner module (needs Google Play Services; it downloads once on first use).
- No push notifications, and offline selling is the web app's existing offline queue, unchanged.
