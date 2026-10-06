"use client";
import { useEffect, useState } from "react";
import type { AppSnapshot, LunchEvent, Registration } from "@/lib/types";
import { request, won, headcountOf, whoLabel } from "./shared";
import { cutoffLabel, dateParts } from "./dates";

const seoulDay = (offsetDays = 0) => new Date(Date.now() + 9 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
const shiftMonths = (date: string, months: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + months); return d.toISOString().slice(0, 10); };
const amount = (r: Registration) => r.items.reduce((s, i) => s + i.price * i.quantity, 0);

export function Archive({ state }: { state: AppSnapshot }) {
  const [to, setTo] = useState(() => seoulDay()), [from, setFrom] = useState(() => shiftMonths(seoulDay(), -3));
  const [restaurant, setRestaurant] = useState(""), [data, setData] = useState<{ events: LunchEvent[]; registrations: Registration[] } | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (!from || !to || from > to) return;
    request<{ events: LunchEvent[]; registrations: Registration[] }>(`/api/archive?from=${from}&to=${to}`)
      .then(result => { if (live) { setData(result); setError(""); } })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : "불러오지 못했어요."); });
    return () => { live = false; };
  }, [from, to]);
  const rows = (data?.events ?? []).flatMap(ev => ev.groups.map(g => {
    const regs = data!.registrations.filter(r => r.eventId === ev.id && r.groupId === g.id);
    return { ev, g, regs, people: regs.reduce((s, r) => s + headcountOf(r), 0), total: regs.reduce((s, r) => s + amount(r), 0) };
  })).filter(x => x.regs.length && (!restaurant || x.g.name === restaurant)).sort((a, b) => b.ev.date.localeCompare(a.ev.date) || a.g.name.localeCompare(b.g.name, "ko"));
  const names = [...new Set((data?.events ?? []).flatMap(e => e.groups.map(g => g.name)))].sort((a, b) => a.localeCompare(b, "ko"));
  const sum = { meals: new Set(rows.map(r => r.ev.id)).size, people: rows.reduce((s, r) => s + r.people, 0), total: rows.reduce((s, r) => s + r.total, 0) };
  const pay = (g: LunchEvent["groups"][number]) => g.mode !== "order" ? "참석만" : g.churchPaid ? "교회 지원" : "입금 완료";
  return <section className="archive">
    <div className="archive-filters">
      <label>시작<input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)} /></label>
      <label>끝<input type="date" value={to} min={from} onChange={e => e.target.value && setTo(e.target.value)} /></label>
      <label>식당<select value={restaurant} onChange={e => setRestaurant(e.target.value)}><option value="">전체</option>{names.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="archive-summary"><span>식사 <strong>{sum.meals}</strong></span><span>인원 <strong>{sum.people}명</strong></span><span>금액 <strong>{won(sum.total)}</strong></span></div>
    <div className="archive-list">
      <div className="archive-head" aria-hidden="true"><span>날짜</span><span>식사 · 식당</span><span>인원</span><span>금액</span><span>결제</span></div>
      {rows.map(({ ev, g, regs, people, total }) => { const p = dateParts(ev.date); return <details className="archive-row" key={`${ev.id}-${g.id}`}>
        <summary><span className="a-date">{p.month}/{p.day}({p.weekday})</span><span className="a-name"><strong>{g.name}</strong><small>{ev.title} · {state.users.find(u => u.id === g.leaderId)?.name ?? "담당"} 리더</small></span><span className="a-num">{people}명</span><span className="a-num">{g.mode === "order" ? won(total) : "-"}</span><span className={`a-pay ${g.churchPaid ? "church" : ""}`}>{pay(g)}</span></summary>
        <ul className="archive-detail">{regs.map(r => <li key={r.id}><div><strong>{r.applicantName}</strong>{whoLabel(r).slice(r.applicantName.length)}</div>{(r.items.length > 0 || !r.note) && <div className="caption">{r.items.length ? r.items.map(i => `${i.name} × ${i.quantity}`).join(" · ") : "참석 신청"}{r.items.length > 0 && ` · ${won(amount(r))}`}</div>}{r.note && <div className="caption">기타: {r.note}</div>}</li>)}<li className="caption">마감 {cutoffLabel(ev.deadline)}</li></ul>
      </details>; })}
      {data && !rows.length && <p className="empty-state">이 기간에 보관된 식사가 없어요.</p>}
      {!data && !error && <p className="caption">불러오는 중…</p>}
    </div>
  </section>;
}
