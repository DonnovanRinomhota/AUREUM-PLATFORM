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
