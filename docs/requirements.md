# 그 사랑교회 Meals — requirements

Owner: 김은종. Korean, phone-first Next.js application for church meal signups (Sunday lunches, retreats, any gathering). Hosted on Google Cloud (Firebase Hosting in front of Cloud Run); Firestore data; Cloud Storage photos; Kakao authentication. No Vercel, Supabase or payment gateway.

## Agreed behavior

**Accounts and roles**
- Open Kakao signup; ask for a church display name; no invitation or approval. Internal ID linked to Kakao's app-scoped ID; no email or phone.
- Members register, view, edit or cancel their own signup before the cutoff. Leaders manage meals, restaurants and all signups. Admins also assign roles. The server enforces every permission. The role label is shown only for leaders and admins.

**Meals and signups**
- Any number of meals per date (lunch, dinner, retreat). Each meal has a title, date, cutoff (default 12:15 Asia/Seoul for Sundays, adjustable) and one or more restaurants.
- One signup per member per meal, for one restaurant. The member only picks how many people are coming (a head count that includes themselves, 1–30); no names are needed. Older signups that list names keep showing them. People count and meal count are independent. Switching restaurant replaces the old selection atomically.
- Menus are optional: a restaurant can be attendance-only or attendance plus orders. Quantities per menu item.
- After the cutoff a member can still see their signup but cannot change or cancel it (the server refuses; 마이 페이지 shows a 신청 마감 marker instead of the edit and cancel buttons). Staff can correct signups after the cutoff; corrections are audited.
- 관리 → 현황 can be searched by name and viewed per person (신청자별) or per menu (메뉴별, listing only the people who signed up). Each restaurant stays open or closed as the leader left it, including after a search is cleared.
- A signup that is marked paid cannot be cancelled; staff untick payment first.

**Restaurants and menus**
- Saved restaurants (name, description, store link, photo, menus with name, KRW price and photo) are managed only in 관리 → 식당, where they can also be deleted. A meal copies a restaurant when it is added; later changes to the saved restaurant never rewrite existing meals or orders.
- Inside a meal, menus can only be shown or hidden. Hidden menus cannot be newly ordered; existing orders keep them.
- Each restaurant in a meal has a leader and either the leader's bank account (copy-on-tap) or **교회 지원** (paid by the church: no account, no payment tracking).
- Ordered item names and prices are snapshots. A restaurant cannot be removed from a meal while signups exist.

**Payments**
- No automatic payment detection. Staff tick 입금 per signup when the transfer arrives. Changing a signup's amount or restaurant clears the confirmation.

**Archive**
- A meal moves to the archive 7 days after its date once every ordered signup is paid or church-supported. Nothing is deleted. 관리 → 아카이브 lists finished meals by date range and restaurant with people and amount totals, and per-signup details.

## Acceptance checks

Permissions and cross-account access; deadline boundary and staff override; repeated save does not duplicate orders; replacement between restaurants; attendance names and count; menu quantity validation; hidden menus rejected; price snapshots; restaurant template isolation; role escalation prevention; last-admin protection; paid signups cannot be cancelled; church-paid meals reject payment ticks; archiving rule (7 days, settled only, never deletes); same-origin mutation enforcement; OAuth state and session expiry; demo login unavailable on Cloud Run.

## Rollout

The local demo is explicitly marked and uses no real church data. Production uses its own Google project, Kakao credentials and redirect URI, and an initial admin bootstrap — see [deploy.md](deploy.md).
