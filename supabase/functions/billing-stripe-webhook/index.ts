// supabase/functions/billing-stripe-webhook/index.ts
// Stripe calls this automatically whenever a subscription event happens —
// this is what makes renewals, failures, and cancellations actually update
// your database without anyone needing to check manually. Configure the
// webhook URL in the Stripe Dashboard (see SETUP-BILLING.md) pointing at
// this function's URL, listening for: checkout.session.completed,
// invoice.paid, invoice.payment_failed, customer.subscription.deleted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === parts.v1;
}

Deno.serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get("PLATFORM_STRIPE_WEBHOOK_SECRET");
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";
    if (webhookSecret) {
      const valid = await verifyStripeSignature(payload, sig, webhookSecret);
      if (!valid) return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payload);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const businessId = session.client_reference_id || session.metadata?.business_id;
      if (businessId) {
        await supabase.from("businesses").update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          billing_processor: "stripe",
        }).eq("id", businessId);
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const businessId = invoice.subscription_details?.metadata?.business_id || invoice.lines?.data?.[0]?.metadata?.business_id;
      const periodStart = new Date(invoice.lines.data[0]?.period?.start * 1000).toISOString();
      const periodEnd = new Date(invoice.lines.data[0]?.period?.end * 1000).toISOString();
      if (businessId) {
        await supabase.from("businesses").update({
          subscription_status: "active",
          current_period_start: periodStart,
          current_period_end: periodEnd,
        }).eq("id", businessId);
        await supabase.from("subscription_payments").insert({
          business_id: businessId,
          processor: "stripe",
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency || "usd",
          status: "paid",
          period_start: periodStart,
          period_end: periodEnd,
          external_reference: invoice.id,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const businessId = invoice.subscription_details?.metadata?.business_id || invoice.lines?.data?.[0]?.metadata?.business_id;
      if (businessId) {
        await supabase.from("businesses").update({ subscription_status: "past_due" }).eq("id", businessId);
        await supabase.from("subscription_payments").insert({
          business_id: businessId, processor: "stripe",
          amount: (invoice.amount_due || 0) / 100, currency: invoice.currency || "usd",
          status: "failed", external_reference: invoice.id,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const businessId = sub.metadata?.business_id;
      if (businessId) {
        await supabase.from("businesses").update({ subscription_status: "cancelled" }).eq("id", businessId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
