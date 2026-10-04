# LinguaEdu Final Implementation Plan

## Product and design direction
LinguaEdu keeps the repository's editorial language-learning aesthetic: **quiet editorial utility** with warm paper surfaces, deep green structure, coral action accents, Fraunces display typography, and DM Mono operational labels.

- **Design movement:** modern editorial education software — generous whitespace, asymmetrical content rhythm, and tactile card edges instead of generic admin chrome.
- **Core principles:** every number is traceable to the database; every destructive action is explicit; teacher tools stay close to the content they affect; learner unlocks are narrow and auditable.
- **Color philosophy:** deep green signals trust and ownership, paper tones reduce dashboard fatigue, coral highlights actions and attention, and honey marks progress without pretending success.
- **Layout paradigm:** a document-like teacher workspace with a live analytics spine, content-library rows, and focused modal editing rather than a dense grid of controls.
- **Signature elements:** the `l·` wordmark, mono micro-labels, and coral confirmation/selection states.
- **Interaction philosophy:** direct manipulation with clear state refreshes; edit actions reopen the same structured content, delete actions always show a confirmation modal, and zero states explain what is missing.
- **Animation:** short ease-out panel transitions, subtle card lift on hover, no motion used to imply data that does not exist; reduced-motion preferences remain respected.
- **Typography system:** Fraunces for high-level editorial headings, Manrope for readable body/UI text, DM Mono for IDs, dates, statuses, and metric labels.
- **Brand essence:** a calm operations layer for secondary-school language learning — **clear, grounded, encouraging**.
- **Brand voice:** specific and reassuring. Example lines: “Give the right learner the right path.” and “Nothing here is estimated; every count comes from your classroom data.”
- **Wordmark:** the existing `l·` mark acts as a small editorial registration mark beside the LinguaEdu/Linguora wordmark.
- **Signature brand color:** deep classroom green `#234238`.

## Backend architecture
Preserve the repository's Vite + Express + Drizzle/MySQL stack. Express serves the Vite SPA in development and `dist` in production. `/api/*` remains the only API namespace; SPA routes include `/teacher/setup`, `/teacher/login`, `/student/signup`, `/student/login`, and `/student`.

The managed WebDev database is the source of truth. Startup runs the committed idempotent migrations before accepting API traffic. The schema persists users, profiles, courses, modules, lessons, media metadata, question banks, access codes and target selections, entitlements, enrollments, sessions, views, progress, and quiz attempts.

Teacher CRUD is ownership-checked server-side:
- `POST /api/teacher/lessons` creates a lesson and optional parsed question bank.
- `PUT /api/teacher/lessons/:lessonId` edits title, unit, video URL/file metadata, PDF metadata, cover metadata, and optionally replaces parsed text.
- `DELETE /api/teacher/lessons/:lessonId` removes the lesson and its dependent question bank, views, progress, and attempts.
- `PUT|DELETE /api/teacher/question-banks/:questionBankId` edits or removes parsed question text and the structured questions.

Teacher analytics queries are live database aggregates scoped to teacher-owned content, with selectable 7/30/90-day view windows, zero-filled date buckets, and no demo values. The zero state explicitly renders `0 Students`, `0 Active Codes`, `0 Views`, and `0%` quiz average when the database is fresh.

## Authentication and targeted access
First-time setup requires Full Name, Email, Phone Number, Password, Confirm Password, and a protected `LINGUORA_BOOTSTRAP_SECRET`. Passwords use PBKDF2; sessions use the existing HttpOnly `webdev_app_session` cookie with `SameSite=None; Secure` for embedded HTTPS Preview. Teacher and student permissions are checked at every route.

Access codes are persisted with subject, grade, selected course IDs, selected module/unit IDs, unlock scope, redeemed student, and expiry. Validity is selectable as 7, 30, 90, or 365 days (full academic year). Redemption creates only the corresponding entitlements, and student content is filtered by those entitlements.

## Frontend structure
- `index.html`: public landing page plus teacher workspace shell, live analytics containers, content-library anchors, edit/delete modals, and route-compatible dashboard controls.
- `src/main.js`: public landing-page interactions and dashboard shell/tab behavior.
- `src/phase3.js`: auth routes, student learner flow, teacher data synchronization, live chart rendering, access-code targeting, teacher content library, modal edit/delete interactions, and question-bank management.
- `src/styles.css`: existing editorial styling plus library rows, asset action chips, and accessible confirmation/edit modal states.
- `server/index.js`: API, auth, analytics aggregates, CRUD handlers, student unlock/quiz lifecycle, and static serving.
- `db/schema.js` and `migrations/`: durable MySQL model and migration history.
- `scripts/e2e-phase3.mjs`: isolated lifecycle verification including teacher setup, content CRUD, targeted redemption, unlock, completion, and quiz attempt.

## Runtime and delivery
Use the managed WebDev runtime on port 3000 with database and server enabled. Keep all browser URLs relative. Verify `/api/health` and `/manus-routes.json`, run `npm run build`, run migrations through the application/database setup, execute the E2E script against the live preview process, and publish only after the checkpoint and container health configuration are valid. The final handoff should provide the verified Preview URL unless publication is explicitly confirmed.
