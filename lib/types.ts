export type Role = "viewer" | "editor" | "admin";
export type SignupMode = "attendance" | "order";
export interface User { id: string; name: string; role: Role; bank?: Bank; }
export interface Menu { id: string; name: string; price: number; photoUrl: string; available: boolean; }
export interface Bank { bank: string; account: string; holder: string; }
export interface RestaurantTemplate { id: string; name: string; description: string; photoUrl: string; link?: string; menus: Menu[]; }
export interface RestaurantGroup extends RestaurantTemplate { templateId: string; leaderId: string; mode: SignupMode; payment: Bank; churchPaid?: boolean; }
export interface LunchEvent { id: string; title: string; date: string; deadline: string; published: boolean; groups: RestaurantGroup[]; }
export interface OrderItem { menuId: string; name: string; price: number; quantity: number; }
export interface Registration { id: string; eventId: string; userId: string; groupId: string; applicantName: string; attendees: string[]; items: OrderItem[]; paid: boolean; updatedAt: string; }
export interface Audit { id: string; actorId: string; action: string; at: string; detail: string; }
export interface AppState { users: User[]; templates: RestaurantTemplate[]; events: LunchEvent[]; registrations: Registration[]; audits: Audit[]; }
export interface AppSnapshot extends AppState { user: User | null; demo: boolean; configured: boolean; }
export type Command =
 | { type: "profile"; name: string }
 | { type: "profile.bank"; bank: Bank }
 | { type: "template.save"; template: RestaurantTemplate }
 | { type: "template.delete"; templateId: string }
 | { type: "event.save"; event: LunchEvent }
 | { type: "event.delete"; eventId: string }
 | { type: "registration.save"; eventId: string; groupId: string; userId?: string; attendees: string[]; quantities: Record<string, number> }
 | { type: "registration.cancel"; eventId: string; userId?: string }
 | { type: "registration.paid"; registrationId: string; paid: boolean }
 | { type: "user.role"; userId: string; role: Role };
