import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { firebaseApp } from "./firebase";
import { getUser } from "./store";
import type { User } from "./types";

export const SESSION_COOKIE = "sunday_session";
export const STATE_COOKIE = "sunday_oauth_state";
export const DEMO_COOKIE = "sunday_demo";
export const SESSION_SECONDS = 5 * 24 * 60 * 60;
const demoIds = ["demo-member", "demo-leader", "demo-admin"];
const globalAuth = globalThis as typeof globalThis & { sundayDemoSecret?: Buffer };
function demoSecret() {
  return globalAuth.sundayDemoSecret ??= randomBytes(32);
}
export function isDemo(): boolean {
  return process.env.APP_MODE === "demo" && process.env.NODE_ENV !== "production" && !process.env.K_SERVICE;
}
export function appOrigin(): string {
  const value = process.env.APP_URL || (process.env.NODE_ENV !== "production" && !process.env.K_SERVICE ? "http://localhost:3000" : "");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local && process.env.NODE_ENV !== "production" && !process.env.K_SERVICE))) {
    throw new Error("APP_URL must be a trusted HTTPS origin.");
  }
  return url.origin;
}
export function configured(): boolean {
  if (!["GOOGLE_CLOUD_PROJECT", "KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET", "FIREBASE_WEB_API_KEY", "APP_URL"].every(key => !!process.env[key])) return false;
  try { appOrigin(); return true; } catch { return false; }
}
export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== appOrigin()) throw new Error("허용되지 않은 요청입니다.");
}
export function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production" || !!process.env.K_SERVICE || process.env.APP_URL?.startsWith("https:") === true, sameSite: "lax" as const, path: "/", maxAge };
}
export function signDemoSession(userId: string, now = Date.now()): string {
  if (!isDemo() || !demoIds.includes(userId)) throw new Error("체험 계정을 사용할 수 없습니다.");
  const body = `${userId}.${Math.floor(now / 1000) + SESSION_SECONDS}`;
  return `${body}.${createHmac("sha256", demoSecret()).update(body).digest("base64url")}`;
}
export function readDemoSession(value: string, now = Date.now()): string | null {
  if (!isDemo()) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [id, expiry, signature] = parts;
  if (!demoIds.includes(id) || !/^\d+$/.test(expiry) || Number(expiry) <= Math.floor(now / 1000)) return null;
  const expected = createHmac("sha256", demoSecret()).update(`${id}.${expiry}`).digest("base64url");
  return secureEqual(signature, expected) ? id : null;
}
export async function setDemoUser(userId: string): Promise<void> {
  const token = signDemoSession(userId);
  (await cookies()).set(DEMO_COOKIE, token, cookieOptions(SESSION_SECONDS));
}
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  if (isDemo()) {
    const id = readDemoSession(jar.get(DEMO_COOKIE)?.value || "");
    return id ? getUser(id) : null;
  }
  if (!configured()) return null;
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    const token = await getAuth(firebaseApp()).verifySessionCookie(session, true);
    return await getUser(token.uid);
  } catch { return null; }
}
