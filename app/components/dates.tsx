"use client";
import { useEffect, useRef } from "react";
import type { LunchEvent } from "@/lib/types";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export type DateStatus = "open" | "closed" | "draft";
export interface DateChip { date: string; status: DateStatus; }
const statusLabel: Record<DateStatus, string> = { open: "신청 하기", closed: "마감", draft: "준비 중" };

export function dateParts(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  return { month: day.getUTCMonth() + 1, day: day.getUTCDate(), weekday: weekdays[day.getUTCDay()] };
}

export function cutoffLabel(deadline: string): string {
  const d = new Date(new Date(deadline).getTime() + 9 * 3600_000), h = d.getUTCHours();
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${weekdays[d.getUTCDay()]}) ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function todayInSeoul(now: number): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

export function summarizeDates(events: LunchEvent[], now: number): DateChip[] {
  const dates = [...new Set(events.map(e => e.date))].sort();
  return dates.map(date => {
    const day = events.filter(e => e.date === date), live = day.filter(e => e.published);
    const status: DateStatus = live.some(e => Date.parse(e.deadline) > now) ? "open" : day.every(e => Date.parse(e.deadline) <= now) || live.length ? "closed" : "draft";
    return { date, status };
  });
}

export function DateStrip({ dates, selected, onSelect }: { dates: DateChip[]; selected?: string; onSelect: (date: string) => void }) {
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => { active.current?.scrollIntoView({ inline: "center", block: "nearest" }); }, [selected]);
  return <div className="date-strip" role="group" aria-label="식사 날짜 선택">{dates.map(d => {
    const p = dateParts(d.date), on = d.date === selected;
    return <button key={d.date} ref={on ? active : undefined} type="button" className={`date-chip ${d.status}`} aria-pressed={on} onClick={() => onSelect(d.date)}>
      <strong>{p.month}/{p.day}</strong><small>{p.weekday}요일</small><em>{statusLabel[d.status]}</em>
    </button>;
  })}</div>;
}
