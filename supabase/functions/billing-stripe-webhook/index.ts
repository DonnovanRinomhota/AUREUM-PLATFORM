// supabase/functions/billing-stripe-webhook/index.ts
// Stripe calls this automatically whenever a subscription event happens —
// this is what makes renewals, failures, and cancellations actually update
// your database without anyone needing to check manually. Configure the
// webhook URL in the Stripe Dashboard (see SETUP-BILLING.md) pointing at
// this function's URL, listening for: checkout.session.completed,
// invoice.paid, invoice.payment_failed, customer.subscription.updated,
// customer.subscription.deleted.

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

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmtDate = (unix?: number) => unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

// Emails the payment confirmation / invoice to the OWNER's registration email.
// Needs two secrets (see SETUP-BILLING.md): RESEND_API_KEY and BILLING_FROM_EMAIL (e.g. "AUREUM <billing@yourdomain.com>").
// If they are not set this does nothing (Stripe's own receipts can be switched on in the Stripe dashboard instead).
// It never throws: a failed email must never make Stripe think the payment webhook failed.
async function sendInvoiceEmail(supabase: any, businessId: string, invoice: any) {
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("BILLING_FROM_EMAIL");
    if (!apiKey || !from) return;
    const { data: owner } = await supabase.from("profiles").select("id").eq("business_id", businessId).eq("role", "owner").limit(1).maybeSingle();
    let to = "";
    if (owner?.id) { const { data: u } = await supabase.auth.admin.getUserById(owner.id); to = u?.user?.email ?? ""; }
    if (!to) to = invoice.customer_email ?? "";
    if (!to) return;
    const { data: biz } = await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle();
    const amount = ((invoice.amount_paid || 0) / 100).toFixed(2);
    const cur = String(invoice.currency || "usd").toUpperCase();
    const line = invoice.lines?.data?.[0];
    const period = line?.period ? `${fmtDate(line.period.start)} to ${fmtDate(line.period.end)}` : "";
    const num = invoice.number || invoice.id;
    const links = [
      invoice.hosted_invoice_url ? `<a href="${esc(invoice.hosted_invoice_url)}" style="color:#9A7B2E">View invoice online</a>` : "",
      invoice.invoice_pdf ? `<a href="${esc(invoice.invoice_pdf)}" style="color:#9A7B2E">Download PDF invoice</a>` : "",
    ].filter(Boolean).join(" &nbsp;|&nbsp; ");
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1b1b1b">
<h2 style="color:#0F2A21;margin:0 0 4px">Payment received, thank you</h2>
<p style="margin:0 0 16px;color:#555">Here is your AUREUM subscription invoice${biz?.name ? ` for <b>${esc(biz.name)}</b>` : ""}.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Invoice</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(num)}</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(fmtDate(invoice.status_transitions?.paid_at || invoice.created))}</td></tr>
${period ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Period</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(period)}</td></tr>` : ""}
<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Description</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(line?.description || "AUREUM subscription")}</td></tr>
<tr><td style="padding:10px 0;font-weight:bold">Amount paid</td><td style="padding:10px 0;text-align:right;font-weight:bold">${esc(amount)} ${esc(cur)}</td></tr>
</table>
<p style="margin:16px 0">${links}</p>
<p style="color:#777;font-size:12px;line-height:1.5">Your subscription renews automatically every month. You can update your card or cancel any time in AUREUM Back Office under Settings &rarr; Billing. We never see or store your card number.</p></div>`;
    const text = `Payment received, thank you.\nInvoice ${num}\nAmount paid: ${amount} ${cur}\n${period ? "Period: " + period + "\n" : ""}${invoice.hosted_invoice_url ? "Invoice: " + invoice.hosted_invoice_url + "\n" : ""}Your subscription renews automatically every month. Update your card or cancel in Back Office, Settings, Billing.`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `Your AUREUM invoice ${num} (${amount} ${cur})`, html, text }),
    });
  } catch (_e) { /* never fail the webhook because of an email */ }
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
        const shops = parseInt(session.metadata?.shops ?? "", 10);          // how many shops this checkout paid for ($5 each)
        await supabase.from("businesses").update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          billing_processor: "stripe",
          ...(shops > 0 ? { shops_paid: shops } : {}),
        }).eq("id", businessId);
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const businessId = invoice.subscription_details?.metadata?.business_id || invoice.lines?.data?.[0]?.metadata?.business_id;
      const periodStart = new Date(invoice.lines.data[0]?.period?.start * 1000).toISOString();
      const periodEnd = new Date(invoice.lines.data[0]?.period?.end * 1000).toISOString();
      if (businessId) {
        // Adding a shop part-way through the month creates a small "proration" invoice (billing_reason
        // subscription_update). It is a payment to record — NOT a new billing period, so the period dates stay.
        if (invoice.billing_reason !== "subscription_update") {
          await supabase.from("businesses").update({
            subscription_status: "active",
            current_period_start: periodStart,
            current_period_end: periodEnd,
          }).eq("id", businessId);
        }
        // Self-heal: make sure the Stripe ids are saved even if checkout.session.completed was missed
        const subId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
        if (invoice.customer && subId) {
          await supabase.from("businesses").update({ stripe_customer_id: invoice.customer, stripe_subscription_id: subId, billing_processor: "stripe" }).eq("id", businessId);
        }
        // Stripe can deliver the same event twice: record (and email) each invoice only once
        const { data: seen } = await supabase.from("subscription_payments").select("id").eq("external_reference", invoice.id).eq("status", "paid").maybeSingle();
        if (!seen) {
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
          await sendInvoiceEmail(supabase, businessId, invoice);
        }
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

    if (event.type === "customer.subscription.updated") {
      // keep "shops paid for" equal to the subscription's quantity, however it was changed
      const sub = event.data.object;
      let businessId = sub.metadata?.business_id;
      if (!businessId && sub.id) {
        const { data: found } = await supabase.from("businesses").select("id").eq("stripe_subscription_id", sub.id).maybeSingle();
        businessId = found?.id;
      }
      const quantity = Number(sub.items?.data?.[0]?.quantity);
      if (businessId && quantity > 0) {
        await supabase.from("businesses").update({ shops_paid: quantity }).eq("id", businessId);
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
