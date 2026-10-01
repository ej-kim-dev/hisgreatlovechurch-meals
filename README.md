# 그 사랑교회 Meals

A Korean, phone-first website for church meal signups: Sunday lunches, retreat dinners, or any other gathering. Members sign in with Kakao, pick a restaurant for each meal, list everyone who is coming, and optionally order menu items. Leaders prepare meals and restaurants, correct signups, and confirm payments. Admins manage roles. Bank transfers happen outside the site; leaders tick them off once received.

Live site: <https://hisgreatlovechurch-meals.web.app>

## What it does

- **신청** — members choose a date and a restaurant, name everyone attending, and order menus. They can edit or cancel until the cutoff (a signup that is already marked paid cannot be cancelled).
- **마이 페이지** — the member's own signup, order sheet and payment instructions (tap the account number to copy it). Meals paid by the church show 교회 지원 instead.
- **관리** (leaders and admins):
  - **현황** — signups per restaurant with an order sheet; tick 입금 when a transfer arrives; tap a signup to correct it.
  - **식사** — create meals (several per day are fine), choose restaurants, leader, bank account or 교회 지원, and show or hide individual menus for that meal.
  - **식당** — saved restaurants with photo, store link and menus. Menus are added, edited and removed here only.
  - **아카이브** — finished meals by date range and restaurant, with totals.
  - **권한** (admins) — assign leader/admin roles.
- Meals move to the archive 7 days after their date once every order is settled. Nothing is ever deleted.

## Local preview

Requires Node.js 22 or newer. The local preview uses fictional people, restaurants and bank details; it does not touch the church database.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The preview bar switches between 교인, 리더 and 관리자. Preview data resets when the dev server restarts. Demo mode is refused on Cloud Run and in production builds even if `APP_MODE=demo` is set by mistake.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests use Node's built-in runner and cover authorization, cutoffs, validation, price snapshots, church-paid meals, payment rules and archiving.

## How it is hosted

```
visitor → Firebase Hosting (hisgreatlovechurch-meals.web.app)
        → Cloud Run service "meals" (asia-northeast3, runs this code)
        → Firestore (data) · Cloud Storage (photos) · Firebase Auth (sessions) · Kakao (login)
```

See the [deployment guide](docs/deploy.md) for setup, redeploying and troubleshooting, and [requirements](docs/requirements.md) for the agreed behavior.

## Structure

- `app/page.tsx`, `app/components/` — the member and staff interface (Korean).
- `app/api/` — server endpoints: Kakao login, commands, state, archive, photo upload and download.
- `lib/domain.ts` — every change is a validated command with role checks; `lib/store.ts` — Firestore persistence and archiving.
- `lib/auth.ts` — Kakao → Firebase session flow (cookie `__session`, the only cookie Firebase Hosting forwards).
- `firestore.rules` — denies all direct browser access; only the server (Admin SDK) reads and writes.
- `firebase.json`, `hosting/` — Hosting configuration that forwards every request to Cloud Run.

## Security and privacy

Kakao's app-scoped user ID is linked to an internal account; email and phone number are never requested. Every change is checked on the server, so editing someone else's order or role is rejected. Browser writes must come from the site's own origin. Photos are served only to signed-in users. Restaurant and menu edits never rewrite names and prices on orders already placed. The first admin is set with one Kakao ID in the server configuration.
