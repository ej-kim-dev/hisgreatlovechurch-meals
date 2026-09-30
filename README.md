# Sunday Lunch · 그 사랑교회

A Korean Next.js website for Sunday restaurant signups. Members sign in with Kakao, choose one restaurant per Sunday, list everyone attending, and optionally order multiple menu items. Leaders prepare weekly restaurants and correct registrations; admins manage roles. Bank transfer is handled outside the site.

## Local preview

Requires Node.js 22 or newer. The local preview uses fictional people, restaurants, and bank details; it does not access the church database.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The preview bar switches between 교인, 리더, 관리자. Preview data resets when the development server restarts. Never use demo mode for real signup data. Cloud Run and production builds reject demo login even if `APP_MODE=demo` is accidentally set.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The app uses native Node tests for authorization, cutoff, data validation, and order preservation. See [requirements](docs/requirements.md) for the agreed behavior and [deployment guide](docs/deploy.md) for live setup.

## Structure

- `app/page.tsx`, `app/components/`: Korean member and staff interface.
- `app/api/`: authenticated Next.js server endpoints, Kakao callback, photo upload.
- `lib/domain.ts`: validated commands and role checks; `lib/store.ts`: Firestore persistence.
- `lib/auth.ts`: Kakao to Firebase session flow.
- `firestore.rules`: deny all direct client Firestore access. Only the server uses the Admin SDK.

## Security and privacy

Kakao's app-scoped user ID is linked to an internal account. Email and phone number are not requested. Member writes are checked on the server; editing someone else's order or roles is rejected. All browser writes require a matching `Origin`. Photos are available only to signed-in users. Restaurant/menu changes preserve the names and prices already submitted. Administrator access is bootstrapped with one known Kakao ID via server configuration.
