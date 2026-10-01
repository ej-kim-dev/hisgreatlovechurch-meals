# Deployment guide

Everything runs in one Google Cloud / Firebase project, `hisgreatlovechurch-meals` (region `asia-northeast3`, Seoul).

```
visitor → Firebase Hosting   hisgreatlovechurch-meals.web.app   (front door, forwards everything)
        → Cloud Run          service "meals"                    (runs this Next.js code)
        → Firestore          database "(default)"               (meals, restaurants, signups, users)
        → Cloud Storage      bucket hisgreatlovechurch-meals-photos (private, photos)
        → Firebase Auth      turns a verified Kakao user into a 5-day session cookie
        → Secret Manager     kakao-client-secret
```

Share only **https://hisgreatlovechurch-meals.web.app**. The `run.app` address reaches the same service, but login only works on the address in `APP_URL`.

## Redeploying after a code change

Cloud Run is the only thing that changes when the code changes:

```bash
gcloud run deploy meals --source . --region asia-northeast3 --quiet
```

Run `npm run typecheck && npm run lint && npm test` first. Firebase Hosting only needs redeploying when `firebase.json` changes:

```bash
firebase deploy --only hosting --project hisgreatlovechurch-meals
```

Changing a setting without touching code (creates a new revision, no rebuild):

```bash
gcloud run services update meals --region asia-northeast3 --update-env-vars NAME=value
```

## Configuration (Cloud Run environment)

| Name | Value |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | `hisgreatlovechurch-meals` |
| `APP_URL` | `https://hisgreatlovechurch-meals.web.app` — the exact trusted origin; no trailing path |
| `GCS_BUCKET` | `hisgreatlovechurch-meals-photos` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `meals-run@hisgreatlovechurch-meals.iam.gserviceaccount.com` |
| `KAKAO_CLIENT_ID` | Kakao REST API key |
| `KAKAO_CLIENT_SECRET` | from Secret Manager secret `kakao-client-secret` (never commit it) |
| `FIREBASE_WEB_API_KEY` | web API key from the Firebase project's web app settings |
| `BOOTSTRAP_ADMIN_KAKAO_ID` | numeric Kakao ID of the first admin |

`APP_MODE` must not be set in production. Cloud Run sets `K_SERVICE`, which switches demo login off.

## Service account and permissions

Cloud Run runs as `meals-run@…` with only what it needs:

- project roles: `roles/datastore.user` (Firestore), `roles/firebaseauth.admin`, `roles/secretmanager.secretAccessor`;
- `roles/storage.objectUser` on the photo bucket only (private, public access prevented);
- `roles/iam.serviceAccountTokenCreator` on itself (to sign Firebase custom tokens; needs the IAM Credentials API enabled).

The service is publicly invokable (`allUsers` → Cloud Run Invoker) so visitors can reach the login page; app data stays behind the session. The Admin SDK uses the service identity, so there is no downloaded key file.

## Kakao Developers

Kakao Login is enabled with a client secret. The only data requested is Kakao's app-scoped ID (no email, no phone). Register the redirect URI for the live address:

```text
https://hisgreatlovechurch-meals.web.app/api/auth/callback
```

If the address ever changes (for example a custom domain), add the new redirect URI in Kakao first, then update `APP_URL`, and only then remove the old one. People need to sign in again after the address changes.

**Link preview in KakaoTalk.** Kakao remembers the preview of a link it has already seen. After changing the preview image or title, open Kakao's sharing debugger (developers.kakao.com → 도구) for the address and re-scrape it, or share the link with a throw-away ending such as `/?v=2`.

## First admin

Set `BOOTSTRAP_ADMIN_KAKAO_ID` to the numeric Kakao ID of the first admin. On that account's next login, if no admin exists yet, it becomes admin. After that admins assign leader and admin roles in 관리 → 권한.

## Data and archive

- Firestore collections: `users`, `templates` (restaurants), `events` (meals), `registrations`, `audits`. `firestore.rules` denies all direct browser access; only the server reads and writes.
- Each meal has `archived: true/false`. A meal is archived 7 days after its date once every ordered signup is paid (or church-supported). Day-to-day screens load only unarchived meals; 관리 → 아카이브 reads a date range on request. Nothing is deleted.
- Firestore is in `asia-northeast3`; the location cannot be changed after creation.

## Custom domain (optional, free)

Firebase console → Hosting → Add custom domain, add the DNS records Firebase shows at the domain registrar, then follow the Kakao steps above for the new address.

## Troubleshooting

- **Kakao login fails ("카카오 로그인을 완료하지 못했어요")**: check that the redirect URI in Kakao matches `APP_URL` exactly, that `KAKAO_CLIENT_SECRET` is mounted, and read the service log: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="meals" AND severity>=WARNING' --project hisgreatlovechurch-meals --limit 20 --freshness 1h`.
- **Logged out right after login**: Firebase Hosting drops every cookie except `__session`; do not rename the session cookie in `lib/auth.ts`.
- **The app says data is too large**: the active meals, restaurants or users exceeded 2,000 documents. Archive or raise the limit in `lib/store.ts`.
- **First visit after a quiet period is slow**: Cloud Run scales to zero. Set minimum instances to 1 if that bothers people (small monthly cost).
- **iPhone zooms when typing**: every field must stay at 16px on phones; keep that rule in `app/globals.css`.
