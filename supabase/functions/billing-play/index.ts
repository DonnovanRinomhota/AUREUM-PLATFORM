// supabase/functions/billing-play/index.ts
// Google Play Billing for the AUREUM Back Office Android app. Google Play requires apps it distributes to sell
// subscriptions through Google Play, so inside the Android app a business pays like this:
//
//   ONE SHOP = ONE Google Play subscription  ("aureum_shop_1" … "aureum_shop_10", $5 / month each).
//   Paying for 3 shops means owning 3 of those subscriptions. Adding a shop = buying the next one.
//
// This function is the server half. The app only ever TELLS us "I hold these purchase tokens"; we never trust that:
// every token is checked with Google (Play Developer API), must belong to THIS business (the app puts a hash of the
// business id on each purchase), is acknowledged if the app hadn't, and only then does the business row change.
//
// Two ways in (deploy with "Verify JWT" OFF — the function checks credentials itself):
//   1. The app (signed-in OWNER, Authorization: Bearer <session>)   POST { action: "sync", purchases: [{productId, purchaseToken}] }
//                                                                   POST { action: "status" }
//   2. Google Pub/Sub "real-time developer notifications"            POST ?key=<PLAY_WEBHOOK_KEY>   (renewals, cancellations, expiry)
//
// Secrets (Supabase → Edge Functions → Secrets):  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, PLAY_WEBHOOK_KEY, optional PLAY_PACKAGE_NAME
// See SETUP-GOOGLE-PLAY-BILLING.md.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PRODUCT_RE = /^aureum_shop_(\d{1,2})$/;
const MAX_SLOTS = 10;
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const ENTITLED_STATES = new Set(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"]);

class HttpError extends Error {
  status: number; code?: string;
  constructor(status: number, message: string, code?: string) { super(message); this.status = status; this.code = code; }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ---------- small crypto helpers ----------
const enc = new TextEncoder();
const b64url = (data: ArrayBuffer | Uint8Array | string): string => {
  const bytes = typeof data === "string" ? enc.encode(data) : new Uint8Array(data as ArrayBuffer);
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export async function sha256Hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------- Google Play Developer API ----------
let cachedToken: { value: string; exp: number } | null = null;
async function googleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new HttpError(500, "Google Play billing isn't connected yet — the platform owner needs to set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.");
  let sa: any; try { sa = JSON.parse(raw); } catch { throw new HttpError(500, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON isn't valid JSON."); }
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key || "").replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${claims}`));
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${b64url(sig)}` }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.access_token) throw new HttpError(502, "Couldn't sign in to Google Play from the server — check the service account.");
  cachedToken = { value: body.access_token, exp: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}
// null = Google says this token isn't (or is no longer) a valid purchase
async function playGet(pkg: string, token: string): Promise<any | null> {
  const resp = await fetch(`${PLAY_API}/${pkg}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${await googleAccessToken()}` } });
  if ([400, 404, 410].includes(resp.status)) return null;
  if (!resp.ok) throw new HttpError(502, `Google Play couldn't be reached (${resp.status}). Try again in a moment.`);
  return await resp.json();
}
async function playAcknowledge(pkg: string, productId: string, token: string) {
  await fetch(`${PLAY_API}/${pkg}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {
    method: "POST", headers: { Authorization: `Bearer ${await googleAccessToken()}`, "Content-Type": "application/json" }, body: "{}",
  });   // best effort: the app also acknowledges, and Google ignores a repeat
}

// ---------- reading a Google subscription ----------
export function readSub(sub: any) {
  const li = (sub?.lineItems || [])[0] || {};
  const expiryMs = li.expiryTime ? Date.parse(li.expiryTime) : 0;
  const state: string = sub?.subscriptionState || "";
  const price = li.autoRenewingPlan?.recurringPrice;
  return {
    productId: String(li.productId || ""),
    state,
    expiryMs,
    entitled: ENTITLED_STATES.has(state) && expiryMs > Date.now(),
    inGrace: state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    autoRenewing: !!li.autoRenewingPlan?.autoRenewEnabled,
    orderId: String(sub?.latestOrderId || ""),
    acknowledged: sub?.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    account: String(sub?.externalAccountIdentifiers?.obfuscatedExternalAccountId || ""),
    amount: price ? Number(price.units || 0) + Number(price.nanos || 0) / 1e9 : null,
    currency: price?.currencyCode ? String(price.currencyCode).toLowerCase() : "usd",
  };
}

// ---------- the business rule: what do a business's Google subscriptions add up to? ----------
export function aggregate(rows: { slot: number; entitled: boolean; inGrace: boolean; expiryMs: number }[]) {
  const live = rows.filter((r) => r.entitled);
  const slots = new Set(live.map((r) => r.slot));
  const shops = slots.size;
  const periodEnd = live.reduce((m, r) => Math.max(m, r.expiryMs), 0);
  const nextEnd = live.reduce((m, r) => (m === 0 ? r.expiryMs : Math.min(m, r.expiryMs)), 0);
  const status = shops === 0 ? "cancelled" : live.some((r) => r.inGrace) ? "past_due" : "active";
  return { shops, status, periodEnd, nextEnd };
}

async function refreshBusiness(supabase: any, pkg: string, business: any, submitted: { productId: string; purchaseToken: string }[]) {
  const accountId = await sha256Hex(String(business.id));
  const seen = new Set<string>();

  // 1. tokens the app just told us about: verify, claim for this business, acknowledge
  for (const p of submitted) {
    const m = PRODUCT_RE.exec(String(p.productId || ""));
    const token = String(p.purchaseToken || "");
    if (!m || +m[1] < 1 || +m[1] > MAX_SLOTS || token.length < 10 || token.length > 4000) throw new HttpError(400, "That purchase isn't a recognised AUREUM subscription.");
    if (seen.has(token)) continue; seen.add(token);
    const { data: existing } = await supabase.from("play_subscriptions").select("business_id").eq("purchase_token", token).maybeSingle();
    if (existing && existing.business_id !== business.id) throw new HttpError(409, "This purchase already belongs to another AUREUM account.");
    const sub = await playGet(pkg, token);
    if (!sub) throw new HttpError(400, "Google Play couldn't confirm that purchase.");
    const info = readSub(sub);
    if (info.productId !== p.productId) throw new HttpError(400, "The purchase doesn't match the subscription it claims to be.");
    if (info.account !== accountId) throw new HttpError(403, "This purchase was made for a different AUREUM account.");
    if (!info.acknowledged && info.entitled) await playAcknowledge(pkg, info.productId, token);
    await saveRow(supabase, business.id, +m[1], token, info);
  }

  // 2. everything this business owns (including rows we already had): ask Google for the current truth
  const { data: stored } = await supabase.from("play_subscriptions").select("*").eq("business_id", business.id);
  const rows: { slot: number; entitled: boolean; inGrace: boolean; expiryMs: number }[] = [];
  const view: any[] = [];
  for (const r of stored || []) {
    let info: ReturnType<typeof readSub> | null = null;
    try { const sub = await playGet(pkg, r.purchase_token); info = sub ? readSub(sub) : null; } catch (e) { if (!seen.has(r.purchase_token)) throw e; }
    if (!info) {                                   // Google no longer knows this token → treat as ended
      info = { productId: r.product_id, state: "SUBSCRIPTION_STATE_EXPIRED", expiryMs: 0, entitled: false, inGrace: false, autoRenewing: false, orderId: r.latest_order_id || "", acknowledged: true, account: accountId, amount: null, currency: "usd" };
    }
    await saveRow(supabase, business.id, r.slot, r.purchase_token, info);
    rows.push({ slot: r.slot, entitled: info.entitled, inGrace: info.inGrace, expiryMs: info.expiryMs });
    view.push({ productId: r.product_id, slot: r.slot, state: info.state, entitled: info.entitled, expiry: info.expiryMs ? new Date(info.expiryMs).toISOString() : null, autoRenewing: info.autoRenewing });
    if (info.entitled || info.expiryMs) await recordPayment(supabase, business.id, info, r.slot);
  }

  // 3. fold the result into the business (never over a live card subscription, never over complimentary access)
  const agg = aggregate(rows);
  const stripeLive = business.billing_processor === "stripe" && !!business.stripe_subscription_id && ["active", "past_due"].includes(business.subscription_status);
  let applied = false, conflict: string | null = null;
  if (!business.is_exempt) {
    if (agg.shops > 0 && stripeLive) conflict = "stripe";
    else if (agg.shops > 0 || business.billing_processor === "google_play") {
      const patch: Record<string, unknown> = {
        billing_processor: "google_play", subscription_status: agg.status, shops_paid: agg.shops,
        current_period_end: agg.periodEnd ? new Date(agg.periodEnd).toISOString() : business.current_period_end,
        current_period_start: agg.nextEnd ? new Date(agg.nextEnd - 30 * 86400000).toISOString() : business.current_period_start,
      };
      const { error } = await supabase.from("businesses").update(patch).eq("id", business.id);
      if (error) throw new HttpError(500, "Couldn't record the subscription: " + error.message);
      applied = true;
    }
  }
  return { ok: true, applied, conflict, shops_paid: agg.shops, status: agg.shops > 0 || business.billing_processor === "google_play" ? agg.status : business.subscription_status, current_period_end: agg.periodEnd ? new Date(agg.periodEnd).toISOString() : null, subscriptions: view };
}

async function saveRow(supabase: any, businessId: string, slot: number, token: string, info: ReturnType<typeof readSub>) {
  const { error } = await supabase.from("play_subscriptions").upsert({
    business_id: businessId, product_id: info.productId || `aureum_shop_${slot}`, slot, purchase_token: token, state: info.state,
    expiry: info.expiryMs ? new Date(info.expiryMs).toISOString() : null, auto_renewing: info.autoRenewing, latest_order_id: info.orderId || null, updated_at: new Date().toISOString(),
  }, { onConflict: "purchase_token" });
  if (error) throw new HttpError(500, "Couldn't save the purchase: " + error.message);
}
async function recordPayment(supabase: any, businessId: string, info: ReturnType<typeof readSub>, slot: number) {
  if (!info.orderId || info.amount == null) return;
  const { data: dup } = await supabase.from("subscription_payments").select("id").eq("business_id", businessId).eq("external_reference", info.orderId).maybeSingle();
  if (dup) return;
  await supabase.from("subscription_payments").insert({
    business_id: businessId, processor: "google_play", amount: info.amount, currency: info.currency, status: "paid",
    period_start: info.expiryMs ? new Date(info.expiryMs - 30 * 86400000).toISOString() : null, period_end: info.expiryMs ? new Date(info.expiryMs).toISOString() : null,
    external_reference: info.orderId,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const pkg = Deno.env.get("PLAY_PACKAGE_NAME") || "com.aureum.backoffice";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);

    // ---- Google Pub/Sub push (real-time developer notification) ----
    if (url.searchParams.has("key")) {
      const want = Deno.env.get("PLAY_WEBHOOK_KEY") || "";
      if (!want || !safeEqual(url.searchParams.get("key") || "", want)) return json({ error: "Unauthorized" }, 401);
      const envelope = await req.json().catch(() => ({}));
      let note: any = {};
      try { note = JSON.parse(atob(String(envelope?.message?.data || ""))); } catch { return json({ ok: true, ignored: "unreadable" }); }
      if (note.testNotification) return json({ ok: true, test: true });
      if (note.packageName && note.packageName !== pkg) return json({ ok: true, ignored: "other app" });
      const token = String(note?.subscriptionNotification?.purchaseToken || "");
      if (!token) return json({ ok: true, ignored: "not a subscription event" });
      const { data: row } = await supabase.from("play_subscriptions").select("business_id").eq("purchase_token", token).maybeSingle();
      if (!row) return json({ ok: true, ignored: "unknown purchase (the app registers it when the owner opens it)" });
      const { data: business } = await supabase.from("businesses").select("*").eq("id", row.business_id).maybeSingle();
      if (business) await refreshBusiness(supabase, pkg, business, []);
      return json({ ok: true });
    }

    // ---- the app ----
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) throw new HttpError(401, "Not signed in.");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) throw new HttpError(401, "Invalid session.");
    const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", userData.user.id).maybeSingle();
    if (!profile) throw new HttpError(404, "No business found for this account.");
    if (profile.role !== "owner") throw new HttpError(403, "Only the business owner can manage billing.");
    const { data: business } = await supabase.from("businesses").select("*").eq("id", profile.business_id).maybeSingle();
    if (!business) throw new HttpError(404, "Business not found.");

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const purchases = action === "sync" && Array.isArray(body.purchases) ? body.purchases.slice(0, MAX_SLOTS) : [];
    return json(await refreshBusiness(supabase, pkg, business, purchases));
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
    console.error("billing-play error:", err);
    return json({ error: "Something went wrong with Google Play billing. Please try again." }, 500);
  }
});
