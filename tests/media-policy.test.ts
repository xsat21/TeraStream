import { describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/media-origins", () => ({ REVIEWED_MEDIA_ORIGINS: ["https://media.terastream.test"] }));
import { mediaCsp, permittedMediaUrl, playbackProblem } from "../src/lib/media-policy";
import { workspacePlayback } from "../src/lib/workspace-playback";
import { guardedHlsRequest, hlsPlaybackConfig } from "../src/lib/hls-playback";
import { fixtureSource } from "./fixtures/playback";
import type { ResolveResult } from "../src/lib/providers/types";

describe("isolated reviewed fixture media policy", () => {
  it("admits verified MP4/HLS and only grants media blobs, never blob scripts", () => {
    expect(playbackProblem(fixtureSource())).toBeNull();
    expect(playbackProblem(fixtureSource("hls"))).toBeNull();
    expect(mediaCsp()).toBe("blob: https://media.terastream.test");
  });
  it.each(["http://media.terastream.test/clip.mp4", "https://media.terastream.test.evil.test/x", "https://user:pass@media.terastream.test/x", "https://media.terastream.test:8443/x", "https://media.terastream.test/x#secret", "https://127.0.0.1/x", "https://[::1]/x", "https://10.0.0.1/x", "https://localhost/x", "blob:https://media.terastream.test/id", "data:video/mp4,x", "javascript:x", "/clip.mp4", "https://media.terastream.test/\\evil", "https://media.terastream.test/a\nb"])("rejects unsafe/unreviewed source %s", (url) => {
    expect(permittedMediaUrl(url)).toBe(false);
  });
  it("validates status, format, expiry and verification timestamps", () => {
    const s = fixtureSource();
    expect(playbackProblem({ ...s, status: "unverified" })).not.toBeNull();
    expect(playbackProblem({ ...s, format: "mkv" })).toContain("unsupported");
    expect(playbackProblem({ ...s, expiresAt: new Date(Date.now()-1000).toISOString() })).toContain("expired");
    expect(playbackProblem({ ...s, verifiedAt: s.expiresAt })).toContain("invalid");
    expect(playbackProblem({ ...s, expiresAt: "tomorrow" })).toContain("invalid");
    expect(playbackProblem(null)).not.toBeNull();
  });
  it("never admits mock/unverified/provenance-mismatched workspace data", () => {
    const source = fixtureSource();
    const result: ResolveResult = { provider: "official", file: { id: "fixture", name: "Synthetic clip", mimeType: "video/mp4", sizeBytes: null, source: "live" }, stream: source, download: { status: "unavailable", reason: "Not enabled" } };
    expect(workspacePlayback(result)?.format).toBe("mp4");
    expect(workspacePlayback({ ...result, provider: "mock" })).toBeNull();
    expect(workspacePlayback({ ...result, file: { ...result.file, source: "mock" } })).toBeNull();
    expect(workspacePlayback({ ...result, stream: { status: "unverified", reason: "Not verified" } })).toBeNull();
    expect(workspacePlayback({ ...result, file: { ...result.file, mimeType: "video/x-matroska" } })).toBeNull();
    expect(workspacePlayback(null)).toBeNull();
  });
  it("guards every HLS request, expiry and credential/redirect policy", () => {
    const source = fixtureSource("hls");
    const controller = new AbortController();
    const req = guardedHlsRequest(source, { url: "https://media.terastream.test/segment-00.ts" }, {
      signal: controller.signal, headers: { Range: "bytes=0-99", Authorization: "secret", Cookie: "secret" },
    });
    expect(req.credentials).toBe("omit"); expect(req.redirect).toBe("error"); expect(req.referrerPolicy).toBe("no-referrer");
    expect(req.cache).toBe("no-store"); expect(req.mode).toBe("cors");
    expect([...req.headers.keys()]).toEqual(["range"]);
    controller.abort(); expect(req.signal.aborted).toBe(true);
    expect(() => guardedHlsRequest(source, { url: "https://169.254.169.254/key" }, {})).toThrow("Media request rejected");
    expect(() => guardedHlsRequest({ ...source, expiresAt: new Date(Date.now()-1).toISOString() }, { url: source.url }, {})).toThrow();
    expect(hlsPlaybackConfig(source)).toMatchObject({ debug: false, enableWorker: false, enableInterstitialPlayback: false });
  });
});
