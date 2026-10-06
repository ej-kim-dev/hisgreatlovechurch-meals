# AGENTS.md — 그 사랑교회 Meals

Korean, phone-first Next.js app for church meal signups (Sunday lunches, retreats, any gathering). Real church members use the live site, so treat production data with care. Owner: 김은종. The UI copy is Korean; keep new strings Korean.

Live site: https://hisgreatlovechurch-meals.web.app — GitHub: `ej-kim-dev/hisgreatlovechurch-meals` (private), branch `main`.

## Commands

```bash
npm ci
cp .env.example .env.local   # APP_MODE=demo: local preview with fictional data only
npm run dev                  # http://localhost:3000 — the preview bar switches 교인 / 리더 / 관리자
npm run typecheck && npm run lint && npm test
npm run build
```

Run typecheck, lint and tests before every commit. When you add or change a rule in `lib/domain.ts`, add or update a test in `tests/domain.test.ts`.

## Architecture

- `app/page.tsx` — the client page (header, nav, 신청 / 마이 페이지 / 관리 tabs). `app/components/`: `signup.tsx` (signup sheet, 마이 페이지 card), `management.tsx` (현황 / 식사 / 식당 / 권한), `archive.tsx`, `dates.tsx`, `controls.tsx`, `shared.tsx` (icons, helpers).
- `app/api/` — `command` (all changes), `state`, `archive`, `upload`, `media`, `auth/{kakao,callback,logout}`, `demo` (local only).
- `lib/domain.ts` — every change is a validated command with role checks, deadlines and audit rows. **All authorization lives here, on the server.** `lib/store.ts` — Firestore reads/writes and archiving. `lib/auth.ts` — Kakao → Firebase session. `lib/types.ts` — shared types.
- `firestore.rules` denies all direct browser access; only the server (Admin SDK) touches Firestore. Do not add the Firestore web SDK to the client.
- Data: `users`, `templates` (restaurants), `events` (meals), `registrations`, `audits`.

## Deploying (manual — pushing to GitHub does NOT deploy)

```bash
git status                   # commit first; deploy uploads the working folder, including uncommitted files
gcloud run deploy meals --source . --region asia-northeast3 --quiet
firebase deploy --only hosting --project hisgreatlovechurch-meals   # only if firebase.json changed
```

Production: project `hisgreatlovechurch-meals`, Cloud Run service `meals` (Seoul) behind Firebase Hosting. Config is in Cloud Run environment variables; the Kakao client secret is in Secret Manager (`kakao-client-secret`). **Never commit keys or secrets.** See `docs/deploy.md`. After a deploy, check `https://hisgreatlovechurch-meals.web.app` returns 200 and the Cloud Run log shows no errors.

## Rules that must not break

- **Cookie name.** Firebase Hosting forwards only a cookie called `__session`; the login state and the session both use it (`lib/auth.ts`). Do not rename it.
- **Demo mode is local only.** It must stay disabled on Cloud Run and in production builds.
- **Never delete real data.** Meals are archived (`archived: true`) 7 days after their date once all orders are settled; nothing is removed. Add optional fields instead of migrating or rewriting production data. Do not run scripts that write to production Firestore without asking the owner.
- **Payments.** A signup marked paid cannot be cancelled. Changing a signup's items or restaurant clears payment; changing only its 기타 note does not. 교회 지원 (`churchPaid`) restaurants have no bank account and no payment tracking.
- **Menus.** Add / edit / remove menus only in 관리 → 식당. Inside a meal (관리 → 식사) menus can only be shown or hidden. Meals keep a copy of the restaurant, so later edits never rewrite existing orders.
- **People count.** New signups store `headcount` (a number); older ones store `attendees` names. Always count people with `headcountOf(r)` from `app/components/shared.tsx`, never `attendees.length`. The server still accepts the old `attendees` list.
- **Closed meals.** After the deadline members can see but not change their signup (enforced in `lib/domain.ts`); only leaders can.
- **Same-origin writes** and server-side validation stay in place. Photos are served only to signed-in users.

## UI conventions (the owner's decisions)

- **Less text.** Do not add explanatory notes, captions or section headings unless asked.
- **One look for actions.** Delete / cancel = the light-red square × (`icon-action danger`, `CrossIcon`). Edit = the white square pencil (`icon-action`, `PencilIcon`). Do not use text buttons for these. Whole cards that open an editor are buttons or carry a pencil.
- **Navigation.** Selected tab = bold text with a line (underline on the website, overline on the phone), never a filled box. Hover = bold, darker grey, light grey underline.
- **Header.** Church logo + "Meals" on desktop; the cross mark + "Meals" image on phones. The app icon and link-preview image are separate files.
- **Phone first.** Members use KakaoTalk's in-app browser on iPhone. Keep every field at 16px on phones (smaller makes iOS zoom the page and cut off the right side). Do not size things with `dvh` (it runs under the browser toolbar); the bottom nav sits at `bottom: 0`. Always check layouts at 375px width and on desktop.
- Money is KRW with commas (`won()`); dates show the weekday, e.g. `10/4(일)`.

## Gotchas

- If a CSS change does not appear in the dev server, change the trailing version comment at the end of `app/globals.css` (e.g. `/* v38 */` → `/* v38b */`) and hard-reload.
- Firestore queries are limited to 2,000 documents per list (`LIMIT` in `lib/store.ts`); day-to-day screens load only unarchived meals.
- Kakao caches link previews per URL; after changing the preview image or title, re-scrape it in Kakao's sharing debugger.
- Commit messages: short imperative summary plus a few lines of detail. Work directly on `main` (solo project); push after committing.
