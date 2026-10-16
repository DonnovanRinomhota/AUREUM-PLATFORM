// supabase/functions/billing-stripe-portal/index.ts
// Opens Stripe's own hosted "Customer Portal" so the business owner can
// update or remove their card, or cancel — entirely on Stripe's side.
// We never see, store, or handle raw card details at any point.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeSecretKey = Deno.env.get("PLATFORM_STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Billing isn't connected yet.");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) throw new Error("Not signed in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData?.user) throw new Error("Invalid session.");

    const { data: profile } = await supabase
      .from("profiles").select("business_id, role").eq("id", userData.user.id).maybeSingle();
    if (!profile || profile.role !== "owner") throw new Error("Only the business owner can manage billing.");

    const { data: business } = await supabase
      .from("businesses").select("id, stripe_customer_id, stripe_subscription_id").eq("id", profile.business_id).maybeSingle();
    if (!business) throw new Error("Business not found.");

    const stripeGet = async (path: string) => {
      const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${stripeSecretKey}` } });
      return await r.json();
    };
    // Self-heal: if the payment went through but the Stripe ids were never saved (webhook missed), find them now.
    let customerId = business.stripe_customer_id as string | null;
    let subscriptionId = business.stripe_subscription_id as string | null;
    if (!customerId || !subscriptionId) {
      const found = await stripeGet(`subscriptions/search?query=${encodeURIComponent(`metadata['business_id']:'${business.id}'`)}&limit=5`);
      const sub = (found?.data ?? []).find((x: { status: string }) => ["active", "past_due", "trialing"].includes(x.status)) ?? found?.data?.[0];
      if (sub) {
        customerId = sub.customer; subscriptionId = sub.id;
        await supabase.from("businesses").update({ stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, billing_processor: "stripe" }).eq("id", business.id);
      }
    }
    if (!customerId) throw new Error("No card subscription was found for this account yet. If you just paid, wait a minute and refresh.");

    const { returnUrl, flow } = await req.json();
    const form: Record<string, string> = { customer: customerId, return_url: returnUrl || "https://example.com" };
    if (flow === "card") form["flow_data[type]"] = "payment_method_update";
    if (flow === "cancel" && subscriptionId) { form["flow_data[type]"] = "subscription_cancel"; form["flow_data[subscription_cancel][subscription]"] = subscriptionId; }

    const call = (f: Record<string, string>) => fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(f),
    }).then((r) => r.json());
    let portal = await call(form);
    if (portal.error && form["flow_data[type]"]) {   // the portal may not allow that flow yet: fall back to the plain portal
      delete form["flow_data[type]"]; delete form["flow_data[subscription_cancel][subscription]"];
      portal = await call(form);
    }
    if (portal.error) throw new Error(portal.error.message);

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
