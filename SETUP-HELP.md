# AUREUM Bot and support tickets

Customers get two things in **Back Office → Settings → Help & FAQ** (and the **Help & support** button at the bottom of the left menu):

- **Ask AUREUM Bot** — a built-in guide. It is **not a live AI**. It searches AUREUM's own help library (about 120 questions and answers, written from how the app really works), explains how to do things in short steps, and offers related questions. It needs **no internet, no account with anyone, no key and no subscription** — everything lives inside the app. It cannot see or change a business's data.
- **My tickets** — when the Bot can't answer (or the person asks for a human), it offers **Send this to support**. The chat is attached to the ticket so you can see exactly what was asked. You answer from the control panel (**/admin → Support**). Replies appear in the customer's ticket with a red dot on their Help button. (There is no email notification yet.)

## What you need to do
**Only the ticket tables:** run `supabase/support-schema.sql` once in the Supabase SQL Editor (after `schema.sql`). Without it the Bot still works; the ticket screens just say they are not available yet.

If you deployed the earlier AI version (`help-agent`), remove it — it isn't used any more:
```
supabase functions delete help-agent
```
and you can delete the `ANTHROPIC_API_KEY` secret (`supabase secrets unset ANTHROPIC_API_KEY`). Nothing is sent to any AI company.
If an earlier `support-schema.sql` created the unused table `help_usage`, it is harmless; remove it with `drop table if exists public.help_usage;`.

## How the Bot behaves
- It understands plurals, common typos ("refudn", "recieve"), and synonyms ("store/shop", "delete/remove", "cashier/clerk").
- It says how sure it is: a clear match answers directly; a likely match says "I think you're asking about…"; a vague question gets a short menu ("which one do you mean?"); and when nothing fits it says **"I couldn't find an answer"** and offers the ticket button. It never makes up an answer.
- Questions about money already taken, lost data, bugs, accounts and anything only your team can do get the guidance it has **plus** the ticket button. Asking for "a human" goes straight to the ticket.
- It uses the screen the person was on to settle vague questions (on *Customers*, "how do I add one?" explains adding a customer).
- **Did this answer your question? — Not really** gives related topics and the ticket button.
- In an **app-store build** (`?store=1`) its billing answers give no payment instructions or prices, only "managed from your account on the web".

## Measured accuracy (be realistic)
On questions written *after* the library and engine were tuned (so not used to improve it), it reached the right answer about **92%** of the time on the first try, and correctly declined to answer **9 of 10** questions the library genuinely doesn't cover. It is not perfect — that is exactly why the ticket button is always one tap away. Tickets are your signal: **read the attached chats to see what people asked that the Bot missed, then teach it.**

## Teaching the Bot something new
Everything it knows is in **`help-bot/kb.js`**. Each entry is one line like:
```
E('id', 'Topic', 'Title shown to the user',
  ['ways people ask it', 'another way', 'a third way'],
  'extra search words',
  `The answer. Use **bold** for buttons and numbered lines (1. 2. 3.) for steps.`,
  ['related-id-1', 'related-id-2'])
```
1. Edit `help-bot/kb.js` (add an entry, or add a new phrasing to an existing one — that is the usual fix for a missed question).
2. Run `node tools/build-bot.mjs` — it copies the library and engine into `backoffice.html`.
3. Commit and push. Press Ctrl+Shift+R on devices.
Use the **exact words shown on screen** for menus and buttons. When the app changes (a new setting, a new price), update the matching entry. (If you give me the change, I will update the library and run the accuracy checks that compare it with the app.)

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| My tickets says "aren't available yet" | `support-schema.sql` not run |
| Control panel Support tab says "not set up yet" | `support-schema.sql` not run, or `admin-manage` not redeployed |
| The Bot gives a wrong or odd answer | send it to me, or add that wording to the right entry in `help-bot/kb.js` and rebuild |
