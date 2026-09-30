import { NextResponse } from "next/server";
import { assertSameOrigin, cookieOptions, DEMO_COOKIE, SESSION_COOKIE, STATE_COOKIE } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try { assertSameOrigin(request); }
  catch { return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 }); }
  const response = NextResponse.json({ ok: true });
  for (const name of [SESSION_COOKIE, DEMO_COOKIE, STATE_COOKIE]) response.cookies.set(name, "", cookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
