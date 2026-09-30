# Firestore rules review

All collections (`users`, `templates`, `events`, `registrations`, `audits`) are accessed only from Next.js server routes using the Admin SDK. The client does not import the Firestore web SDK. Therefore every Firestore client read and write is denied, for authenticated and anonymous users alike. The backend enforces identity, role, ownership, and deadlines in `lib/domain.ts`.

Attack cases: anonymous list/get: denied. Member reads another user's document directly: denied. Client creates or updates its own role: denied. Client changes owner/price/deadline or submits oversized data directly: denied. Client lists audits: denied. Rule update bypass: no create/update rules to bypass. Subcollection access: recursive wildcard also denies. Server authorization remains security-critical and is tested separately.
