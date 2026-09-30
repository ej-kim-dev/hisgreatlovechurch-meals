import type { AppState, RestaurantTemplate } from './types.ts';
export function createDemoState(): AppState {
  const day = new Date(Date.now() + 9*3600000); day.setUTCDate(day.getUTCDate() + (7-day.getUTCDay() || 7)); const date = day.toISOString().slice(0,10);
  const templates: RestaurantTemplate[] = [
    { id: 'demo-hansang', name: '온기 한상', description: '따뜻한 한 끼를 함께 나누어요.', photoUrl: '', menus: [{ id: 'bibimbap', name: '비빔밥', price: 9000, photoUrl: '', available: true }, { id: 'bulgogi', name: '불고기 정식', price: 12000, photoUrl: '', available: true }, { id: 'kids', name: '어린이 볶음밥', price: 6000, photoUrl: '', available: true }] },
    { id: 'demo-noodle', name: '소담 국수', description: '가볍고 든든한 국수 한 그릇.', photoUrl: '', menus: [{ id: 'noodles', name: '잔치국수', price: 7000, photoUrl: '', available: true }, { id: 'dumplings', name: '손만두', price: 6000, photoUrl: '', available: true }] },
    { id: 'demo-table', name: '함께 식사', description: '메뉴는 식당에서 고르고 참석만 신청해요.', photoUrl: '', menus: [] },
  ];
  return { users: [{ id: 'demo-member', name: '김은종', role: 'viewer' }, { id: 'demo-leader', name: '이리더 (예시)', role: 'editor' }, { id: 'demo-admin', name: '관리자 (예시)', role: 'admin' }, { id: 'demo-friend', name: '홍길동 (예시)', role: 'viewer' }], templates, events: [{ id: `sunday-${date}`, title: '함께하는 주일 점심', date, deadline: new Date(`${date}T12:15:00+09:00`).toISOString(), published: true, groups: templates.map((t,i) => ({ ...structuredClone(t), id: `group-${i+1}`, templateId: t.id, leaderId: 'demo-leader', mode: i === 2 ? 'attendance' : 'order', payment: { bank: '예시 은행', account: '000-0000-0000', holder: '이리더 (예시)' } })) }], registrations: [], audits: [] };
}
