# Data safety — setting it up (Phase 14)

This update fixes records (expenses, purchase orders, goods received, stock
adjustments, transfers, shift closures) disappearing. **Do these three steps in
order.**

## What was going wrong
The Back Office and the till each saved by **replacing the whole business
document** with only the sections that app knew about. The till doesn't know
expenses / purchase orders / goods received / adjustments / transfers, so every
sale deleted them from the server. The Back Office doesn't know shift closures,
so every save deleted those. A failed load was also treated as a "new business"
and saved an empty copy over the real data.

Now every save **re-reads the server's latest copy and merges** into it, so
nothing an app doesn't know about is ever dropped, and records added on different
devices are all kept. Stock changes add up (a delivery of +30 and a sale of −3 at
the same moment give +27). Nothing is written until a load has succeeded.

## 1. Run the database update
Supabase → **SQL Editor → New query** → paste all of `supabase/data-safety.sql`
→ **Run**. It is safe to run again.

It adds a version number to the saved data, a save function that refuses
conflicting or section-dropping saves, a guard that blocks the **old** way of
saving, and rolling backups (one snapshot every 6 hours, newest 12 kept).

> You can deploy the apps first — they detect the missing update and still merge
> safely — but a banner will ask you to run the SQL, and the backups and the
> guard won't exist until you do.

## 2. Publish the new code
```bash
git add -A
git commit -m "Phase 14: safe saving, product paging/sorting, PO history, date filters, report paging"
git push
```

## 3. Refresh every device (Ctrl+Shift+R)
Every till and browser tab must load the new version. Until a device refreshes,
the database guard rejects its old-style saves and it shows **"Sync problem ·
retrying"** — that is the guard protecting your data, not a fault. Nothing is lost:
the device keeps its changes and syncs them as soon as it refreshes.

## The sync indicator (top bar)
| Shows | Means |
|---|---|
| Synced | Everything is saved to your account |
| Syncing… | A save is in progress |
| Offline · … saved on this device | No connection; changes are kept here and sync later |
| Sync problem · retrying | The server rejected or didn't answer; it retries automatically |
| Synced · update needed | Saving safely, but `data-safety.sql` hasn't been run yet |
| "Can't load your data" screen | The server couldn't be reached on start-up. Nothing was changed; it retries on its own |

## Getting back records that already went missing
Anything the **server** already lost can't be re-created by this update (the free
Supabase plan has no backups). But older versions kept a copy in the browser:

1. On the device where you last saw the missing records, open
   **Settings → Business Profile → Data recovery → Check this device**.
2. It lists what that device has that your account doesn't (demo records are
   ignored). Click **Restore** to save them to your account. Running it twice
   cannot create duplicates.

Do this *before* much other work on that device. From now on, SQL restore points
exist too — see the comments at the bottom of `data-safety.sql`.

## Optional hardening (later)
Once every device has refreshed, you can remove the apps' direct write permission
so **only** the safe save function can write — the two `drop policy` lines at the
bottom of `data-safety.sql`. Don't run them before all tills are updated.

## Good to know
- **Document numbers** (PO-, GRN-, SA-, TR-) now continue from the highest existing
  number. They used to be derived from list length (or random, or restart at
  TR-1001 on reload), so numbers could repeat.
- **Saved documents keep an exact copy of each line** — product name, quantity,
  unit cost, line total — so history is right even if a product is renamed or
  deleted later. Records saved before this update show the product's current name.
- A device that stays offline for a very long time keeps its changes in browser
  storage (about 5 MB). Reconnect and let it sync before storage fills.
