// supabase/functions/billing-stripe-shops/index.ts
// AUREUM costs $5 per shop per month. This function keeps the Stripe subscription's QUANTITY equal to the
// number of shops a business pays for. Only the business OWNER can use it, and only for their own business.
//
// Actions (POST JSON { action, ... }):
//   status     what the subscription covers, what it costs, and a rough price for adding one more shop
//   add        buy ONE more shop slot — Stripe charges the prorated $5 for the rest of this period RIGHT NOW,
//              and if the card is declined nothing changes (so a shop is never added without payment)
//   sync_up    make the subscription cover every shop the business already has (charged now, prorated)
//   reconcile  after shops were removed: lower the quantity so NEXT month's invoice is smaller (no refund
//              for the current month; never charges anything)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PRICE_PER_SHOP_USD = 5;
const MAX_SHOPS = 100;

class HttpError extends Error {
  status: number; code?: string;
  constructor(status: number, message: string, code?: string) { super(message); this.status = status; this.code = code; }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function stripe(path: string, key: string, method = "GET", form?: Record<string, string>) {
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body.error) {
    const e = body.error || {};
    const declined = resp.status === 402 || e.type === "card_error" || e.code === "card_declined";
    throw new HttpError(declined ? 402 : 502,
      declined ? `Your card was declined, so nothing was changed. ${e.message || ""}`.trim()
               : `Stripe couldn't complete that: ${e.message || "unknown error"}`, e.code);
  }
  return body;
}

// rough price of the extra shop for the rest of this billing period (Stripe works out the exact amount)
function estimateNow(business: any): number | null {
  if (!business.current_period_start || !business.current_period_end) return null;
  const start = new Date(business.current_period_start).getTime(), end = new Date(business.current_period_end).getTime(), now = Date.now();
  if (!(end > start) || now >= end) return null;
  const left = Math.max(0, Math.min(1, (end - now) / (end - start)));
  return Math.round(PRICE_PER_SHOP_USD * left * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("PLATFORM_STRIPE_SECRET_KEY");
    if (!key) throw new HttpError(500, "Billing isn't connected yet — the platform owner needs to set PLATFORM_STRIPE_SECRET_KEY.");

    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) throw new HttpError(401, "Not signed in.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) throw new HttpError(401, "Invalid session.");

    const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", userData.user.id).maybeSingle();
    if (!profile) throw new HttpError(404, "No business found for this account.");
    if (profile.role !== "owner") throw new HttpError(403, "Only the business owner can manage billing.");
    const { data: business } = await supabase.from("businesses").select("*").eq("id", profile.business_id).maybeSingle();
    if (!business) throw new HttpError(404, "Business not found.");

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const live = business.billing_processor === "stripe" && !!business.stripe_subscription_id && !business.is_exempt;
    const shopCount = Math.max(0, Number(business.shop_count) || 0);

    // what the subscription really covers: ask Stripe (it is the truth); fall back to what we last recorded
    let quantity: number | null = null, itemId: string | null = null, subStatus: string | null = null;
    if (live) {
      const sub = await stripe(`subscriptions/${encodeURIComponent(business.stripe_subscription_id)}`, key);
      const item = sub.items?.data?.[0];
      quantity = Number(item?.quantity) || 1; itemId = item?.id || null; subStatus = sub.status || null;
    }
    const covered = live ? quantity! : (business.shops_paid ?? null);

    if (action === "status") {
      return json({
        ok: true, subscribed: live, processor: business.billing_processor || null, status: business.subscription_status,
        exempt: !!business.is_exempt, shopCount, shopsPaid: covered, pricePerShop: PRICE_PER_SHOP_USD,
        monthlyNow: covered ? covered * PRICE_PER_SHOP_USD : null, monthlyIfAllShops: Math.max(1, shopCount) * PRICE_PER_SHOP_USD,
        estimateNow: estimateNow(business),
      });
    }

    if (!live) throw new HttpError(400, "There is no active card subscription for this business.");
    if (!["active", "trialing"].includes(subStatus || "")) {
      throw new HttpError(400, "Your subscription isn't active right now — update your payment method first, then try again.");
    }
    if (!itemId) throw new HttpError(502, "Couldn't read your subscription from Stripe. Please try again.");

    const setQuantity = async (q: number, chargeNow: boolean) => {
      if (q < 1 || q > MAX_SHOPS) throw new HttpError(400, `A subscription can cover between 1 and ${MAX_SHOPS} shops.`);
      await stripe(`subscriptions/${encodeURIComponent(business.stripe_subscription_id)}`, key, "POST", {
        "items[0][id]": itemId!, "items[0][quantity]": String(q),
        proration_behavior: chargeNow ? "always_invoice" : "none",
        ...(chargeNow ? { payment_behavior: "error_if_incomplete" } : {}),
      });
      await supabase.from("businesses").update({ shops_paid: q }).eq("id", business.id);
      return q;
    };

    if (action === "add") {
      // a shop slot is already paid for and unused → nothing to charge (also protects against a double click)
      if (quantity! > shopCount) return json({ ok: true, charged: false, shopsPaid: quantity, monthlyNow: quantity! * PRICE_PER_SHOP_USD });
      const q = await setQuantity(quantity! + 1, true);
      return json({ ok: true, charged: true, shopsPaid: q, monthlyNow: q * PRICE_PER_SHOP_USD });
    }
    if (action === "sync_up") {
      const target = Math.max(quantity!, shopCount);
      if (target === quantity) return json({ ok: true, charged: false, shopsPaid: quantity, monthlyNow: quantity! * PRICE_PER_SHOP_USD });
      const q = await setQuantity(target, true);
      return json({ ok: true, charged: true, shopsPaid: q, monthlyNow: q * PRICE_PER_SHOP_USD });
    }
    if (action === "reconcile") {
      const target = Math.max(1, shopCount);
      if (quantity! <= target) return json({ ok: true, changed: false, shopsPaid: quantity, monthlyNow: quantity! * PRICE_PER_SHOP_USD });
      const q = await setQuantity(target, false);
      return json({ ok: true, changed: true, shopsPaid: q, monthlyNow: q * PRICE_PER_SHOP_USD });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: (err as Error).message || "Something went wrong.", code: (err as HttpError).code }, status);
  }
});
