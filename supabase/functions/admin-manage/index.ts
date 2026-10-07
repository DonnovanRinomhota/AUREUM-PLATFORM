// supabase/functions/admin-manage/index.ts
// Backend for the platform Control Panel (admin.html).
//
// SECURITY MODEL — read this before changing anything:
//  * The browser is never trusted. Every request must carry a valid Supabase
//    session JWT, the account's email must be CONFIRMED, and that email must
//    be on the platform_admins allowlist. All three are checked here, on the
//    server, on every single call.
//  * This function uses the service-role key, so it can read/modify any
//    business. That key never leaves the server.
//  * Every change is written to admin_audit_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_STATUSES = ["trial", "active", "past_due", "cancelled", "suspended"];
const TICKET_STATUSES = ["open", "pending", "resolved", "closed"];
const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_COLS =
  "id, name, subscription_status, trial_ends_at, current_period_end, billing_processor, is_exempt, exempt_note, created_at";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addDays(from: Date, n: number): Date {
  return new Date(from.getTime() + n * 86400000);
}

// Adds whole calendar months and clamps to the last day of the target month,
// so Jan 31 + 1 month = Feb 28/29 (not Mar 3). Done in UTC so the result
// doesn't depend on the server's timezone.
function addMonths(from: Date, n: number): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

function intInRange(value: unknown, min: number, max: number, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${label} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

function requireUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new HttpError(400, "Invalid business id.");
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---- 1. Who is calling? ----
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) throw new HttpError(401, "Not signed in.");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) throw new HttpError(401, "Invalid or expired session. Please sign in again.");
    const user = userData.user;

    // An unconfirmed email must never count as an admin identity, otherwise
    // someone could register an allowlisted address before its owner does.
    if (!user.email || !user.email_confirmed_at) throw new HttpError(403, "Your email address isn't confirmed.");
    const email = user.email.toLowerCase();

    // ---- 2. Are they on the allowlist? ----
    const { data: adminRow, error: adminErr } = await supabase
      .from("platform_admins").select("email, is_super").eq("email", email).maybeSingle();
    if (adminErr) throw new HttpError(500, "Could not verify admin access: " + adminErr.message);
    if (!adminRow) throw new HttpError(403, "This account doesn't have control panel access.");
    const isSuper = !!adminRow.is_super;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    const audit = async (act: string, biz: { id?: string; name?: string } | null, details: unknown) => {
      const { error } = await supabase.from("admin_audit_log").insert({
        admin_email: email, action: act,
        business_id: biz?.id ?? null, business_name: biz?.name ?? null, details: details ?? null,
      });
      if (error) console.error("audit log insert failed:", error.message);
    };

    const loadBusiness = async (id: string) => {
      const { data, error } = await supabase.from("businesses").select(BUSINESS_COLS).eq("id", id).maybeSingle();
      if (error) throw new HttpError(500, "Database error: " + error.message);
      if (!data) throw new HttpError(404, "Business not found.");
      return data;
    };

    const saveBusiness = async (id: string, patch: Record<string, unknown>) => {
      const { data, error } = await supabase.from("businesses").update(patch).eq("id", id).select(BUSINESS_COLS).single();
      if (error) throw new HttpError(500, "Could not update business: " + error.message);
      return data;
    };

    const requireSuper = () => {
      if (!isSuper) throw new HttpError(403, "Only a super admin can manage who has access.");
    };

    switch (action) {
      case "whoami":
        return json({ email, isAdmin: true, isSuper });

      case "summary": {
        const { data, error } = await supabase.rpc("admin_subscription_summary");
        if (error) throw new HttpError(500, "Could not load summary: " + error.message);
        const summary: Record<string, number> = {};
        (data ?? []).forEach((r: { key: string; n: number }) => { summary[r.key] = Number(r.n); });
        return json({ summary });
      }

      case "list": {
        const limit = intInRange(body.limit ?? 20, 1, 100, "Page size");
        const offset = intInRange(body.offset ?? 0, 0, 1_000_000, "Offset");
        const { data, error } = await supabase.rpc("admin_list_businesses", {
          p_search: String(body.search ?? "").slice(0, 100),
          p_status: String(body.status ?? ""),
          p_limit: limit, p_offset: offset,
        });
        if (error) throw new HttpError(500, "Could not load accounts: " + error.message);
        return json({ rows: data ?? [], total: data?.[0] ? Number(data[0].total_count) : 0 });
      }

      case "extend_trial": {
        const id = requireUuid(body.businessId);
        const days = intInRange(body.days, 1, 730, "Days");
        const biz = await loadBusiness(id);
        const now = new Date();
        // Extend from the later of "now" and the current trial end, so a
        // trial that already lapsed restarts from today, not from the past.
        const current = biz.trial_ends_at ? new Date(biz.trial_ends_at) : null;
        const base = current && current > now ? current : now;
        const newEnd = addDays(base, days);
        const patch: Record<string, unknown> = { trial_ends_at: newEnd.toISOString() };
        let note: string | null = null;
        if (biz.subscription_status === "cancelled") {
          patch.subscription_status = "trial";
        } else if (biz.subscription_status === "suspended") {
          note = "This account is suspended, so the extended trial won't restore access until you change its status.";
        } else if (biz.subscription_status === "active") {
          note = "This account has an active subscription, so the trial date has no effect right now.";
        }
        const updated = await saveBusiness(id, patch);
        await audit("extend_trial", biz, { days, from: biz.trial_ends_at, to: newEnd.toISOString() });
        return json({ ok: true, business: updated, note });
      }

      case "extend_subscription": {
        const id = requireUuid(body.businessId);
        const unit = body.unit === "months" ? "months" : "days";
        const amount = unit === "months"
          ? intInRange(body.amount, 1, 60, "Months")
          : intInRange(body.amount, 1, 3650, "Days");
        const biz = await loadBusiness(id);
        const now = new Date();
        const currentEnd = biz.current_period_end ? new Date(biz.current_period_end) : null;
        const stillRunning = !!currentEnd && currentEnd > now;
        const base = stillRunning ? currentEnd! : now;
        const newEnd = unit === "months" ? addMonths(base, amount) : addDays(base, amount);
        const patch: Record<string, unknown> = {
          current_period_end: newEnd.toISOString(),
          subscription_status: biz.subscription_status === "suspended" ? "suspended" : "active",
        };
        if (!stillRunning) patch.current_period_start = now.toISOString();
        const updated = await saveBusiness(id, patch);

        // Show up in the customer's own payment history as a $0 manual entry.
        const { error: payErr } = await supabase.from("subscription_payments").insert({
          business_id: id, processor: "manual", amount: 0, currency: "usd", status: "paid",
          period_start: base.toISOString(), period_end: newEnd.toISOString(),
          external_reference: `admin:${email}`,
        });
        if (payErr) console.error("manual payment row failed:", payErr.message);

        await audit("extend_subscription", biz, { amount, unit, from: biz.current_period_end, to: newEnd.toISOString() });
        return json({
          ok: true, business: updated,
          note: biz.subscription_status === "suspended"
            ? "This account is suspended, so the extension won't restore access until you change its status." : null,
        });
      }

      case "set_exempt": {
        const id = requireUuid(body.businessId);
        const exempt = body.exempt === true;
        const note = exempt ? String(body.note ?? "").trim().slice(0, 200) || null : null;
        const biz = await loadBusiness(id);
        const updated = await saveBusiness(id, { is_exempt: exempt, exempt_note: note });
        await audit(exempt ? "grant_exempt" : "remove_exempt", biz, { note });
        return json({ ok: true, business: updated });
      }

      case "set_status": {
        const id = requireUuid(body.businessId);
        const status = String(body.status || "");
        if (!VALID_STATUSES.includes(status)) throw new HttpError(400, "Invalid status.");
        const biz = await loadBusiness(id);
        const updated = await saveBusiness(id, { subscription_status: status });
        await audit("set_status", biz, { from: biz.subscription_status, to: status });
        return json({ ok: true, business: updated });
      }

      case "list_admins": {
        const { data, error } = await supabase
          .from("platform_admins").select("email, is_super, added_by, created_at").order("created_at");
        if (error) throw new HttpError(500, "Could not load admins: " + error.message);
        return json({ admins: data ?? [], me: email, isSuper });
      }

      case "add_admin": {
        requireSuper();
        const newEmail = String(body.email || "").trim().toLowerCase();
        if (!EMAIL_RE.test(newEmail)) throw new HttpError(400, "Enter a valid email address.");
        const makeSuper = body.isSuper === true;
        const { error } = await supabase.from("platform_admins")
          .insert({ email: newEmail, is_super: makeSuper, added_by: email });
        if (error) {
          if ((error as { code?: string }).code === "23505") throw new HttpError(409, "That email already has access.");
          throw new HttpError(500, "Could not add admin: " + error.message);
        }
        await audit("add_admin", null, { email: newEmail, isSuper: makeSuper });
        return json({ ok: true });
      }

      case "remove_admin": {
        requireSuper();
        const target = String(body.email || "").trim().toLowerCase();
        if (target === email) throw new HttpError(400, "You can't remove your own access.");
        const { error } = await supabase.from("platform_admins").delete().eq("email", target);
        if (error) throw new HttpError(500, "Could not remove admin: " + error.message);
        await audit("remove_admin", null, { email: target });
        return json({ ok: true });
      }

      case "audit": {
        const limit = intInRange(body.limit ?? 25, 1, 100, "Page size");
        const offset = intInRange(body.offset ?? 0, 0, 1_000_000, "Offset");
        const { data, error, count } = await supabase
          .from("admin_audit_log").select("*", { count: "exact" })
          .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw new HttpError(500, "Could not load activity: " + error.message);
        return json({ rows: data ?? [], total: count ?? 0 });
      }

      // ---------------- support tickets ----------------
      // Customers create tickets from the Back Office (Settings → Help & FAQ). Here the AUREUM team reads and answers
      // them. Replies to customers are shown as "AUREUM Support" (an admin's own email is never shown to a customer);
      // internal notes are visible only here.
      case "tickets_summary": {
        const { data, error } = await supabase.from("support_tickets").select("status, priority");
        if (error) throw new HttpError(500, "Could not load tickets: " + error.message);
        const rows = data ?? [];
        const count = (f: (r: any) => boolean) => rows.filter(f).length;
        return json({ summary: {
          open: count(r => r.status === "open"), pending: count(r => r.status === "pending"),
          resolved: count(r => r.status === "resolved"), closed: count(r => r.status === "closed"),
          urgentOpen: count(r => r.status === "open" && r.priority === "urgent"), total: rows.length,
        } });
      }

      case "tickets_list": {
        const limit = intInRange(body.limit ?? 25, 1, 100, "Page size");
        const offset = intInRange(body.offset ?? 0, 0, 1_000_000, "Offset");
        const status = String(body.status ?? "active"), priority = String(body.priority ?? "");
        const search = String(body.search ?? "").trim().slice(0, 100);
        if (status !== "active" && status !== "all" && !TICKET_STATUSES.includes(status)) throw new HttpError(400, "Invalid status filter.");
        if (priority && !TICKET_PRIORITIES.includes(priority)) throw new HttpError(400, "Invalid priority filter.");
        let q = supabase.from("support_tickets").select("*", { count: "exact" });
        if (status === "active") q = q.in("status", ["open", "pending"]);
        else if (status !== "all") q = q.eq("status", status);
        if (priority) q = q.eq("priority", priority);
        if (search) q = q.ilike("subject", "%" + search.replace(/[%_]/g, "") + "%");
        const { data, error, count } = await q.order("last_message_at", { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw new HttpError(500, "Could not load tickets: " + error.message);
        const rows = data ?? [];
        const ids = Array.from(new Set(rows.map((r: any) => r.business_id)));
        const names: Record<string, any> = {};
        if (ids.length) {
          const { data: biz } = await supabase.from("businesses").select("id, name, subscription_status, is_exempt").in("id", ids);
          (biz ?? []).forEach((b: any) => { names[b.id] = b; });
        }
        return json({ total: count ?? rows.length, rows: rows.map((r: any) => ({
          ...r, business_name: names[r.business_id]?.name ?? "(deleted business)",
          plan_status: names[r.business_id]?.is_exempt ? "complimentary" : names[r.business_id]?.subscription_status ?? null,
        })) });
      }

      case "ticket_get": {
        const id = requireUuid(body.ticketId);
        const { data: ticket, error } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
        if (error) throw new HttpError(500, "Could not load the ticket: " + error.message);
        if (!ticket) throw new HttpError(404, "Ticket not found.");
        const { data: messages } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
        const { data: biz } = await supabase.from("businesses").select(BUSINESS_COLS).eq("id", ticket.business_id).maybeSingle();
        return json({ ticket, messages: messages ?? [], business: biz ?? null });
      }

      case "ticket_reply": {
        const id = requireUuid(body.ticketId);
        const text = String(body.body ?? "").trim();
        if (text.length < 1) throw new HttpError(400, "Type a reply first.");
        if (text.length > 8000) throw new HttpError(400, "The reply is too long (8,000 characters at most).");
        const internal = body.internal === true;
        const nextStatus = body.status ? String(body.status) : "";
        if (nextStatus && !TICKET_STATUSES.includes(nextStatus)) throw new HttpError(400, "Invalid status.");
        const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
        if (!ticket) throw new HttpError(404, "Ticket not found.");
        const { error: mErr } = await supabase.from("support_ticket_messages").insert({
          ticket_id: id, business_id: ticket.business_id, author_type: "admin", internal,
          author_name: internal ? "Internal note" : "AUREUM Support", author_email: internal ? email : null, body: text,
        });
        if (mErr) throw new HttpError(500, "Could not save the reply: " + mErr.message);
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = { updated_at: now, last_message_at: now };
        if (!internal) { patch.last_admin_reply_at = now; patch.status = nextStatus || "pending"; }      // waiting for the customer
        else if (nextStatus) patch.status = nextStatus;
        if (patch.status === "resolved" || patch.status === "closed") patch.closed_at = now;
        else if (patch.status) patch.closed_at = null;
        if (!ticket.assigned_to) patch.assigned_to = email;                                              // whoever answers first owns it
        await supabase.from("support_tickets").update(patch).eq("id", id);
        await audit(internal ? "ticket_note" : "ticket_reply", { id: ticket.business_id }, { ticket: id, subject: ticket.subject, status: patch.status ?? ticket.status });
        return json({ ok: true });
      }

      case "ticket_update": {
        const id = requireUuid(body.ticketId);
        const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
        if (!ticket) throw new HttpError(404, "Ticket not found.");
        const patch: Record<string, unknown> = {};
        if (body.status !== undefined) {
          const st = String(body.status);
          if (!TICKET_STATUSES.includes(st)) throw new HttpError(400, "Invalid status.");
          patch.status = st; patch.closed_at = (st === "resolved" || st === "closed") ? new Date().toISOString() : null;
        }
        if (body.priority !== undefined) {
          const pr = String(body.priority);
          if (!TICKET_PRIORITIES.includes(pr)) throw new HttpError(400, "Invalid priority.");
          patch.priority = pr;
        }
        if (body.assignedTo !== undefined) {
          const who = String(body.assignedTo).trim().toLowerCase();
          patch.assigned_to = who === "" ? null : who === "me" ? email : who.slice(0, 120);
        }
        if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to change.");
        const before = { status: ticket.status, priority: ticket.priority, assigned_to: ticket.assigned_to };     // snapshot BEFORE the update
        patch.updated_at = new Date().toISOString();
        const { data: updated, error } = await supabase.from("support_tickets").update(patch).eq("id", id).select("*").single();
        if (error) throw new HttpError(500, "Could not update the ticket: " + error.message);
        await audit("ticket_update", { id: ticket.business_id }, { ticket: id, subject: ticket.subject, from: before, to: patch });
        return json({ ok: true, ticket: updated });
      }

      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: (err as Error).message || "Something went wrong." }, status);
  }
});
