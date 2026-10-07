# Help assistant and support tickets

Customers get two things in **Back Office → Settings → Help & FAQ** (and the **Help & support** button at the bottom of the left menu):
- **Ask the assistant** — an AI chat that knows AUREUM (every menu, setting, price and rule) and explains how to do things. It **cannot see or change** a business's data.
- **My tickets** — a message to your team. You answer from the control panel (**/admin → Support**). Replies appear inside the customer's ticket with a red dot on their Help button. (There is no email notification yet.)

## 1. Run the SQL (once)
Supabase → SQL Editor → run `supabase/support-schema.sql` (after `schema.sql`). It creates the ticket tables and the daily-usage counter.
Protection: a business can only read **its own** tickets; your **internal notes are never visible to customers**; customers can't write to the tables directly or forge a support reply; ticket creation is rate-limited (5 per hour per business).

## 2. Give the assistant its brain (Anthropic API key)
1. Create an account at https://console.anthropic.com and an API key. **Set a monthly spend limit there** — it is your safety net.
2. Add it as a Supabase secret (never in the app files):
```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
Optional secrets:
```
supabase secrets set HELP_AGENT_MODEL=claude-haiku-4-5-20251001   # cheaper & faster (default is claude-sonnet-5-5)
supabase secrets set HELP_USER_DAILY_LIMIT=60                      # questions per person per day (default 60)
supabase secrets set HELP_BUSINESS_DAILY_LIMIT=400                 # per business per day (default 400)
```
Without a key the chat says it "isn't connected yet" and points customers to a ticket — nothing breaks.
**Cost:** you pay Anthropic per question. The large fixed part (the product knowledge) is cached, so it is cheap, and the daily limits cap any one person or business. Failed or limited questions are never counted or charged.

## 3. Deploy
```
supabase functions deploy help-agent
supabase functions deploy admin-manage      # updated: adds the ticket actions
```

## 4. Answering tickets (control panel → Support)
- **Open** = waiting for you. **Waiting for customer** = you replied. **Resolved / Closed** = done. A customer reply reopens a solved ticket.
- Open a ticket to read it (including the customer's earlier chat with the assistant, so you can see what was already tried).
- **Send reply** → the customer sees it as "AUREUM Support" (your own email is never shown to customers) and gets a red dot. **Send & resolve** answers and solves. **Add internal note** is only for your team.
- Set priority and **Assign to me**. Every reply, note and change is in the **Activity log** (without copying what was written).
- The Support tab shows a badge with the number of open tickets (a "!" when one is urgent).

## 5. What is sent to Anthropic
Only the person's question and the recent conversation, plus: their role, plan status, trial days left, number of shops, and the screen they are on. **Never** business names, email addresses, products, sales, customers or sign-in details. Mention this in your privacy policy.

## 6. Keeping the assistant accurate
Its knowledge lives in `supabase/functions/help-agent/knowledge.md`. When AUREUM changes (a new setting, price, menu name):
1. Edit `knowledge.md` (use the exact words shown on screen).
2. Run `node tools/build-knowledge.mjs` to regenerate `knowledge.ts`.
3. Redeploy: `supabase functions deploy help-agent`.
The assistant is told to answer only from this knowledge, say when it isn't sure, and offer a ticket instead of guessing.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Chat says "isn't connected yet" | `ANTHROPIC_API_KEY` secret missing, or `help-agent` not deployed |
| Chat says "isn't connected properly" | the API key is wrong or has no credit |
| "very busy" / "took too long" | Anthropic is overloaded; retry in a minute |
| My tickets says "aren't available yet" | `support-schema.sql` not run |
| Control panel Support tab says "not set up yet" | `support-schema.sql` not run, or `admin-manage` not redeployed |
