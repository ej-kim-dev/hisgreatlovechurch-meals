import { snapshot, jsonError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await snapshot(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, 500); }
}
