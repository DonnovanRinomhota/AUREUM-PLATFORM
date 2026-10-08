// supabase/functions/billing-paynow-initiate/index.ts
// Starts a payment for the AUREUM platform's $5/month Standard plan via
// Paynow's hosted "web" checkout — NOT the mobile-only Express Checkout
// used for in-store POS payments before. This one redirects the business
// owner to Paynow's own page, which supports EcoCash, OneMoney, Visa/
// Mastercard, ZimSwitch, and InnBucks depending on what their Paynow
// merchant account has enabled. Card/bank details are entered on Paynow's
// page only — never seen by this server.
//
// Honest limitation: Paynow doesn't offer Stripe-style silent auto-
// renewal — there's no "charge saved card automatically next month."
// Each period, the owner (or a reminder banner) triggers a new payment
// request here, which they complete on Paynow's page like the first one.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICE_USD = 5.00;

async function sha512HexUpper(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function parseUrlEncoded(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [k, v] = pair.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const integrationId = Deno.env.get("PLATFORM_PAYNOW_INTEGRATION_ID");
    const integrationKey = Deno.env.get("PLATFORM_PAYNOW_INTEGRATION_KEY");
    if (!integrationId || !integrationKey) throw new Error("Billing isn't connected yet — the platform owner needs to set PLATFORM_PAYNOW_INTEGRATION_ID/KEY.");

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
    if (!profile) throw new Error("No business found for this account.");
    if (profile.role !== "owner") throw new Error("Only the business owner can manage billing.");

    const { returnUrl } = await req.json();
    const base = returnUrl || "https://example.com";
    const reference = `AUREUM-SUB-${profile.business_id.slice(0, 8)}-${Date.now()}`;

    const functionsBase = Deno.env.get("SUPABASE_URL")!;
    const fields: Record<string, string> = {
      id: integrationId,
      reference,
      amount: PLAN_PRICE_USD.toFixed(2),
      additionalinfo: "AUREUM Standard Plan — 1 month",
      returnurl: `${base}?billing=paynow_return&ref=${reference}`,
      resulturl: `${functionsBase}/functions/v1/billing-paynow-webhook`,
      authemail: userData.user.email || "no-reply@example.com",
      status: "Message",
    };
    const concatenated = Object.values(fields).join("") + integrationKey;
    fields.hash = await sha512HexUpper(concatenated);

    const initResp = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    });
    const parsed = parseUrlEncoded(await initResp.text());
    if ((parsed.status || "").toLowerCase() !== "ok") throw new Error(parsed.error || "Paynow rejected the request.");

    // Record a pending row now so it shows in invoice history immediately;
    // the webhook will flip it to paid (or it'll just stay pending/absent
    // if abandoned) once Paynow confirms.
    await supabase.from("subscription_payments").insert({
      business_id: profile.business_id, processor: "paynow", amount: PLAN_PRICE_USD,
      currency: "usd", status: "pending", external_reference: reference,
    });

    return new Response(JSON.stringify({ url: parsed.browserurl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
