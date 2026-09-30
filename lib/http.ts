import { configured, currentUser, isDemo } from "./auth";
import { getState } from "./store";
import { viewState } from "./domain";
import type { AppSnapshot } from "./types";

export async function snapshot(): Promise<AppSnapshot> {
  const user = await currentUser();
  const state = user ? viewState(await getState(), user) : { users: [], templates: [], events: [], registrations: [], audits: [] };
  return { ...state, user, demo: isDemo(), configured: configured() };
}
export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function boundedJson(request: Request, maxBytes = 128 * 1024): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON 요청만 허용됩니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("요청 내용이 없습니다.");
  let length = 0;
  const parts: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) { await reader.cancel(); throw new Error("요청 크기를 줄여 주세요."); }
    parts.push(value);
  }
  return JSON.parse(new TextDecoder().decode(Buffer.concat(parts)));
}
