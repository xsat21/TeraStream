import { mockProvider } from "@/lib/providers/mock";
import { validateShareUrl } from "@/lib/share-url";
import type { ResolveResult } from "@/lib/providers/types";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request) {
  // Bounded, streamed input: do not trust Content-Length alone.
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Send a JSON request." }, { status: 415, headers });
  }
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return Response.json({ error: "Request is too large." }, { status: 413, headers });
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return Response.json({ error: "Send a JSON object containing a share URL." }, { status: 400, headers });
  }
  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    return Response.json({ error: "A share URL is required." }, { status: 400, headers });
  }
  let url: URL;
  try { url = validateShareUrl(body.url); } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400, headers });
  }
  try {
    const file = await mockProvider.getMetadata(url, request.signal);
    const [stream, download] = await Promise.all([
      mockProvider.getStreamingUrl(file, request.signal),
      mockProvider.getDownloadUrl(file, request.signal),
    ]);
    const result: ResolveResult = { provider: mockProvider.id, file, stream, download };
    return Response.json(result, { headers });
  } catch {
    return Response.json({ error: "The provider is unavailable. Please try again." }, { status: 502, headers });
  }
}
