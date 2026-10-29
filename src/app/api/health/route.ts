export const dynamic = "force-dynamic";

/** Application liveness only; makes no TeraBox requests and exposes no details. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
