import type { ResolveResult } from "./providers/types";
import { playbackProblem, type PlaybackSource } from "./media-policy";

/** Additional gate; never admits mock/unverified data or changes provider resolution. */
export function workspacePlayback(result: ResolveResult | null): PlaybackSource | null {
  if (!result || result.provider !== "official" || result.file.source !== "live" || result.stream.status !== "verified") return null;
  const format = result.file.mimeType === "video/mp4" ? "mp4" :
    ["application/vnd.apple.mpegurl", "application/x-mpegurl"].includes(result.file.mimeType.toLowerCase()) ? "hls" : null;
  if (!format) return null;
  const source: PlaybackSource = { ...result.stream, format };
  return playbackProblem(source) ? null : source;
}
