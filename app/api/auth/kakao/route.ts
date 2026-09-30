import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appOrigin, configured, cookieOptions, STATE_COOKIE } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  if (!configured()) return NextResponse.json({ error: "카카오 로그인 설정이 아직 완료되지 않았습니다." }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: process.env.KAKAO_CLIENT_ID!, redirect_uri: `${appOrigin()}/api/auth/callback`, response_type: "code", state }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, cookieOptions(600));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
