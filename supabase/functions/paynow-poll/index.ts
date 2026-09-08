// supabase/functions/paynow-poll/index.ts
// Called every ~3s by pos-checkout.html while waiting for the customer
// to approve the EcoCash/OneMoney prompt on their phone.
// The pollUrl passed in is the one-time token URL Paynow returned from
// paynow-initiate, so no merchant credentials are needed here to poll —
// but we still require a valid signed-in session so random callers
// can't spam arbitrary URLs through this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { pollUrl } = await req.json();
    if (!pollUrl || !pollUrl.startsWith("https://www.paynow.co.zw/")) {
      throw new Error("Invalid poll URL.");
    }

    const pollResp = await fetch(pollUrl, { method: "POST" });
    const parsed = parseUrlEncoded(await pollResp.text());
    const status = (parsed.status || "").toLowerCase();

    return new Response(
      JSON.stringify({
        status: parsed.status || "unknown",
        paid: status === "paid" || status === "delivered" || status === "awaiting delivery",
        cancelled: status === "cancelled",
        failed: status === "failed" || status === "disputed",
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
