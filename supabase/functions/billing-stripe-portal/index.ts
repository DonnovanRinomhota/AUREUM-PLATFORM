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
      .from("businesses").select("stripe_customer_id").eq("id", profile.business_id).maybeSingle();
    if (!business?.stripe_customer_id) throw new Error("No Stripe subscription found yet — subscribe first.");

    const { returnUrl } = await req.json();

    const resp = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ customer: business.stripe_customer_id, return_url: returnUrl || "https://example.com" }),
    });
    const portal = await resp.json();
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
