// Pure rules for changing a fiscal integration's status (kept free of Deno/Supabase imports so they can be unit-tested).
// The database enforces the same gate (fiscal_integrations_gate) — this gives clear messages first.

export const FISCAL_STATUSES = ["disabled", "in_development", "testing", "approved"] as const;
export type FiscalStatus = typeof FISCAL_STATUSES[number];

export interface FiscalRow {
  id: string; status: FiscalStatus; docs_verified: boolean; docs_reference: string | null;
  approval_reference: string | null; notes: string | null; docs_verified_at: string | null;
}
export interface FiscalPatchInput {
  status?: unknown; docs_verified?: unknown; docs_reference?: unknown; approval_reference?: unknown; notes?: unknown;
}

const clean = (v: unknown, max: number, label: string): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return s === "" ? null : s;
};

/** Returns the column patch to write, or throws an Error whose message is safe to show to the admin. */
export function buildFiscalPatch(current: FiscalRow, input: FiscalPatchInput, isSuper: boolean, nowIso: string): Record<string, unknown> {
  const next = { ...current } as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (input.docs_verified !== undefined) {
    if (typeof input.docs_verified !== "boolean") throw new Error("docs_verified must be true or false.");
    patch.docs_verified = input.docs_verified;
    patch.docs_verified_at = input.docs_verified ? (current.docs_verified ? current.docs_verified_at : nowIso) : null;
  }
  if (input.docs_reference !== undefined) patch.docs_reference = clean(input.docs_reference, 300, "Documentation reference");
  if (input.approval_reference !== undefined) patch.approval_reference = clean(input.approval_reference, 200, "Approval reference");
  if (input.notes !== undefined) patch.notes = clean(input.notes, 1000, "Notes");
  Object.assign(next, patch);

  if (input.status !== undefined) {
    const to = String(input.status) as FiscalStatus;
    const fromIdx = FISCAL_STATUSES.indexOf(current.status), toIdx = FISCAL_STATUSES.indexOf(to);
    if (toIdx < 0) throw new Error("Unknown status.");
    if (toIdx > fromIdx + 1) throw new Error(`An integration moves one step at a time: ${FISCAL_STATUSES[fromIdx + 1].replace("_", " ")} comes before ${to.replace("_", " ")}.`);
    if (toIdx >= 2 && !next.docs_verified) throw new Error("Confirm that the official documentation has been verified before moving to testing or approved.");
    if (toIdx >= 2 && !next.docs_reference) throw new Error("Record which documentation was verified (title / version / link).");
    if (to === "approved") {
      if (!isSuper) throw new Error("Only a super admin can approve an integration.");
      if (!next.approval_reference) throw new Error("Enter the authority's approval / test sign-off reference before approving.");
    }
    patch.status = to;
  } else if (current.status !== "disabled" && current.status !== "in_development") {
    // editing evidence on a live integration must not leave it in an invalid state
    if (!next.docs_verified) throw new Error("This integration is " + current.status.replace("_", " ") + " — lower its status before removing the documentation check.");
    if (current.status === "approved" && !next.approval_reference) throw new Error("An approved integration needs its approval reference.");
  }
  if (Object.keys(patch).length === 0) throw new Error("Nothing to change.");
  return patch;
}
