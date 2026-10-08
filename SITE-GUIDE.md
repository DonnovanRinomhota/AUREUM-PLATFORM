# The AUREUM public website

The website is the front door to the application. It is five plain static pages — **Home, Features, Pricing, About, Support** — built from small components, with almost no JavaScript (under 4 KB) and no outside services (no analytics, no external fonts).

```
VISITOR → website (/) → Start Free Trial → Back Office "Create Business" → Back Office → POS Checkout
RETURNING USER → website (/) → Log in → Back Office "Sign In"
```

## Where every button goes (set in one file: `site-src/config.js`)
| Button | Goes to |
|---|---|
| Free Trial / Start Free Trial | `/backoffice.html?mode=signup` — the real Back Office, opened on **Create Business** |
| Log in / Login | `/backoffice.html?mode=signin` — the real Back Office, on **Sign In** |
| Back Office | `/backoffice.html` |
| Open POS / POS Checkout | `/pos-checkout.html` |
| Watch Demo | a dialog that says the demo is coming (plays a real video once you set one — see below) |

Sign-in, account creation and **Forgot password** are the application's own (Supabase). The website has no forms and no fake authentication.

## What changed in the existing application (three small, deliberate edits)
1. **`backoffice.html` accepts `?mode=signup` and `?mode=signin`.** It is a few lines after the sign-in screen is created. With no parameter, or any other value, nothing changes. This is the only way the Free Trial button can open account creation, because the app had no route of its own.
2. **`/` is now the website.** `vercel.json` used to redirect `/` to the Back Office; that redirect is removed. **The Back Office is at `/backoffice.html`** (it always was; `/` just forwarded there). The installed apps open `/backoffice.html?source=pwa`, so installed copies are unaffected. To revert: add `{"source":"/","destination":"/backoffice.html","permanent":false}` back under `redirects`.
3. **`sw.js`** (version v22): `/` is now treated as the website offline, falling back to the Back Office only if the website has not been saved.

## One Supabase setting to check (important)
Supabase sends sign-up confirmation and password-reset emails that return to the project's **Site URL**. If yours is `https://aureum-platform.vercel.app/`, set it to **`https://aureum-platform.vercel.app/backoffice.html`** (Supabase → Authentication → URL Configuration). As a safety net, the home page already forwards any link that arrives with an email token (`#access_token=…`, `type=recovery`, `type=signup`) to the Back Office with the token intact — but the setting is the clean fix. Password-reset emails already return to the Back Office page itself.

## Editing the website
Everything lives in `site-src/`. After any change run **`node tools/build-site.mjs`** (Node only, nothing to install) and commit the result.
- **Words, links, features, pricing, FAQs** → `site-src/config.js`. The hero wording is exact; change it only on purpose.
- **Pricing** → `PRICING` in the config (matches the app's billing: US$5 per shop per month, 14-day trial, 3-day grace).
- **Demo video** → set `DEMO.videoUrl` to an `.mp4`/`.webm` link or a YouTube/Vimeo link and rebuild. The button then plays it (YouTube uses the privacy-friendly player).
- **Support contact details** → fill `SUPPORT.email`, `SUPPORT.phone` and/or `SUPPORT.whatsapp`; they then appear on the Support page. They are blank on purpose: nothing is invented. People who can't sign in at all currently have no way to reach you except "Forgot password", so adding one is worth doing.
- **Colours, spacing, animation** → `site-src/assets/site.css`.
- **Pages / sections** → `site-src/pages/` and `site-src/components/`.

## Pictures (please read)
Images are in `site/assets/img/`. Replace any picture by dropping a new file **with the same name** and keeping the proportions.
- **`card-bakery/retail/grocery/fashion.webp` and `hero-bg.webp` are stand-ins**, cropped from the design mock-up you supplied (about 640 px wide). Replace them with your own photographs of real businesses — ideally about 1280 × 800 for the cards and 2400 × 1200 for the background.
- **`screen-dashboard-*.webp`, `screen-pos-*.webp`, `screen-receipt-*.webp` are real, high-resolution screenshots of the application** with sample data. Each comes in two sizes — the laptop 1280 and 2560 px wide, the tablet 1100 and 2200, the phone 780 and 1170 — and the page serves the light one to ordinary screens and the full-resolution one to sharp (high-density) displays. To refresh them, capture the real screen at 2× or 3× pixel density (laptop 1280 × 800 → 2560 × 1600; tablet 1100 × 800 → 2200 × 1600; phone 390 × 844 → 1170 × 2532), export as WebP at quality ~90, and keep the file names.
- `og-image.jpg` is the picture shown when a link is shared (1200 × 630).
- Compress to WebP before adding.

## Not on the website yet
- **Privacy policy and terms pages.** None exist, so none are linked. You will need them before a commercial launch or an app-store release.
- **Analytics.** None, by design.
- **A "contact us" form.** Support runs through in-app tickets; add contact details above if you want visitors to reach you another way.

## Typography
Every heading, number and the logo use **Inter** in bold (the same family as the application), so the whole site is one clean, upright sans-serif. There is no serif or italic font anywhere. To change the look, edit `--ff-head` and `--ff-sans` at the top of `site-src/assets/site.css`.

## What was tested
111 automatic checks in real Chrome, including: every link on every page resolves and no link is empty or "#"; Free Trial, Log in, Open POS and Back Office each go to the right real destination; the hero wording is word-for-word; four business cards and five "What We Offer" items; sign-up/sign-in deep links open the right tab in the real Back Office; no sideways scrolling at 11 screen widths (360–1920) on all pages; the mobile menu and the demo dialog (including with a real video configured); keyboard access, reduced-motion and no-JavaScript behaviour; titles, descriptions, canonical links, social tags and structured data; no outside requests; no unsupported claims; prices and features match the real application; and that emailed sign-up/reset links reach the Back Office.
