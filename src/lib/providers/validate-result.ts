import type { ResolveResult } from "./types";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).length === allowed.length && Object.keys(value).every((key) => allowed.includes(key));
}
function clean(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max &&
    !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}

/** Internal DTO schema, NOT a guessed official API schema. Validate at both boundaries. */
export function isResolveResult(value: unknown, expected: "mock" | "official"): value is ResolveResult {
  if (!object(value) || !keys(value, ["provider", "file", "stream", "download"]) || value.provider !== expected) return false;
  const file = value.file;
  if (!object(file) || !keys(file, ["id", "name", "sizeBytes", "mimeType", "source"]) ||
    file.source !== (expected === "mock" ? "mock" : "live") ||
    !clean(file.id, 256) || !clean(file.name, 255) || /[\\/<>]/u.test(file.name) || !file.name.trim() ||
    !clean(file.mimeType, 128) || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.mimeType) ||
    !(file.sizeBytes === null || (typeof file.sizeBytes === "number" && Number.isSafeInteger(file.sizeBytes) && file.sizeBytes >= 0))) return false;
  return [value.stream, value.download].every((link) => object(link) && keys(link, ["status", "reason"]) &&
    typeof link.status === "string" && ["unsupported", "unauthorized", "unavailable", "unverified"].includes(link.status) && clean(link.reason, 512));
  // Verified URLs are deliberately quarantined until an authorized integration,
  // media origin policy, expiry handling and live verification exist. No fallback.
}
