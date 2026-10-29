import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { assertPublicAddresses, safeFetchShareText } from "../src/lib/server/safe-fetch";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("node:https", () => ({ request: vi.fn() }));
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

describe("metadata transport SSRF defense", () => {
  it.each([
    ["127.0.0.1", 4], ["10.1.2.3", 4], ["172.16.0.1", 4], ["192.168.0.1", 4],
    ["169.254.169.254", 4], ["100.64.0.1", 4], ["0.0.0.0", 4], ["224.0.0.1", 4],
    ["192.0.2.1", 4], ["::1", 6], ["::", 6], ["fc00::1", 6], ["fe80::1", 6],
    ["::ffff:127.0.0.1", 6], ["2001:db8::1", 6], ["64:ff9b::a00:1", 6], ["bad", 4],
  ])("blocks nonpublic DNS answer %s", (address, family) => {
    expect(() => assertPublicAddresses([{ address, family }])).toThrow();
  });
  it("rejects empty, mismatched and mixed DNS answers", () => {
    expect(() => assertPublicAddresses([])).toThrow();
    expect(() => assertPublicAddresses([{ address: "8.8.8.8", family: 6 }])).toThrow();
    expect(() => assertPublicAddresses([{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }])).toThrow();
  });
  it("accepts public IPv4 and IPv6 answers", () => {
    expect(() => assertPublicAddresses([{ address: "8.8.8.8", family: 4 }, { address: "2606:4700:4700::1111", family: 6 }])).not.toThrow();
  });
  it("rejects a disallowed URL before DNS or sockets", async () => {
    await expect(safeFetchShareText("https://localhost/s/demo")).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects rebinding to private addresses before connecting", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }] as never);
    await expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("public");
    expect(request).not.toHaveBeenCalled();
  });

  function upstream(status: number, type = "text/html", content = "metadata") {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }] as never);
    const res = Object.assign(new PassThrough(), { statusCode: status, headers: { "content-type": type, location: "https://127.0.0.1/" } });
    const req = Object.assign(new EventEmitter(), { end: () => {
      const callback = vi.mocked(request).mock.calls[0][2] as unknown as (response: typeof res) => void;
      callback(res);
      if (!res.destroyed) res.end(content);
    } });
    vi.mocked(request).mockReturnValueOnce(req as never);
    return res;
  }
  it.each([301, 302, 303, 307, 308])("never follows redirects (%s), even from an allowed host", async (status) => {
    upstream(status);
    await expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("redirects");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("pins the validated IP while preserving TLS hostname", async () => {
    upstream(200);
    await expect(safeFetchShareText("https://terabox.com/s/demo")).resolves.toBe("metadata");
    const [url, options] = vi.mocked(request).mock.calls[0];
    expect((url as URL).hostname).toBe("terabox.com");
    expect(options).toMatchObject({ agent: false, family: 4 });
    expect(options).not.toHaveProperty("rejectUnauthorized", false);
    expect(options).not.toHaveProperty("headers.Authorization");
    expect(options).not.toHaveProperty("headers.Cookie");
    const callback = vi.fn();
    (options as { lookup: (...args: unknown[]) => void }).lookup("terabox.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
  });
  it("rejects media bodies", async () => {
    upstream(200, "video/mp4");
    await expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("metadata");
  });
  it("bounds response size", async () => {
    upstream(200, "text/html", "x".repeat(256 * 1024 + 1));
    await expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("size limit");
  });
  it("bounds DNS lookup time", async () => {
    vi.useFakeTimers();
    vi.mocked(lookup).mockReturnValue(new Promise(() => {}) as never);
    const result = expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5000);
    await result;
    expect(request).not.toHaveBeenCalled();
  });
  it("bounds the request deadline after DNS resolves", async () => {
    vi.useFakeTimers();
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }] as never);
    const req = Object.assign(new EventEmitter(), { end: () => {
      const options = vi.mocked(request).mock.calls[0][1] as { signal: AbortSignal };
      options.signal.addEventListener("abort", () => req.emit("error", new Error("Request timed out")));
    } });
    vi.mocked(request).mockReturnValueOnce(req as never);
    const result = expect(safeFetchShareText("https://terabox.com/s/demo")).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5000);
    await result;
  });
});
