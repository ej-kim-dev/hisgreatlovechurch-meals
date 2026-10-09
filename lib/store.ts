import { firestore } from "./firebase";
import { createDemoState } from "./demo";
import { applyCommand, archiveExpired } from "./domain";
import type { AppState, Command, LunchEvent, Registration, User } from "./types";

const collectionNames = ["users", "templates", "events", "registrations", "audits"] as const;
const LIMIT = 2000;
const globalStore = globalThis as typeof globalThis & { sundayDemoState?: AppState };
function demoMode() { return process.env.APP_MODE === "demo" && process.env.NODE_ENV !== "production" && !process.env.K_SERVICE; }
function demoState(): AppState {
  if (globalStore.sundayDemoState) return globalStore.sundayDemoState;
  const state = createDemoState();
  // A few finished meals so the local demo has something in 아카이브.
  const base = state.events[0], order = base.groups.find(g => g.mode === "order")!;
  [["2026-08-16", "주일 점심", false], ["2026-08-30", "수련회 저녁", true], ["2026-09-13", "주일 점심", false]].forEach(([date, title, church], i) => {
    const id = `past-${i}`;
    state.events.push({ ...structuredClone(base), id, title: title as string, date: date as string, deadline: `${date}T03:15:00.000Z`, archived: true, groups: [{ ...structuredClone(order), id: `${id}-g`, churchPaid: church as boolean }] });
    state.registrations.push({ id: `${id}-r1`, eventId: id, userId: "demo-member", groupId: `${id}-g`, applicantName: "김은종", attendees: ["김은종", "박민수"], items: [{ menuId: order.menus[0].id, name: order.menus[0].name, price: order.menus[0].price, quantity: 2 }], paid: !church, updatedAt: `${date}T03:00:00.000Z` });
  });
  return globalStore.sundayDemoState = state;
}
const docs = <T>(snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as T);
function chunks<T>(items: T[], size: number): T[][] { const out: T[][] = []; for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size)); return out; }
function activeOnly(state: AppState): AppState {
  const live = state.events.filter(e => !e.archived), ids = new Set(live.map(e => e.id));
  return { ...state, events: live, registrations: state.registrations.filter(r => ids.has(r.eventId)), audits: [] };
}
type Getter = (query: FirebaseFirestore.Query) => Promise<FirebaseFirestore.QuerySnapshot>;
/** Loads only what the app works with day to day: people, restaurants, meals not yet archived and their signups. */
async function loadActive(db: FirebaseFirestore.Firestore, get: Getter): Promise<AppState> {
  const [users, templates, events] = await Promise.all([
    get(db.collection("users").limit(LIMIT + 1)),
    get(db.collection("templates").limit(LIMIT + 1)),
    get(db.collection("events").where("archived", "==", false).limit(LIMIT + 1)),
  ]);
  if ([users, templates, events].some(snap => snap.size > LIMIT)) throw new Error("데이터가 너무 많습니다. 관리자에게 문의해 주세요.");
  const registrations = (await Promise.all(chunks(events.docs.map(doc => doc.id), 30).map(ids => get(db.collection("registrations").where("eventId", "in", ids))))).flatMap(snap => docs<Registration>(snap));
  return { users: docs<User>(users), templates: docs(templates), events: docs<LunchEvent>(events), registrations, audits: [] };
}
async function markArchived(db: FirebaseFirestore.Firestore, ids: string[]) {
  for (const group of chunks(ids, 400)) {
    const batch = db.batch();
    group.forEach(id => batch.update(db.collection("events").doc(id), { archived: true }));
    await batch.commit();
  }
}
export async function getState(): Promise<AppState> {
  if (demoMode()) {
    const { state, archived } = archiveExpired(activeOnly(demoState()));
    archived.forEach(id => { const e = demoState().events.find(x => x.id === id); if (e) e.archived = true; });
    return structuredClone(state);
  }
  const db = firestore();
  const { state, archived } = archiveExpired(await loadActive(db, query => query.get()));
  if (archived.length) await markArchived(db, archived).catch(error => console.error("Archiving meals failed:", error instanceof Error ? error.message : "unknown"));
  return state;
}
/** Archived meals whose date falls in [from, to], with their signups. Staff only (checked by the caller). */
export async function getArchive(from: string, to: string): Promise<{ events: LunchEvent[]; registrations: Registration[] }> {
  if (demoMode()) {
    const events = demoState().events.filter(e => e.archived && e.date >= from && e.date <= to), ids = new Set(events.map(e => e.id));
    return structuredClone({ events, registrations: demoState().registrations.filter(r => ids.has(r.eventId)) });
  }
  const db = firestore();
  const snap = await db.collection("events").where("date", ">=", from).where("date", "<=", to).orderBy("date").limit(LIMIT + 1).get();
  if (snap.size > LIMIT) throw new Error("기간을 줄여 주세요.");
  const events = docs<LunchEvent>(snap).filter(e => e.archived === true);
  const registrations = (await Promise.all(chunks(events.map(e => e.id), 30).map(ids => db.collection("registrations").where("eventId", "in", ids).get()))).flatMap(s => docs<Registration>(s));
  return { events, registrations };
}
export async function getUser(id: string): Promise<User | null> {
  if (demoMode()) return demoState().users.find(user => user.id === id) ?? null;
  const snapshot = await firestore().collection("users").doc(id).get();
  return snapshot.exists ? ({ ...snapshot.data(), id: snapshot.id } as User) : null;
}
export async function upsertKakaoUser(kakaoId: string): Promise<User> {
  if (!/^\d{1,30}$/.test(kakaoId)) throw new Error("유효하지 않은 카카오 사용자입니다.");
  const id = `kakao:${kakaoId}`;
  const ref = firestore().collection("users").doc(id);
  return firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const bootstrap = process.env.BOOTSTRAP_ADMIN_KAKAO_ID === kakaoId;
    const existing = snapshot.exists ? ({ ...snapshot.data(), id } as User) : null;
    if (existing?.role === "admin" || (existing && !bootstrap)) return existing;
    const admins = bootstrap ? await transaction.get(firestore().collection("users").where("role", "==", "admin").limit(1)) : null;
    const role = bootstrap && admins?.empty ? "admin" : existing?.role ?? "viewer";
    if (existing) {
      if (existing.role !== role) transaction.update(ref, { role });
      return { ...existing, role };
    }
    const user: User = { id, name: "", role };
    transaction.create(ref, user);
    return user;
  });
}
export async function executeCommand(actor: User, command: Command): Promise<AppState> {
  if (demoMode()) {
    const updated = applyCommand(demoState(), actor, command);
    globalStore.sundayDemoState = updated;
    return structuredClone(activeOnly(updated));
  }
  const db = firestore();
  return db.runTransaction(async transaction => {
    const previous = await loadActive(db, query => transaction.get(query));
    const next = applyCommand(previous, actor, command);
    for (const name of collectionNames) {
      const before = new Map((previous[name] as Array<{ id: string }>).map(item => [item.id, item]));
      const after = new Map((next[name] as Array<{ id: string }>).map(item => [item.id, item]));
      for (const [id, item] of after) {
        const old = before.get(id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) transaction.set(db.collection(name).doc(id), item);
      }
      for (const id of before.keys()) if (!after.has(id)) transaction.delete(db.collection(name).doc(id));
    }
    return { ...next, audits: [] };
  });
}
