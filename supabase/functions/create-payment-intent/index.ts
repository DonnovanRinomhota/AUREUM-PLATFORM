// supabase/functions/create-payment-intent/index.ts
// Called by pos-checkout.html when payMethod === 'card'.
// Looks up the CALLING BUSINESS's own Stripe secret key (set in
// Back Office → Settings → Payment Integrations) so each merchant's
// card payments go straight to their own Stripe account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
      .select("business_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile) throw new Error("No business found for this account.");

    const { data: settings } = await supabase
      .from("payment_settings")
      .select("stripe_secret_key")
      .eq("business_id", profile.business_id)
      .maybeSingle();
    if (!settings?.stripe_secret_key) {
      throw new Error("Card payments aren't connected yet. Add a Stripe secret key in Back Office → Settings.");
    }

    const { amount, currency } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid amount.");

    const amountInMinorUnits = Math.round(amount * 100);

    const stripeResp = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.stripe_secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountInMinorUnits),
        currency: (currency || "usd").toLowerCase(),
        "automatic_payment_methods[enabled]": "true",
      }),
    });

    const pi = await stripeResp.json();
    if (pi.error) throw new Error(pi.error.message);

    return new Response(JSON.stringify({ client_secret: pi.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
