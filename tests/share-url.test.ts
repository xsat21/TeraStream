import { describe, expect, it } from "vitest";
import { validateShareUrl } from "../src/lib/share-url";

describe("share URL policy", () => {
  it.each([
    "https://www.terabox.com/s/1Abc_-123", "https://terabox.com/s/abc/",
    "https://terabox.com/sharing/link?surl=Abc_123",
  ])("accepts supported public-share syntax: %s", (url) => {
    expect(validateShareUrl(url).protocol).toBe("https:");
  });
  it.each([
    "http://terabox.com/s/abc", "javascript:alert(1)", "file:///etc/passwd",
    "https://localhost/s/abc", "https://127.0.0.1/s/abc", "https://2130706433/s/abc",
    "https://0x7f000001/s/abc", "https://[::1]/s/abc", "https://10.0.0.1/s/abc",
    "https://169.254.169.254/s/abc", "https://192.168.1.1/s/abc",
    "https://terabox.com.evil.test/s/abc", "https://evil.terabox.com/s/abc",
    "https://terabox.com@evil.test/s/abc", "https://user:pass@terabox.com/s/abc",
    "https://terabox.com:8080/s/abc", "https://terabox.com./s/abc",
    "https://terabοx.com/s/abc", "https://terabox.com/s/abc#fragment",
    "https://terabox.com/s/abc?redirect=https://localhost", "https://terabox.com/",
    "https://terabox.com/s/a%2Fb", "https://terabox.com/sharing/link?surl=abc&surl=def",
    "https://terabox.com/sharing/link?surl=abc&url=x", "https://terabox.com/sharing/link?surl=",
    "https://terabox.com\\@evil.test/s/abc", " https://terabox.com/s/abc", "https://terabox.com/s/a\nbc",
    `https://terabox.com/s/${"a".repeat(2050)}`,
  ])("rejects unsafe or unsupported input: %s", (url) => {
    expect(() => validateShareUrl(url)).toThrow();
  });
});
