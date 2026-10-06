import type { AppState, User, Command, Menu, RestaurantTemplate, RestaurantGroup, LunchEvent } from './types.ts';
const fail = (message: string): never => { throw new Error(message); };
function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) return fail('입력 형식을 확인해 주세요.'); return v as Record<string, unknown>; }
function text(v: unknown, max = 100, empty = false): string { if (typeof v !== 'string' || v.trim().length > max || (!empty && !v.trim())) return fail('텍스트 입력을 확인해 주세요.'); return v.trim(); }
function id(v: unknown): string { const s = text(v, 250); if (!/^[a-zA-Z0-9_:-]+$/.test(s)) fail('식별자를 확인해 주세요.'); return s; }
function bool(v: unknown): boolean { if (typeof v !== 'boolean') return fail('선택 값을 확인해 주세요.'); return v; }
function integer(v: unknown, max: number): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || v > max) return fail('수량 또는 금액을 확인해 주세요.'); return v; }
function photo(v: unknown): string { const s = text(v, 500, true); if (s && !/^\/(?:api\/media|demo)\/[a-zA-Z0-9_/-]+\.(?:jpg|jpeg|png|webp)$/i.test(s)) fail('허용된 사진을 선택해 주세요.'); if (s.includes('//')) fail('사진 경로를 확인해 주세요.'); return s; }
function link(v: unknown): string { const s = v === undefined ? '' : text(v, 500, true); if (!s) return ''; let u: URL; try { u = new URL(s); } catch { return fail('올바른 링크를 입력해 주세요.'); } if (u.protocol !== 'https:') return fail('https:// 로 시작하는 링크를 입력해 주세요.'); return s; }
function list<T>(v: unknown, max: number, parse: (item: unknown) => T): T[] { if (!Array.isArray(v) || v.length > max) return fail('목록 크기 또는 형식을 확인해 주세요.'); return v.map(parse); }
function unique(items: { id: string }[]) { if (new Set(items.map(i => i.id)).size !== items.length) fail('중복된 항목이 있습니다.'); }
function menu(v: unknown): Menu { const m = record(v); return { id: id(m.id), name: text(m.name), price: integer(m.price, 10_000_000), photoUrl: photo(m.photoUrl), available: bool(m.available) }; }
function template(v: unknown): RestaurantTemplate { const t = record(v), menus = list(t.menus, 100, menu); unique(menus); return { id: id(t.id), name: text(t.name), description: text(t.description, 1000, true), photoUrl: photo(t.photoUrl), link: link(t.link), menus }; }
function event(v: unknown, state: AppState): LunchEvent {
  const e = record(v), date = text(e.date, 10), deadline = text(e.deadline, 40), day = new Date(`${date}T00:00:00Z`), cutoff = new Date(deadline);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== date) fail('올바른 날짜를 선택해 주세요.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(deadline) || !Number.isFinite(cutoff.getTime()) || new Date(cutoff.getTime() + 9*3600000).toISOString().slice(0,10) > date) fail('마감 시간은 모임 날짜 이전(한국 시간)으로 설정해 주세요.');
  const groups = list(e.groups, 30, (v): RestaurantGroup => { const g = record(v), base = template(g), p = record(g.payment), leaderId = id(g.leaderId); if (!state.users.some(u => u.id === leaderId && u.role !== 'viewer')) fail('담당 리더를 선택해 주세요.'); if (g.mode !== 'attendance' && g.mode !== 'order') return fail('신청 방식을 확인해 주세요.'); const churchPaid = g.churchPaid === undefined ? false : bool(g.churchPaid); return { ...base, templateId: id(g.templateId), leaderId, mode: g.mode, churchPaid, payment: churchPaid ? { bank: '', account: '', holder: '' } : { bank: text(p.bank,50,true), account: text(p.account,100,true), holder: text(p.holder,100,true) } }; }); unique(groups);
  const published = bool(e.published), eventId = id(e.id);
  if (published && !groups.length && !state.registrations.some(r => r.eventId === eventId)) fail('공개하려면 식당을 한 곳 이상 추가해 주세요. "식당 불러오기"를 눌러 주세요.');
  return { id: eventId, title: text(e.title), date, deadline: cutoff.toISOString(), published, groups, archived: false };
}
export function applyCommand(state: AppState, actor: User, command: Command, now = new Date()): AppState {
  const next = structuredClone(state), user = next.users.find(u => u.id === actor.id);
  if (!user) return fail('로그인이 필요합니다.');
  const staff = user.role !== 'viewer', input = record(command), type = text(input.type,40), at = now.toISOString();
  const requireStaff = () => { if (!staff) fail('리더 권한이 필요합니다.'); };
  let closedOverride = false;
  switch (type) {
    case 'profile': user.name = text(input.name,50); break;
    case 'profile.bank': { requireStaff(); const b = record(input.bank); user.bank = { bank: text(b.bank,50,true), account: text(b.account,100,true), holder: text(b.holder,100,true) }; break; }
    case 'template.save': { requireStaff(); const t = template(input.template), i = next.templates.findIndex(x => x.id === t.id); if (i < 0) next.templates.push(t); else next.templates[i] = t; break; }
    case 'template.delete': { requireStaff(); const templateId = id(input.templateId); if (!next.templates.some(x => x.id === templateId)) return fail('식당을 찾을 수 없습니다.'); next.templates = next.templates.filter(x => x.id !== templateId); break; }
    case 'event.save': {
      requireStaff(); const e = event(input.event,next), old = next.events.find(x => x.id === e.id), registrations = next.registrations.filter(r => r.eventId === e.id);
      if (registrations.length && old?.date !== e.date) fail('신청이 있는 모임의 날짜는 변경할 수 없습니다.');
      for (const r of registrations) { const g = e.groups.find(g => g.id === r.groupId); if (!g || g.mode !== old?.groups.find(g => g.id === r.groupId)?.mode) fail('신청이 있는 식당은 삭제하거나 신청 방식을 변경할 수 없습니다.'); }
      const i = next.events.findIndex(x => x.id === e.id); if (i < 0) next.events.push(e); else next.events[i] = e; break;
    }
    case 'event.delete': {
      requireStaff(); const eventId = id(input.eventId); if (!next.events.some(x => x.id === eventId)) return fail('식사를 찾을 수 없습니다.');
      const count = next.registrations.filter(r => r.eventId === eventId).length; if (count) fail(`이미 신청한 분이 ${count}명 있어 삭제할 수 없습니다. 신청을 먼저 취소해 주세요.`);
      next.events = next.events.filter(x => x.id !== eventId); break;
    }
    case 'registration.save': case 'registration.cancel': {
      const eventId = id(input.eventId), userId = input.userId === undefined ? user.id : id(input.userId);
      if (!staff && userId !== user.id) fail('다른 사람의 신청은 변경할 수 없습니다.');
      const owner = next.users.find(u => u.id === userId), lunch = next.events.find(e => e.id === eventId);
      if (!owner) return fail('신청자를 찾을 수 없습니다.');
      text(owner.name, 50);
      if (!lunch || (!staff && !lunch.published)) return fail('모임을 찾을 수 없습니다.');
      const closed = now.getTime() >= new Date(lunch.deadline).getTime(); if (!staff && closed) fail('신청이 마감되었습니다. 리더에게 문의해 주세요.'); closedOverride = staff && closed;
      const previous = next.registrations.find(r => r.eventId === eventId && r.userId === userId);
      if (type === 'registration.cancel') { if (previous?.paid) fail('입금이 확인된 신청은 취소할 수 없습니다. 입금 확인을 먼저 해제해 주세요.'); next.registrations = next.registrations.filter(r => !(r.eventId === eventId && r.userId === userId)); break; }
      const groupId = id(input.groupId), group = lunch.groups.find(g => g.id === groupId); if (!group) return fail('식당을 찾을 수 없습니다.');
      const hasCount = input.headcount !== undefined && input.headcount !== null, headcount = hasCount ? integer(input.headcount, 30) : 0; if (hasCount && headcount < 1) fail('인원을 한 명 이상으로 선택해 주세요.');
      const attendees = hasCount ? [owner.name] : list(input.attendees,30,v => text(v,50)); if (!attendees.length) fail('참석자를 한 명 이상 입력해 주세요.');
      const quantities = record(input.quantities); if (Object.keys(quantities).length > 100) fail('메뉴가 너무 많습니다.');
      const items = Object.entries(quantities).map(([menuId,v]) => { id(menuId); const quantity = integer(v,100), oldItem = previous?.groupId === groupId ? previous.items.find(i => i.menuId === menuId) : undefined, selected = group.menus.find(m => m.id === menuId); if (!selected && !oldItem) return fail('메뉴를 찾을 수 없습니다.'); if (quantity && !selected?.available && (!oldItem || quantity > oldItem.quantity)) fail('선택할 수 없는 메뉴입니다.'); return { menuId, name: oldItem?.name ?? selected!.name, price: oldItem?.price ?? selected!.price, quantity }; }).filter(i => i.quantity > 0).sort((a,b) => a.menuId.localeCompare(b.menuId));
      const note = input.note === undefined || input.note === null ? '' : text(input.note, 200, true);
      if (group.mode === 'attendance' && items.length) fail('참석 신청에는 메뉴를 추가할 수 없습니다.'); if (group.mode === 'order' && !items.length && !note) fail('메뉴를 고르거나 기타 요청을 적어 주세요.');
      const unchanged = previous?.groupId === groupId && JSON.stringify([...previous.items].sort((a,b) => a.menuId.localeCompare(b.menuId))) === JSON.stringify(items);
      next.registrations = next.registrations.filter(r => !(r.eventId === eventId && r.userId === userId));
      next.registrations.push({ id: previous?.id ?? `reg_${eventId.length}_${eventId}_${userId}`, eventId, userId, groupId, applicantName: owner.name, attendees, ...(hasCount ? { headcount } : {}), items, ...(note ? { note } : {}), paid: Boolean(unchanged && previous?.paid), updatedAt: at }); break;
    }
    case 'registration.paid': { requireStaff(); const registrationId = id(input.registrationId), paid = bool(input.paid), r = next.registrations.find(r => r.id === registrationId); if (!r) return fail('신청을 찾을 수 없습니다.'); if (next.events.find(e => e.id === r.eventId)?.groups.find(g => g.id === r.groupId)?.churchPaid) fail('교회 지원 식사는 입금 확인이 필요 없습니다.'); r.paid = paid; r.updatedAt = at; break; }
    case 'user.role': {
      if (user.role !== 'admin') fail('관리자 권한이 필요합니다.'); const userId = id(input.userId), role = input.role;
      if (role !== 'viewer' && role !== 'editor' && role !== 'admin') return fail('권한을 확인해 주세요.'); const target = next.users.find(u => u.id === userId); if (!target) return fail('사용자를 찾을 수 없습니다.');
      if (target.role === 'admin' && role !== 'admin' && next.users.filter(u => u.role === 'admin').length === 1) fail('마지막 관리자의 권한은 변경할 수 없습니다.');
      if (role === 'viewer' && next.events.some(e => e.groups.some(g => g.leaderId === userId))) fail('담당 식당의 리더를 먼저 변경해 주세요.'); target.role = role; break;
    }
    default: fail('지원하지 않는 요청입니다.');
  }
  next.audits.push({ id: `audit_${now.getTime()}_${crypto.randomUUID().slice(0, 8)}`, actorId: user.id, action: type, at, detail: JSON.stringify({ eventId: type === 'registration.save' || type === 'registration.cancel' ? input.eventId : undefined, userId: type === 'user.role' || type === 'registration.save' || type === 'registration.cancel' ? input.userId ?? user.id : undefined, registrationId: type === 'registration.paid' ? input.registrationId : undefined, staffOverride: closedOverride }) });
  return next;
}
export function viewState(state: AppState, user: User | null): AppState {
  const current = state.users.find(u => u.id === user?.id); if (!current) return { users: [], events: [], registrations: [], templates: [], audits: [] }; if (current.role !== 'viewer') return structuredClone(state);
  const events = state.events.filter(e => e.published), leaders = new Set(events.flatMap(e => e.groups.map(g => g.leaderId)));
  return structuredClone({ users: state.users.filter(u => u.id === current.id || leaders.has(u.id)).map(u => ({ id: u.id, name: u.name, role: u.role })), events, registrations: state.registrations.filter(r => r.userId === current.id && events.some(e => e.id === r.eventId)), templates: [], audits: [] });
}

export const KEEP_PAST_DAYS = 7;

/** True once every ordered signup of the meal is paid (church-supported and attendance-only need no payment). */
export function settled(state: Pick<AppState, 'registrations'>, e: LunchEvent): boolean {
  return state.registrations.filter(r => r.eventId === e.id).every(r => { const g = e.groups.find(g => g.id === r.groupId); return g?.mode !== 'order' || g.churchPaid || r.paid; });
}
/** Meals more than 7 days past their date whose orders are all settled move to the archive. Nothing is ever deleted. */
export function archiveExpired(state: AppState, now = new Date()): { state: AppState; archived: string[] } {
  const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) - KEEP_PAST_DAYS * 86400000).toISOString().slice(0, 10);
  const archived = state.events.filter(e => !e.archived && e.date < limit && settled(state, e)).map(e => e.id);
  if (!archived.length) return { state, archived };
  const moved = new Set(archived);
  return { state: { ...state, events: state.events.filter(e => !moved.has(e.id)), registrations: state.registrations.filter(r => !moved.has(r.eventId)) }, archived };
}
