import { describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/resolve/route";
import { mockProvider } from "../src/lib/providers/mock";

function request(body: unknown) {
  return new Request("https://app.test/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("mock resolve endpoint", () => {
  it("returns labeled fixtures, no media URL, and no cache", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    const response = await POST(request({ url: "https://terabox.com/s/demo" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.file.source).toBe("mock");
    expect(result.provider).toBe("mock");
    expect(result.stream.status).toBe("unavailable");
    expect(result.download.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain('"url":');
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });
  it.each([{}, null, { url: 1 }, { url: "https://localhost/s/abc" }])("rejects invalid bodies %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new Request("https://app.test/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status).toBe(400);
  });
  it("rejects oversized input regardless of declared size", async () => {
    expect((await POST(request({ url: "a".repeat(5000) }))).status).toBe(413);
  });
  it("requires JSON", async () => {
    expect((await POST(new Request("https://app.test/api/resolve", { method: "POST", body: "url=x" }))).status).toBe(415);
  });
  it("returns a generic provider error without leaking internals", async () => {
    const spy = vi.spyOn(mockProvider, "getMetadata").mockRejectedValueOnce(new Error("sensitive upstream detail"));
    const response = await POST(request({ url: "https://terabox.com/s/demo" }));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sensitive");
    spy.mockRestore();
  });
});
