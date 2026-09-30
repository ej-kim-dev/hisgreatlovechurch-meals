"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface Option { value: string; label: string; }

export function SearchSelect({ options, value, onChange, label, placeholder = "선택" }: { options: Option[]; value: string; onChange: (value: string) => void; label: string; placeholder?: string }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null), listId = useId();
  const selected = options.find(o => o.value === value);
  const needle = query.trim().toLowerCase();
  const shown = options.filter(o => o.label.toLowerCase().includes(needle));
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => { if (open) search.current?.focus(); }, [open]);
  function choose(option: Option) { onChange(option.value); setOpen(false); setQuery(""); }
  function keys(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(Math.min(cursor + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(Math.max(cursor - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[cursor]) choose(shown[cursor]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }
  return <div className="search-select" ref={root}>
    <button type="button" className={`select-trigger ${selected ? "" : "placeholder"}`} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => { setOpen(!open); setCursor(0); }}>
      <span>{selected?.label ?? placeholder}</span><span className="chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="select-panel">
      <input ref={search} className="select-search" placeholder="검색" value={query} onKeyDown={keys} onChange={e => { setQuery(e.target.value); setCursor(0); }} aria-controls={listId} />
      <ul role="listbox" id={listId}>
        {shown.map((o, i) => <li key={o.value} role="option" aria-selected={o.value === value} className={i === cursor ? "active" : ""} onMouseEnter={() => setCursor(i)} onMouseDown={e => { e.preventDefault(); choose(o); }}>{o.label}</li>)}
        {!shown.length && <li className="empty">일치하는 항목이 없어요</li>}
      </ul>
    </div>}
  </div>;
}

export function PriceInput({ value, onChange, max = 1_000_000 }: { value: number; onChange: (value: number) => void; max?: number }) {
  const clamp = (n: number) => Math.min(max, Math.max(0, n));
  return <div className="price-input">
    <input inputMode="numeric" autoComplete="off" required aria-label="가격 (원)" value={value.toLocaleString("ko-KR")} onFocus={e => e.target.select()}
      onChange={e => { const digits = e.target.value.replace(/[^0-9]/g, ""); onChange(clamp(digits ? Number(digits) : 0)); }} />
    <div className="price-steps">
      <button type="button" disabled={value <= 0} aria-label="1,000원 내리기" onClick={() => onChange(clamp(value - 1000))}>−1,000</button>
      <button type="button" disabled={value >= max} aria-label="1,000원 올리기" onClick={() => onChange(clamp(value + 1000))}>＋1,000</button>
    </div>
  </div>;
}

export function ToggleButton({ pressed, onChange, children }: { pressed: boolean; onChange: (pressed: boolean) => void; children: ReactNode }) {
  return <button type="button" className="toggle-button" aria-pressed={pressed} onClick={() => onChange(!pressed)}><span className="toggle-mark" aria-hidden="true">{pressed ? "✓" : ""}</span>{children}</button>;
}
