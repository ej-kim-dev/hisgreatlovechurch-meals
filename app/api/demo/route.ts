import { assertSameOrigin, isDemo, setDemoUser } from "@/lib/auth";
import { boundedJson, jsonError, snapshot } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!isDemo()) return jsonError(new Error("체험 계정을 사용할 수 없습니다."), 404);
    const payload = await boundedJson(request, 1024);
    const userId = typeof payload === "object" && payload !== null && "userId" in payload ? payload.userId : null;
    if (typeof userId !== "string") throw new Error("체험 계정을 선택해 주세요.");
    await setDemoUser(userId);
    return Response.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonError(error); }
}
