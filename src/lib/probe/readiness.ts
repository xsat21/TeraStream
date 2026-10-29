import { validateShareUrl } from "../share-url.ts";

/** No approved endpoint/response schema is available. Never accept a contract,
 * API origin or credential selector supplied by a URL, env var or browser.
 * Implement a reviewed adapter in code only after documentation/permission review.
 */
export const REVIEWED_PROBE_CONTRACTS: readonly string[] = [];

export function probeReadiness(env: Record<string, string | undefined>) {
  let shareValid = false;
  try { validateShareUrl(env.TERASTREAM_PROBE_SHARE_URL ?? ""); shareValid = true; } catch { /* no input/error reflection */ }
  const ownershipConfirmed = env.TERASTREAM_PROBE_OWNER_CONFIRMED === "true";
  const blockers: string[] = [];
  if (!REVIEWED_PROBE_CONTRACTS.length) blockers.push("no_reviewed_api_contract");
  if (!shareValid) blockers.push("missing_or_invalid_operator_share");
  if (!ownershipConfirmed) blockers.push("operator_permission_not_confirmed");
  return {
    version: 1,
    mode: "offline-readiness-only",
    status: "blocked",
    prerequisites: { shareValid, ownershipConfirmed, reviewedContract: REVIEWED_PROBE_CONTRACTS.length > 0 },
    blockers,
    metadata: "not_run",
    browserNetwork: "not_run",
    playback: "not_verified",
    productionPolicyChanged: false,
  } as const;
}
