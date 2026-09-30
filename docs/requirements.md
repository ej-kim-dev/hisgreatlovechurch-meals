# Sunday Lunch — 그 사랑교회

Owner: 김은종. Korean mobile-first Next.js application. Host on Google Cloud Run; Firestore data; Cloud Storage photos; Kakao authentication. No Vercel, Supabase, or payment gateway.

## Agreed behavior
- Open Kakao signup; ask for church display name; no invitation/approval. Internal ID linked to Kakao app-scoped ID; no email/phone required.
- viewer/member can register, view, update or cancel own submission before cutoff; editor/leader can manage events/templates and all registrations; admin also assigns roles. Server enforces all permissions.
- One registration per user per Sunday event, one restaurant per registration. Named companions, including children/friends; display applicant + total people, never family or +N alone. People count independent from meal count. Switching restaurant replaces old selection atomically.
- Separate Sunday events default cutoff Sunday 12:15 Asia/Seoul; leader/admin can adjust. Staff can correct closed events with audit history.
- Reusable restaurant templates with name/photo/description and menu photo/name/KRW price. Each weekly group copies a template, assigns a leader and supports attendance-only or attendance-plus-orders.
- Each group has its leader's bank transfer instructions. Copy account number. No automatic payment detection. Staff can manually confirm receipt. Changing amount/group invalidates prior confirmation.
- Existing ordered item names/prices remain snapshots; removed/unavailable items cannot be newly added, but existing selections remain visible. Templates never rewrite past events.
- Restaurant/group/mode cannot be removed or changed incompatibly while registrations exist; historical orders preserved.

## Acceptance checks
Permissions and cross-account access; deadline boundary and staff override; repeated save does not duplicate orders; replacement between groups; attendance names/count; meal quantity validation; price snapshots; template isolation; role escalation prevention; last-admin protection; same-origin mutation enforcement; OAuth state and session expiry; demo unavailable on deployed Cloud Run.

## Rollout
Local explicitly marked demo first. No real church data in demo. Production requires new cloud resources, Kakao credentials/redirect URI, billing and initial admin bootstrap. Do not claim live integrations verified until exercised against real services.
