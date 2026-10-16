// supabase/functions/delete-account/index.ts
// "Delete my account" for a business OWNER (Settings -> Business Profile, and the Google Play account-deletion requirement).
// What it does, in this order, and stops at the first failure so nothing is half-deleted by surprise:
//   1. checks the caller is signed in and is the owner of the business
//   2. re-checks their password
//   3. cancels the Stripe card subscription (so they are never billed again)
//   4. deletes the business row (the database cascades to products, sales, customers, employees, tickets, payments...)
//   5. deletes every login (owner + staff) of that business
// Stripe keeps its own payment records (financial law). Secrets used: SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY (all provided by Supabase) and PLATFORM_STRIPE_SECRET_KEY (already set for billing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Use POST." }, 405);
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Not signed in." }, 401);
    const { password } = await req.json().catch(() => ({}));
    if (!password || typeof password !== "string") return json({ error: "Enter your password to confirm." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user || !user.email) return json({ error: "Invalid session." }, 401);

    const { data: profile } = await admin.from("profiles").select("business_id, role").eq("id", user.id).maybeSingle();
    if (!profile) return json({ error: "No business found for this account." }, 400);
    if (profile.role !== "owner") return json({ error: "Only the business owner can delete the account." }, 403);
    const businessId = profile.business_id as string;

    // 2. password re-check (a stolen open session must not be enough to wipe a business)
    const pw = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });
    if (!pw.ok) return json({ error: "That password is not correct." }, 400);

    const { data: business } = await admin.from("businesses").select("id, stripe_subscription_id").eq("id", businessId).maybeSingle();
    if (!business) return json({ error: "Business not found." }, 404);

    // 3. stop the billing first; if Stripe cannot be reached we stop here and delete nothing
    const stripeKey = Deno.env.get("PLATFORM_STRIPE_SECRET_KEY");
    if (business.stripe_subscription_id && stripeKey) {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(business.stripe_subscription_id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        if (e?.error?.code !== "resource_missing") return json({ error: "Could not cancel your subscription, so nothing was deleted. Please try again or contact support." }, 502);
      }
    }

    // 4. delete the business (cascades). Fiscal receipts restrict device deletion, so clear them first.
    const { data: members } = await admin.from("profiles").select("id").eq("business_id", businessId);
    await admin.from("fiscal_transactions").delete().eq("business_id", businessId);
    const { error: delErr } = await admin.from("businesses").delete().eq("id", businessId);
    if (delErr) return json({ error: "Could not delete the business data. Nothing else was changed." }, 500);

    // 5. delete every login of the business, the owner last
    const ids = (members ?? []).map((m: { id: string }) => m.id).filter((id: string) => id !== user.id);
    ids.push(user.id);
    let failed = 0;
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) failed++;
    }
    return json({ ok: true, loginsNotRemoved: failed });
  } catch (_err) {
    return json({ error: "Something went wrong. Nothing was deleted." }, 500);
  }
});
