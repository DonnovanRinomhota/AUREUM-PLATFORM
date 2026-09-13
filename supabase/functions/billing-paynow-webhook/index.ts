// supabase/functions/billing-paynow-webhook/index.ts
// Paynow calls this directly (server-to-server, the "resulturl") once a
// payment finishes — this is what actually confirms the $5 was paid and
// extends the business's subscription by exactly one month.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function addOneMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

Deno.serve(async (req) => {
  try {
    const integrationKey = Deno.env.get("PLATFORM_PAYNOW_INTEGRATION_KEY")!;
    const bodyText = await req.text();
    const parsed = parseUrlEncoded(bodyText);

    // Verify this really came from Paynow before trusting it.
    const { hash, ...rest } = parsed;
    const concatenated = Object.values(rest).join("") + integrationKey;
    const expectedHash = await sha512HexUpper(concatenated);
    if (hash !== expectedHash) return new Response("Invalid hash", { status: 400 });

    if ((parsed.status || "").toLowerCase() !== "paid") {
      return new Response("ok", { status: 200 }); // not paid — nothing to do yet
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reference = parsed.reference;
    const { data: payment } = await supabase
      .from("subscription_payments")
      .select("id, business_id, period_end")
      .eq("external_reference", reference)
      .maybeSingle();
    if (!payment) return new Response("ok", { status: 200 }); // unknown reference — ignore safely

    const { data: business } = await supabase
      .from("businesses").select("current_period_end").eq("id", payment.business_id).maybeSingle();

    // Extend from the current period's end if still active, otherwise from
    // now — this is what keeps renewal dates precise instead of drifting.
    const existingEnd = business?.current_period_end ? new Date(business.current_period_end) : null;
    const periodStart = existingEnd && existingEnd > new Date() ? existingEnd : new Date();
    const periodEnd = addOneMonth(periodStart);

    await supabase.from("businesses").update({
      subscription_status: "active",
      billing_processor: "paynow",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }).eq("id", payment.business_id);

    await supabase.from("subscription_payments").update({
      status: "paid",
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    }).eq("id", payment.id);

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response("error: " + err.message, { status: 400 });
  }
});
