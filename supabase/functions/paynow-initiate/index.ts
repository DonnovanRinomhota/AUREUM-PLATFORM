// supabase/functions/paynow-initiate/index.ts
// Called by pos-checkout.html when payMethod === 'mobile'.
// Starts a Paynow "Express Checkout" (mobile-only) transaction against
// the CALLING BUSINESS's own Paynow integration ID/key, so EcoCash /
// OneMoney payments settle straight into their own Paynow account.
//
// Paynow reference: https://developers.paynow.co.zw/docs/mobile_only.html
// Verify field names/hash rules against Paynow's current docs before
// going live — payment gateway APIs occasionally change.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha512HexUpper(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
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
      .select("paynow_integration_id, paynow_integration_key")
      .eq("business_id", profile.business_id)
      .maybeSingle();
    if (!settings?.paynow_integration_id || !settings?.paynow_integration_key) {
      throw new Error("EcoCash/OneMoney isn't connected yet. Add your Paynow ID and key in Back Office → Settings.");
    }

    const { phone, method, amount, reference } = await req.json();
    if (!phone || !amount || !reference) throw new Error("Missing phone, amount, or reference.");

    const functionsBase = Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", ".supabase.co");
    const fields: Record<string, string> = {
      id: settings.paynow_integration_id,
      reference: String(reference),
      amount: Number(amount).toFixed(2),
      additionalinfo: "AUREUM POS sale",
      returnurl: `${functionsBase}/functions/v1/paynow-poll`,
      resulturl: `${functionsBase}/functions/v1/paynow-poll`,
      authemail: userData.user.email || "no-reply@example.com",
      phone: String(phone),
      method: method === "onemoney" ? "onemoney" : "ecocash",
      status: "Message",
    };

    // Paynow hash = SHA512(values concatenated in field order + integration key), hex, uppercase
    const concatenated = Object.values(fields).join("") + settings.paynow_integration_key;
    fields.hash = await sha512HexUpper(concatenated);

    const initResp = await fetch("https://www.paynow.co.zw/interface/remotetransaction", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    });
    const initText = await initResp.text();
    const parsed = parseUrlEncoded(initText);

    if ((parsed.status || "").toLowerCase() !== "ok") {
      throw new Error(parsed.error || "Paynow rejected the request.");
    }

    const label = fields.method === "onemoney" ? "OneMoney" : "EcoCash";
    return new Response(
      JSON.stringify({
        pollUrl: parsed.pollurl,
        instructions: `Ask the customer to check their phone and approve the ${label} prompt.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
