"use client";
import { useState } from "react";
import type { Command, AppSnapshot, Registration, RestaurantTemplate } from "@/lib/types";

export type RunCommand = (command: Command) => Promise<boolean>;
export type SnapshotSetter = (snapshot: AppSnapshot) => void;
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
/** People on a signup: new signups store a head count; older ones list names. */
export const headcountOf = (r: Registration) => r.headcount ?? r.attendees.length;
/** "김은종: 3명" for new signups, "김은종 (김은종, 박민수): 2명" for older ones that list names. */
export const whoLabel = (r: Registration) => `${r.applicantName}${r.headcount === undefined ? ` (${r.attendees.join(", ")})` : ""}: ${headcountOf(r)}명`;
export const roleName = { viewer: "교인", editor: "리더", admin: "관리자" };
export const dateLabel = (date: string) => new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });
export const clockLabel = (date: string) => new Date(date).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
export const timeLabel = (date: string) => new Date(date).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
export const localDeadline = (value: string) => new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(0, 16);
export const id = () => crypto.randomUUID();
export const PencilIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
export const ArrowUpRightIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>;
export const CrossIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>;
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back for in-app browsers */ }
  try {
    const box = document.createElement("textarea");
    box.value = text; box.setAttribute("readonly", ""); box.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(box); box.select(); box.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy"); box.remove(); return ok;
  } catch { return false; }
}
export const blankTemplate = (): RestaurantTemplate => ({ id: id(), name: "", description: "", photoUrl: "", link: "", menus: [] });

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  if (!body) throw new Error("서버 응답을 읽지 못했어요.");
  return body as T;
}

export function Icon({ name, size = 20 }: { name: "bowl" | "people" | "arrow" | "clock" | "check" | "leaf" | "calendar"; size?: number }) {
  const paths = {
    bowl: <><path d="M3 10h18c0 6-4 10-9 10S3 16 3 10Z"/><path d="M8 4c-2 2 2 2 0 4m5-5c-2 2 2 2 0 4m5-3c-2 2 2 2 0 4M7 21h10"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    leaf: <><path d="M20 3C9 2 2 6 5 15c9 4 15-2 15-12Z"/><path d="M3 21 15 9"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function TableArt() {
  return <svg viewBox="0 0 500 330" className="table-art" aria-hidden="true"><ellipse cx="259" cy="286" rx="185" ry="20" fill="#d7d5d2"/><path d="M107 200 90 283m286-83 20 83" stroke="#716d65" strokeWidth="13" strokeLinecap="round"/><ellipse cx="249" cy="176" rx="190" ry="77" fill="#a19d96"/><ellipse cx="249" cy="164" rx="190" ry="77" fill="#f0e5cb" stroke="#716d64" strokeWidth="2"/><ellipse cx="173" cy="174" rx="52" ry="27" fill="#fcfaf4" stroke="#9b978f" strokeWidth="2"/><ellipse cx="173" cy="171" rx="33" ry="16" fill="#e4d7b2"/><path d="M155 171c7-12 23-11 33 0" fill="none" stroke="#858076" strokeWidth="8" strokeLinecap="round"/><ellipse cx="316" cy="155" rx="47" ry="24" fill="#fcfaf4" stroke="#9b978f" strokeWidth="2"/><ellipse cx="316" cy="152" rx="28" ry="13" fill="#c9835b"/><path d="m301 151 11-3m7 7 9-4" stroke="#eeddb7" strokeWidth="4" strokeLinecap="round"/><path d="m100 140 25 61m-14-65 25 61m249-72 23 59" stroke="#7d786e" strokeWidth="3" strokeLinecap="round"/><ellipse cx="245" cy="111" rx="18" ry="8" fill="#e2b37f"/><path d="M229 110v29c0 12 32 12 32 0v-29" fill="#c7c4bf" stroke="#777269" strokeWidth="2"/><path d="M245 109V60m0 24c-27-1-35-14-31-22 20 0 29 11 31 22m0-10c24-3 30-16 26-23-18 2-24 12-26 23" fill="#8f8a81" stroke="#79746b" strokeWidth="2"/><path d="M166 112c-9-10 10-17 1-26m151 13c-9-10 10-17 1-26" fill="none" stroke="#a4a098" strokeWidth="2" strokeLinecap="round"/><path d="m404 62 5 9 10 2-8 7 1 10-8-5-9 4 2-10-7-7 10-1Z" fill="#cda67b"/><circle cx="103" cy="73" r="4" fill="#cda67b"/></svg>;
}

export function RestaurantArt({ index = 0, name }: { index?: number; name: string }) {
  return <div className={`restaurant-art art-${index % 3}`} role="img" aria-label={`${name} 식당 일러스트`}><svg viewBox="0 0 320 170" aria-hidden="true"><ellipse cx="163" cy="153" rx="106" ry="8" fill="currentColor" opacity=".12"/><path d="M84 67h152v82H84Z" fill="#faf7ec" stroke="currentColor" strokeWidth="2"/><path d="m71 66 20-30h138l21 30Z" fill="currentColor" opacity=".8"/><path d="M76 66h168v14c-9 10-19 10-28 0-9 10-19 10-28 0-9 10-19 10-28 0-9 10-19 10-28 0-9 10-19 10-28 0-9 10-19 10-28 0Z" fill="currentColor"/><path d="M109 98h40v29h-40Zm64-1h39v52h-39Z" fill="currentColor" opacity=".3"/><path d="M128 98v29m-19-14h40" stroke="#faf7ec" strokeWidth="2"/><circle cx="204" cy="121" r="2" fill="currentColor"/><path d="M63 147v-30m0 7c-17-2-20-13-15-20 14 1 17 14 15 20m0 10c16-1 22-10 17-17-13 0-17 10-17 17" fill="currentColor" opacity=".7"/><path d="M52 138h23l-4 15H56Z" fill="currentColor"/><path d="M254 145v-29m-8 8 8-16 8 16m-18 8 10-18 10 18" stroke="currentColor" strokeWidth="3" fill="none"/><rect x="131" y="43" width="58" height="15" rx="3" fill="#faf7ec"/><path d="M143 50h34" stroke="currentColor" strokeWidth="2"/></svg></div>;
}

export function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // Uploaded images are served by an authenticated same-origin route.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" />;
}

export function PhotoUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="photo-field"><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setError("");
    try { const data = new FormData(); data.append("file", file); const result = await request<{ url: string }>("/api/upload", { method: "POST", body: data }); onChange(result.url); }
    catch (err) { setError(err instanceof Error ? err.message : "업로드 실패"); }
    finally { setBusy(false); e.target.value = ""; }
  }}/></label>{busy && <small role="status">사진을 업로드하고 있어요…</small>}{value && <div className="photo-preview"><Photo src={value} alt={label}/><button type="button" className="text-button" onClick={() => onChange("")}>사진 제거</button></div>}{error && <p className="error" role="alert">{error}</p>}</div>;
}
