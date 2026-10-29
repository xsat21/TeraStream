import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";
import { validateShareUrl } from "../share-url";

type Address = { address: string; family: number };

export function assertPublicAddresses(addresses: Address[]): void {
  if (!addresses.length || addresses.some(({ address, family }) => {
    if (!ipaddr.isValid(address)) return true;
    const parsed = ipaddr.parse(address);
    // This also rejects loopback, private, link-local, mapped IPv4, CGNAT,
    // multicast, reserved and unspecified addresses. Mixed answers fail closed.
    return parsed.range() !== "unicast" ||
      (parsed.kind() === "ipv4" ? family !== 4 : family !== 6);
  })) throw new Error("Destination must resolve exclusively to public IP addresses.");
}

/**
 * Future metadata-only transport. Not used by the mock provider.
 * Exact share allowlist, DNS checked AND pinned at connect time, TLS kept on,
 * no redirects/cookies/credentials, total deadline and a 256 KiB response cap.
 * Media/CDN URLs need a separately reviewed policy; never widen this to '*'.
 */
export async function safeFetchShareText(input: string): Promise<string> {
  const url = validateShareUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("Destination lookup timed out.")), { once: true });
      }),
    ]);
    assertPublicAddresses(addresses);
    const pinned = addresses[0];
    return await new Promise<string>((resolve, reject) => {
      const req = request(url, {
        method: "GET",
        signal: controller.signal,
        agent: false,
        family: pinned.family,
        // Keep the hostname for Host, SNI and TLS certificate verification.
        // The socket gets only the exact address we validated, blocking rebinding.
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
        headers: { Accept: "text/html, application/json", "Accept-Encoding": "identity" },
      }, (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.destroy();
          reject(new Error("Upstream status rejected; redirects are never followed."));
          return;
        }
        const contentType = res.headers["content-type"]?.split(";")[0].trim().toLowerCase();
        if (contentType !== "text/html" && contentType !== "application/json") {
          res.destroy();
          reject(new Error("Only metadata responses are permitted."));
          return;
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 256 * 1024) {
            res.destroy(new Error("Metadata response exceeds the size limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });
      req.on("error", reject);
      req.end();
    });
  } finally { clearTimeout(timer); }
}
