# Setting up the Control Panel

The Control Panel lives at **`/admin`** (for example
`https://aureum-platform.vercel.app/admin`). It's where you manage every
business's account and subscription — extend a free trial, extend a paid
period, give someone free access, or suspend an account.

It is separate from each business's own Back Office. Only emails on an
allowlist can get in, and that is enforced on the server, not just hidden in
the page.

## 1. Run the database changes

Supabase dashboard → **SQL Editor → New query** → paste in
`supabase/admin-schema.sql` → **Run**. Scroll down after running and check
there's no red error text.

This adds the allowlist, the activity log, the "complimentary access" flag,
and two server-only lookup functions. It also removes two old client-side
INSERT permissions that weren't needed any more (sign-up creates the business
through a trigger) — your sign-up flow is not affected.

## 2. Add the emails that should have access

Only after step 1 has run successfully. In the SQL Editor, run this **on its
own** with your real emails — as many rows as you like (`true` = super admin,
`false` = regular admin). Include yourself as a super admin:

```sql
insert into public.platform_admins (email, is_super) values
  ('you@example.com',       true),
  ('partner@example.com',   false),
  ('colleague@example.com', false)
on conflict (email) do nothing;
```

Check it worked:

```sql
select email, is_super from public.platform_admins order by created_at;
```

Each email must already have an AUREUM account (sign up in the Back Office
first if needed) and its email must be confirmed. You can add more people
later from inside the panel without touching SQL.

> **"relation public.platform_admins does not exist"?** That means step 1
> hasn't been run in this Supabase project. Open `supabase/admin-schema.sql`,
> select **all** of it, paste it into a new SQL Editor query, and click Run
> first. Then run the insert above.

## 3. Deploy the function

From your project folder:

```bash
supabase functions deploy admin-manage
```

No extra secrets are needed — it uses the ones Supabase already provides.

## 4. Publish the page

```bash
git add -A
git commit -m "Add platform control panel"
git push
```

Vercel redeploys on its own. Then open `/admin` on your site and sign in.

## 5. Give other emails access

In the panel → **Admin access** tab → type the email → **Add**.

- Tick **Super admin** only for people who should also be able to add and
  remove other admins. Everyone else can manage accounts but can't change who
  has access.
- Each person needs their own AUREUM account **with a confirmed email**
  before they can get in. Only add addresses that already have accounts, and
  keep "Confirm email" switched on in Supabase (Authentication → Providers →
  Email).
- You can't remove your own access (so you can't lock yourself out).

## What each control does

| Control | What it does |
|---|---|
| **Extend free trial** | Adds days to the trial end date. A trial that already ended restarts from today. A cancelled account goes back to *trial*. |
| **Extend subscription** | Adds days or months to the paid period and marks it active, without a payment. Shows in the customer's payment history as a $0 "Complimentary (admin)" entry. Extends from the current end date if it's still running, otherwise from today. |
| **Complimentary access** | Free, unlimited access — no trial limit, no payment. Good for partners, friends, staff. Removing it puts them back on their normal rules (which may lock them out immediately). |
| **Account status** | Manual override: trial / active / past due / cancelled / suspended. **Suspended** blocks sign-in completely, even for complimentary accounts. |

Every change is recorded in the **Activity log** with who did it.

The coloured box at the top of an account always says in plain words what
that business can do *right now* (e.g. "Locked out — free trial ended Oct 3").

## Things to know before you rely on it

- **Lock-outs are now real.** An account whose paid period ended more than 3
  days ago is locked out of the Back Office (the 3 days covers late renewal
  notices). Locked-out owners now see **Pay** buttons on the lock-out screen
  instead of a dead end. Before deploying, open **Accounts**, filter to
  *Active*, and extend anyone you don't want locked out.
- **The POS does not check subscriptions.** A locked-out business can still
  use its till. That's unchanged — decide whether you want the till to lock too.
- **Dates are shown in your browser's timezone**; the underlying values are
  stored in UTC.
- If the panel says "Could not reach the server", the `admin-manage` function
  isn't deployed yet (step 3).
