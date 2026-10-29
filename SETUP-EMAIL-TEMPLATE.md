# Sign-up confirmation email — turn it ON first

AUREUM sends **no email itself**: Supabase does. The app now shows a "Check your email" screen
(with Resend, and a friendly message if someone tries to sign in before confirming), but the email
only goes out when this is switched on in Supabase:

1. Supabase dashboard → **Authentication → Providers → Email** (older dashboards: *Sign In / Up*)
2. Turn **Confirm email** ON → Save.
3. **Authentication → URL Configuration**: set **Site URL** to `https://aureum-platform.vercel.app`
   and add `https://aureum-platform.vercel.app/backoffice.html` under **Redirect URLs** (the
   confirmation link brings the person back there and signs them in).
4. Before real customers sign up, add your own sender: **Project Settings → Authentication → SMTP Settings**
   (Supabase's built-in sender is rate-limited to a few emails per hour and often lands in spam).

If "Confirm email" is OFF, people are signed in immediately and no email is sent — the app handles both.

---

# Customizing the "Welcome / Confirm Email" message

This part isn't code — it's a template inside Supabase's dashboard.

1. Supabase dashboard → **Authentication → Email Templates**
2. Select **"Confirm signup"**
3. Replace the body with something like this (edit the POS link to your real domain):

```html
<h2>Welcome to AUREUM 🎉</h2>
<p>Your business account is ready. Click below to confirm your email and get started:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my account</a></p>

<hr>

<h3>Next steps</h3>
<p><strong>1. Sign in to Back Office</strong> — manage products, staff, and reports:<br>
<a href="https://aureum-platform.vercel.app/backoffice.html">https://aureum-platform.vercel.app/backoffice.html</a></p>

<p><strong>2. Open the till (POS)</strong> — where you and your staff ring up sales:<br>
<a href="https://aureum-platform.vercel.app/pos-checkout.html">https://aureum-platform.vercel.app/pos-checkout.html</a></p>

<p><strong>3. Add staff PINs</strong> — Back Office → Staff → add each employee with a 4-digit
PIN. At the till, they'll select the shop, then their name, then enter
their PIN to start a shift.</p>

<p>Questions? Check Back Office → Settings → Help &amp; FAQ.</p>
```

4. Click **Save**.

Supabase also has a separate **"Reset Password"** template (same menu) — the
default one already works fine with the password-reset flow just added, but
you can customize its wording the same way if you'd like.

Note: while your Stripe key is still in test mode and the site is still
being tested, some email providers may flag Supabase's default sending
address as spam — worth checking your spam folder during testing, and
consider setting up a custom SMTP sender (Settings → Auth → SMTP Settings)
before real customers sign up, so emails reliably land in their inbox.


---

# Make the email come from "AUREUM" (not "Supabase Auth")

Supabase's built-in sender always shows as **Supabase Auth** and cannot be renamed. To send as AUREUM you connect your own
email sender (custom SMTP). This is a Supabase setting; nothing in the app code changes. Do it once:

1. Pick an email service and create a free account. Simple choices:
   - **Resend** (free about 3,000 emails/month) — best if you own a domain; you add 3 DNS records.
   - **Brevo** (free 300 emails/day) — can start from one verified sender address.
   - **Gmail / Google Workspace** with an *App password* — fine for low volume; the address shows as your Gmail but the **name** shows as AUREUM.
2. In that service, find the **SMTP** details (host, port, username, password / API key). Keep the password private. Never paste it in chat or commit it to GitHub.
3. Supabase → **Project Settings → Authentication → SMTP Settings** → switch on **Enable custom SMTP** and fill in:
   - **Sender email**: e.g. `no-reply@yourdomain.com` (an address the service has verified)
   - **Sender name**: `AUREUM`
   - Host, Port, Username, Password from step 2 → **Save**.
4. **Authentication → Emails → Confirm signup**: set **Subject** to `Confirm your AUREUM account` (and edit the message as in the section above).
5. Create a test account with a new email address: the message should now arrive from **AUREUM**.

# Signing in on the device that created the account

Since this update, the device where someone presses **Create Business** keeps the "Check your email" page open and signs itself in as soon
as the email is confirmed, even if the link is opened on a different phone or computer. The device that only opened the link shows
"Email confirmed" and is not signed in (it can still sign in by hand). The password is held in memory only while that page waits (up to 30
minutes) and is never saved. If that page was closed, the person simply signs in normally after confirming.
