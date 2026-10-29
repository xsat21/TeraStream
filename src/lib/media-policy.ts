/** No production CDN is authorized yet. Add only reviewed, exact HTTPS origins.
 * Review ownership/license, redirects, CORS, ranges, MIME/codecs and all HLS
 * playlist/segment/key origins together. Never populate this from user input/env.
 */
import { REVIEWED_MEDIA_ORIGINS } from "./media-origins.ts";

export interface PlaybackSource {
  status: "verified";
  url: string;
  format: "mp4" | "hls";
  verifiedAt: string;
  expiresAt: string;
}

function timestamp(value: unknown): number {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) ? Date.parse(value) : NaN;
}

export function permittedMediaUrl(input: string, origins = REVIEWED_MEDIA_ORIGINS): boolean {
  if (!input || input.length > 4096 || /[\u0000-\u0020\u007f\\]/u.test(input)) return false;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      origins.includes(url.origin) && !/^(?:localhost|.*\.localhost|\[.*\]|\d+(?:\.\d+){3})$/i.test(url.hostname);
  } catch { return false; }
}

/** No network request or URL-bearing error is produced by validation. */
export function playbackProblem(source: unknown, now = Date.now()): string | null {
  if (!source || typeof source !== "object") return "No verified video source is available.";
  const s = source as Record<string, unknown>;
  if (s.status !== "verified" || typeof s.url !== "string" || !permittedMediaUrl(s.url)) return "Video source is not authorized by the media policy.";
  if (s.format !== "mp4" && s.format !== "hls") return "This video format is unsupported.";
  const verified = timestamp(s.verifiedAt), expires = timestamp(s.expiresAt);
  if (!Number.isFinite(verified) || !Number.isFinite(expires) || verified > now || expires <= verified) return "Video verification dates are invalid.";
  if (expires <= now) return "This video link has expired. Request a newly verified link.";
  return null;
}

export function mediaCsp() {
  // blob: is needed only for hls.js MediaSource. Workers are disabled.
  return REVIEWED_MEDIA_ORIGINS.length ? `blob: ${REVIEWED_MEDIA_ORIGINS.join(" ")}` : "'none'";
}

export function mediaConnectionsCsp() {
  return ["'self'", ...REVIEWED_MEDIA_ORIGINS].join(" ");
}
