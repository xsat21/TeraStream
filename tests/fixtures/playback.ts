/** Synthetic project-owned test contract; no third-party or TeraBox media. */
export const FIXTURE_ORIGIN = "https://media.terastream.test";
export function fixtureSource(format: "mp4" | "hls" = "mp4") {
  return { status: "verified" as const, format,
    url: `${FIXTURE_ORIGIN}/${format === "mp4" ? "clip.mp4" : "playlist.m3u8"}`,
    verifiedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString() };
}
