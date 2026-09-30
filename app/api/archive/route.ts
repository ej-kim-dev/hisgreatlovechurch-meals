import { currentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getArchive } from "@/lib/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const day = /^\d{4}-\d{2}-\d{2}$/;
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user || user.role === "viewer") return jsonError(new Error("리더 권한이 필요합니다."), 403);
    const params = new URL(request.url).searchParams, from = params.get("from") || "", to = params.get("to") || "";
    if (!day.test(from) || !day.test(to) || from > to) throw new Error("기간을 확인해 주세요.");
    if (Date.parse(to) - Date.parse(from) > 3 * 366 * 86400000) throw new Error("기간은 3년 이내로 선택해 주세요.");
    return Response.json(await getArchive(from, to), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonError(error); }
}
