import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/resolve/route";
import { mockProvider } from "../src/lib/providers/mock";
import { teraboxOfficialProvider } from "../src/lib/providers/terabox-official";
import { selectedProvider } from "../src/lib/providers/config";
import { ProviderError } from "../src/lib/providers/errors";
import { isResolveResult } from "../src/lib/providers/validate-result";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function resolve(url = "https://terabox.com/s/sensitive-share") {
  return POST(new Request("https://app.test/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) }));
}
const file = { id: "file", name: "Sample.mp4", sizeBytes: 128, mimeType: "video/mp4", source: "mock" as const };

describe("official boundary (no guessed API contracts or live requests)", () => {
  it("defaults to demo and explicitly selects official without fallback", () => {
    vi.stubEnv("TERASTREAM_PROVIDER", undefined);
    expect(selectedProvider()).toBe(mockProvider);
    vi.stubEnv("TERASTREAM_PROVIDER", "official");
    expect(selectedProvider()).toBe(teraboxOfficialProvider);
  });
  it.each(["", "OFFICIAL", "unknown", "https://localhost", "secret-value"])("fails closed for invalid mode %s", async (mode) => {
    vi.stubEnv("TERASTREAM_PROVIDER", mode);
    const response = await resolve();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("configuration");
    expect(JSON.stringify(body)).not.toContain(mode || "sentinel-never-echo");
  });
  it("official mode reports a configuration blocker, never invokes mock or network, never logs share URLs", async () => {
    vi.stubEnv("TERASTREAM_PROVIDER", "official");
    const mock = vi.spyOn(mockProvider, "getMetadata");
    const network = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    const response = await resolve();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.text();
    expect(body).toContain("documentation_unverified");
    expect(body).not.toMatch(/Sample|sensitive-share|\"file\"/);
    expect(mock).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
  it("retains share validation before official resolution", async () => {
    vi.stubEnv("TERASTREAM_PROVIDER", "official");
    expect((await resolve("https://[::1]/s/a")).status).toBe(400);
  });
  it.each(["unauthorized", "authorization_expired", "unsupported", "unavailable"] as const)("maps internal %s state safely (simulated, not an API fixture)", async (code) => {
    vi.stubEnv("TERASTREAM_PROVIDER", "official");
    vi.spyOn(teraboxOfficialProvider, "getMetadata").mockRejectedValueOnce(new ProviderError(code));
    const response = await resolve();
    expect(response.status).toBe(code === "unsupported" ? 422 : code === "unavailable" ? 502 : 401);
    expect((await response.json()).code).toBe(code);
  });
  it("does not serialize or log thrown tokens or upstream URLs", async () => {
    vi.stubEnv("TERASTREAM_PROVIDER", "official");
    vi.spyOn(teraboxOfficialProvider, "getMetadata").mockRejectedValueOnce(new Error("Bearer secret-token https://api.test/?token=secret"));
    const log = vi.spyOn(console, "error");
    const response = await resolve();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toMatch(/secret|Bearer|api.test/);
    expect(log).not.toHaveBeenCalled();
  });
  it.each(["../unsafe.mp4", "<script>alert(1)</script>", "file\nname.mp4", "spoof\u202emp4.exe", "a".repeat(256)])("rejects malformed/malicious internal filenames", async (name) => {
    vi.stubEnv("TERASTREAM_PROVIDER", "mock");
    vi.spyOn(mockProvider, "getMetadata").mockResolvedValueOnce({ ...file, name });
    expect((await resolve()).status).toBe(502);
  });
  it("quarantines arbitrary or expired claimed verified links", async () => {
    vi.stubEnv("TERASTREAM_PROVIDER", "mock");
    vi.spyOn(mockProvider, "getStreamingUrl").mockResolvedValueOnce({ status: "verified", url: "https://127.0.0.1/video?token=secret", verifiedAt: "2020-01-01", expiresAt: "2020-01-02" });
    const response = await resolve();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret");
  });
  it("rejects wrong provider provenance and extra fields in internal responses", () => {
    const unavailable = { status: "unavailable", reason: "Not available" };
    const result = { provider: "mock", file, stream: unavailable, download: unavailable };
    expect(isResolveResult(result, "mock")).toBe(true);
    expect(isResolveResult(result, "official")).toBe(false);
    expect(isResolveResult({ ...result, token: "secret" }, "mock")).toBe(false);
    expect(isResolveResult({ ...result, file: { ...file, sizeBytes: -1 } }, "mock")).toBe(false);
    expect(isResolveResult({ ...result, stream: { ...unavailable, url: "https://evil.test" } }, "mock")).toBe(false);
  });
});
