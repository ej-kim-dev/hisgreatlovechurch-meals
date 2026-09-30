import { assertSameOrigin, currentUser } from "@/lib/auth";
import { boundedJson, jsonError, snapshot } from "@/lib/http";
import { executeCommand } from "@/lib/store";
import type { Command } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await currentUser();
    if (!user) return jsonError(new Error("로그인이 필요합니다."), 401);
    const command = await boundedJson(request);
    await executeCommand(user, command as Command);
    return Response.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonError(error); }
}
