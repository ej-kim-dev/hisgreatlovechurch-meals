import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export function firebaseApp(): App {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT 설정이 필요합니다.");
  return initializeApp({ credential: applicationDefault(), projectId, storageBucket: process.env.GCS_BUCKET, serviceAccountId: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL });
}

export function firestore() { return getFirestore(firebaseApp()); }
export function storageBucket() {
  if (!process.env.GCS_BUCKET) throw new Error("GCS_BUCKET 설정이 필요합니다.");
  return getStorage(firebaseApp()).bucket(process.env.GCS_BUCKET);
}
