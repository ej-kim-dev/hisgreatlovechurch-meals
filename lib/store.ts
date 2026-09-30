import { firestore } from "./firebase";
import { createDemoState } from "./demo";
import { applyCommand, purgeExpired } from "./domain";
import type { AppState, Command, User } from "./types";

const collectionNames = ["users", "templates", "events", "registrations", "audits"] as const;
const globalStore = globalThis as typeof globalThis & { sundayDemoState?: AppState };
const emptyState = (): AppState => ({ users: [], templates: [], events: [], registrations: [], audits: [] });
function demoMode() { return process.env.APP_MODE === "demo" && process.env.NODE_ENV !== "production" && !process.env.K_SERVICE; }
function demoState(): AppState { return globalStore.sundayDemoState ??= createDemoState(); }
function decode(results: Array<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>): AppState {
  const state = emptyState();
  collectionNames.forEach((name, index) => { (state[name] as Array<unknown>) = results[index].docs.map(doc => ({ ...doc.data(), id: doc.id })); });
  return state;
}
async function removeExpired(db: FirebaseFirestore.Firestore, before: AppState, after: AppState, removed: string[]) {
  const gone = new Set(removed);
  const refs = [
    ...removed.map(id => db.collection("events").doc(id)),
    ...before.registrations.filter(r => gone.has(r.eventId)).map(r => db.collection("registrations").doc(r.id)),
  ];
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
  const trail = after.audits.filter(a => a.actorId === "system" && removed.some(id => a.id === `audit_purge_${id}`));
  await Promise.all(trail.map(a => db.collection("audits").doc(a.id).set(a)));
}
export async function getState(): Promise<AppState> {
  if (demoMode()) {
    const { state, removed } = purgeExpired(demoState());
    if (removed.length) globalStore.sundayDemoState = state;
    return structuredClone(state);
  }
  const db = firestore();
  const snapshots = await Promise.all(collectionNames.map(name => db.collection(name).limit(2001).get()));
  if (snapshots.some(snapshot => snapshot.size > 2000)) throw new Error("데이터가 너무 많습니다. 관리자에게 문의해 주세요.");
  const loaded = decode(snapshots);
  const { state, removed } = purgeExpired(loaded);
  if (!removed.length) return loaded;
  try { await removeExpired(db, loaded, state, removed); return state; }
  catch (error) { console.error("Expired meal cleanup failed:", error instanceof Error ? error.message : "unknown"); return loaded; }
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
    return structuredClone(updated);
  }
  const db = firestore();
  return db.runTransaction(async transaction => {
    const refs = collectionNames.map(name => db.collection(name));
    const previous = decode(await Promise.all(refs.map(ref => transaction.get(ref.limit(2001)))));
    if (collectionNames.some(name => previous[name].length > 2000)) throw new Error("데이터가 너무 많습니다. 관리자에게 문의해 주세요.");
    const next = applyCommand(previous, actor, command);
    for (const name of collectionNames) {
      const before = new Map(previous[name].map(item => [item.id, item]));
      const after = new Map(next[name].map(item => [item.id, item]));
      for (const [id, item] of after) {
        const old = before.get(id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) transaction.set(db.collection(name).doc(id), item);
      }
      for (const id of before.keys()) if (!after.has(id)) transaction.delete(db.collection(name).doc(id));
    }
    return next;
  });
}
