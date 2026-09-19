// supabase/functions/billing-stripe-checkout/index.ts
// Creates a Stripe Checkout Session (subscription mode) for the AUREUM
// platform's own $5/month Standard plan — this is YOUR (the platform
// owner's) Stripe account charging YOUR customers, completely separate
// from the old per-shop card-processing that was removed from the POS.
//
// Card details are entered on Stripe's own hosted Checkout page and never
// touch this server or Supabase — we only ever store the resulting
// customer/subscription IDs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICE_USD = 5.00;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeSecretKey = Deno.env.get("PLATFORM_STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Billing isn't connected yet — the platform owner needs to set PLATFORM_STRIPE_SECRET_KEY.");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) throw new Error("Not signed in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) throw new Error("Invalid session.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile) throw new Error("No business found for this account.");
    if (profile.role !== "owner") throw new Error("Only the business owner can manage billing.");

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, stripe_customer_id")
      .eq("id", profile.business_id)
      .maybeSingle();
    if (!business) throw new Error("Business not found.");

    const { returnUrl } = await req.json();
    const base = returnUrl || "https://example.com";

    const form: Record<string, string> = {
      mode: "subscription",
      "managed_payments[enabled]": "false",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "AUREUM Standard Plan",
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][unit_amount]": String(Math.round(PLAN_PRICE_USD * 100)),
      "line_items[0][quantity]": "1",
      success_url: `${base}?billing=success`,
      cancel_url: `${base}?billing=cancelled`,
      client_reference_id: business.id,
      "metadata[business_id]": business.id,
      "subscription_data[metadata][business_id]": business.id,
    };
    if (business.stripe_customer_id) form.customer = business.stripe_customer_id;
    else form.customer_email = userData.user.email || "";

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form),
    });
    const session = await resp.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
