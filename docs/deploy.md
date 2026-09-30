# Live setup: Google Cloud + Kakao

The code runs as a Next.js server on Cloud Run. This repository is connected to project `hisgreatlovechurch-meals`. The project is newly created: Firebase, the Firestore database (Standard edition, `asia-northeast3` Seoul), the deployed deny-all rules, and a Firebase web app still need to be set up, and the website is not deployed yet.

## 1. Google Cloud billing and tools

Enable billing for the dedicated project in Google Cloud Console. Cloud Run, Cloud Build, and Cloud Storage may require a billing account and may incur charges. Install the official Google Cloud CLI and authenticate to the Google account that owns the project. Choose `hisgreatlovechurch-meals` and `asia-northeast3`. The Google Cloud [Next.js Cloud Run guide](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service) covers source deployment.

Create a private Cloud Storage bucket in Seoul for restaurant and menu photos. Grant the Cloud Run service account object create/read permission for that bucket, Firestore user access, and Firebase Authentication Admin. It also needs permission to sign Firebase custom tokens (Service Account Token Creator on itself, with IAM Credentials API enabled). Use a dedicated service account with only these grants.

## 2. Kakao Developers

Create a Kakao Developers application for the website. Enable Kakao Login and client secret. Add the final Cloud Run HTTPS domain as a web platform and register the exact redirect URI:

```text
https://YOUR-CLOUD-RUN-DOMAIN/api/auth/callback
```

The app needs the Kakao REST API key (`KAKAO_CLIENT_ID`) and client secret (`KAKAO_CLIENT_SECRET`). We intentionally do not request email or phone consent. Do not commit the secret to Git; store it in Google Secret Manager.

## 3. Firebase Authentication

Enable Firebase Authentication for the project. The backend uses Firebase custom tokens to turn the verified Kakao identity into a five-day session cookie. Find the Firebase web API key in the Firebase project's web app settings; place it in the server configuration as `FIREBASE_WEB_API_KEY`. The Firebase Admin SDK uses Cloud Run's service identity rather than a downloaded service-account key.

The first admin requires `BOOTSTRAP_ADMIN_KAKAO_ID` set to the numeric Kakao ID of 김은종. The app displays an account's internal ID after first login to help identify it; the bootstrap setting can be added afterward and the next login promotes that account only if no admin exists. An admin can then assign leader/admin roles in the site.

## 4. Cloud Run configuration

Deploy the source as a public Cloud Run service named `sunday-lunch` in `asia-northeast3` with Node.js 22 or newer. Cloud Run must serve the web page publicly so visitors can reach the Kakao login screen; app data remains behind the signed-in session. Set:

- `GOOGLE_CLOUD_PROJECT=hisgreatlovechurch-meals`
- `APP_URL=https://YOUR-CLOUD-RUN-DOMAIN` — exact trusted origin, no trailing path
- `GCS_BUCKET` — your private photo bucket
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the Cloud Run service account email
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` — from Kakao (store secret in Secret Manager)
- `FIREBASE_WEB_API_KEY` — Firebase web app key
- `BOOTSTRAP_ADMIN_KAKAO_ID` — numeric Kakao ID for the first admin

`APP_MODE` must be absent in production. Cloud Run sets `K_SERVICE`, which disables demo sessions in this code.

Cloud Run assigns the service URL after its first deployment. Set `APP_URL` and Kakao redirect URI to that URL, then redeploy/update the service with the finished configuration. Run a real Kakao login, register a test member, create a test Sunday event, and verify an order and a leader correction before sharing the link. Avoid real names or bank details until this end-to-end check succeeds.
