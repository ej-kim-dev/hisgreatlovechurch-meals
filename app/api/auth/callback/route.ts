import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { appOrigin, configured, cookieOptions, secureEqual, SESSION_COOKIE, SESSION_SECONDS, STATE_COOKIE } from "@/lib/auth";
import { firebaseApp } from "@/lib/firebase";
import { upsertKakaoUser } from "@/lib/store";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value || "";
  jar.set(STATE_COOKIE, "", cookieOptions(0));
  if (!configured()) return NextResponse.json({ error: "로그인 설정이 완료되지 않았습니다." }, { status: 503 });
  const origin = appOrigin();
  try {
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    if (!code || params.has("error") || !secureEqual(params.get("state") || "", expected)) throw new Error("Invalid callback");
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.KAKAO_CLIENT_ID!, client_secret: process.env.KAKAO_CLIENT_SECRET!, redirect_uri: `${origin}/api/auth/callback`, code }),
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) throw new Error(`Token exchange failed (${tokenResponse.status}): ${(await tokenResponse.text()).slice(0, 300)}`);
    const kakaoToken = await tokenResponse.json();
    if (typeof kakaoToken.access_token !== "string") throw new Error("Invalid token response");
    const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${kakaoToken.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!profileResponse.ok) throw new Error(`Identity lookup failed (${profileResponse.status})`);
    const profile = await profileResponse.json();
    if (!Number.isSafeInteger(profile.id) || profile.id <= 0) throw new Error("Invalid Kakao ID");
    const kakaoId = String(profile.id);
    const uid = `kakao:${kakaoId}`;
    const auth = getAuth(firebaseApp());
    try {
      const user = await auth.getUser(uid);
      if (user.disabled) throw new Error("Account disabled");
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      try { await auth.createUser({ uid }); }
      catch (creationError) {
        if ((creationError as { code?: string }).code !== "auth/uid-already-exists") throw creationError;
      }
    }
    const customToken = await auth.createCustomToken(uid);
    const exchange = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY!)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }), cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!exchange.ok) throw new Error(`Session exchange failed (${exchange.status}): ${(await exchange.text()).slice(0, 300)}`);
    const result = await exchange.json();
    if (typeof result.idToken !== "string") throw new Error("Invalid session response");
    const claims = await auth.verifyIdToken(result.idToken, true);
    if (claims.uid !== uid || Math.abs(Date.now() / 1000 - claims.auth_time) > 300) throw new Error("Invalid session identity");
    const user = await upsertKakaoUser(kakaoId);
    if (user.id !== uid) throw new Error("Identity mismatch");
    const session = await auth.createSessionCookie(result.idToken, { expiresIn: SESSION_SECONDS * 1000 });
    const response = NextResponse.redirect(new URL("/", origin));
    response.cookies.set(SESSION_COOKIE, session, cookieOptions(SESSION_SECONDS));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    console.error("Kakao login failed:", error instanceof Error ? error.message : "unknown", (error as { code?: string })?.code ?? "");
    const destination = new URL("/", origin);
    destination.searchParams.set("error", "로그인에 실패했습니다. 다시 시도해 주세요.");
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
