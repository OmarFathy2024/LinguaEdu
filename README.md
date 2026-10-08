# LinguaEdu

LinguaEdu is a bilingual secondary-school e-learning platform for English and Spanish learning. It provides a public editorial-style learning experience, authenticated student access to teacher-selected courses, teacher content operations, targeted access codes, live classroom analytics, and a Super Admin control plane for subject-owned teacher workspaces.

> **Product note:** The repository/package uses the historical name `Linguora` in several UI and package strings. This README uses the requested product name, **LinguaEdu**, while documenting the implementation as it exists.

## Verified scope and honesty policy

This document is based on the current source code, Drizzle schema, migrations, route manifest, deployment files, lifecycle test script, and a live browser/API verification pass. A feature is marked **Added** only when its implementation is present and its current behavior is supported by code and/or verification evidence. UI placeholders, metadata-only uploads, and incomplete flows are called out explicitly.

## Key features

### Students

- Student signup with first name, last name, email, phone/WhatsApp, and password.
- Student login by email or identifier plus password.
- Universal student account: students are not assigned to one permanent subject at signup.
- Teacher-generated access-code redemption.
- Course and lesson visibility filtered by redeemed entitlements.
- Lesson completion and lesson-view tracking.
- Randomized quiz attempts with protected answers and automatic grading.
- PDF certificate generation after course completion and a passed quiz.
- Subject-aware study chatbot inside the student portal.
- Chatbot fallback helper when no OpenAI key is configured or the provider fails.

### Teachers

- Subject-aware teacher login at `/teacher/login`.
- Teacher accounts are created only by the Super Admin.
- Spanish, English, and Arabic tenant options exist in the admin/tenant model.
- Teacher dashboard scoped to the authenticated teacher's tenant and ownership.
- Live student directory for redeemed/enrolled learners.
- Live analytics for students, active access codes, views, quiz average, and 7/30/90-day engagement windows.
- Lesson creation with subject, grade, unit, title, video metadata, PDF metadata, cover metadata, and optional parsed question text.
- Lesson editing and deletion.
- Question-bank editing and deletion.
- Targeted access-code creation for specific courses/modules or all matching grade content, with 7/30/90/365-day validity choices.
- Course-library cards with a confirmed **Delete Course** action.
- Course deletion checks teacher ownership and tenant ownership, then removes associated lessons, modules, question banks, progress, views, quiz attempts, enrollments, entitlements, and associated access codes.

### Super Admin and system

- `/admin` portal protected by `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- Admin-only teacher creation with full name, email, phone, username, password confirmation, and subject/tenant assignment.
- Admin-only Data Cleanup panel with search by name/email/username/code, confirmed deletion of teachers, students, and access codes, and a `DELETE TEST DATA` guard for marked QA/E2E records.
- Tenant records for Spanish, English, and Arabic.
- PBKDF2 password hashing.
- HttpOnly session cookies with `SameSite=None; Secure` for embedded HTTPS preview use.
- Drizzle ORM over MySQL/MariaDB.
- Idempotent SQL migrations.
- Express server serving the Vite SPA and API.
- Docker production image.
- Managed permanent deployment at [linguaedu-7mwanyoy.manus.space](https://linguaedu-7mwanyoy.manus.space).

## Feature status table

Status values follow the requested vocabulary: **✅ Added**, **⚠️ Partially Added**, **❌ Not Added**, and **🔄 Changed**.

### Authentication and authorization

| # | Feature / Request | Role | Status | Notes |
|---:|---|---|---|---|
| 1 | Dedicated `/admin` Super Admin portal | System/Admin | ✅ Added | Route exists and requires admin session authentication. |
| 2 | Admin credentials from `ADMIN_USERNAME` and `ADMIN_PASSWORD` | Admin | ✅ Added | Credentials are read from runtime environment variables; no secret is committed. |
| 3 | Admin-only teacher creation | Admin | ✅ Added | Public `/api/teacher/setup` is intentionally disabled with HTTP 410. |
| 4 | Teacher creation fields and subject assignment | Admin | ✅ Added | Full name, email, phone, username, password, confirmation, and Spanish/English/Arabic tenant selector are implemented. |
| 5 | Simple subject-aware teacher login | Teacher | ✅ Added | `/teacher/login` asks for username, password, and subject; it routes the authenticated teacher to the dashboard. |
| 6 | Wrong-subject login rejection | Teacher/System | ✅ Added | The backend returns HTTP 403 when the selected subject does not match the teacher tenant. |
| 7 | Universal student signup/login | Student | ✅ Added | Students sign up without a fixed subject and later unlock teacher-selected content. |
| 8 | Role separation and protected APIs | Both/System | ✅ Added | `requireAuth` protects role-specific routes; teacher setup is blocked publicly. |
| 9 | Password hashing and session cookies | System | ✅ Added | PBKDF2 hashes passwords; sessions are stored in the database and exposed through HttpOnly cookies. |
| 10 | Password reset/change flow | Both | ❌ Not Added | No reset-token, email, or password-change route is implemented. |

### Student features

| # | Feature / Request | Role | Status | Notes |
|---:|---|---|---|---|
| 11 | Teacher-specific access codes | Teacher/Student | ✅ Added | Codes support target subject, grade, course IDs, module IDs, unlock scope, redemption, and expiry. |
| 12 | Student sees only redeemed courses/lessons | Student | ✅ Added | `/api/student/content` filters content through entitlements and module scope. |
| 13 | Lesson progress and views | Student | ✅ Added | Completion and view endpoints persist records in `lesson_progress` and `lesson_views`. |
| 14 | Quizzes and automatic grading | Student | ✅ Added | Quiz attempts randomize a protected question subset and grade submitted answers server-side. |
| 15 | Course certificate | Student | ✅ Added | Certificate PDF is issued only after every lesson is complete and at least one quiz is passed. |
| 16 | Student AI chatbot | Student/System | ✅ Added | `/api/student/chat` is authenticated, subject-aware, OpenAI-compatible, and has a deterministic fallback. |
| 17 | OpenAI runtime integration | System | ⚠️ Partially Added | `OPENAI_API_KEY`, `OPENAI_MODEL`, and optional `OPENAI_API_BASE` are supported. Actual production-key availability depends on deployment secrets and is not verifiable from source alone. |
| 18 | Assignments, submissions, grading, and teacher feedback | Student/Teacher | ❌ Not Added | No assignment or submission tables/routes/UI exist. |
| 19 | Notifications and messaging | Both | ❌ Not Added | No notification or messaging persistence/API exists. |
| 20 | Profile editing, avatar, and password change | Student/Teacher | ❌ Not Added | Only signup/login identity data is implemented. |
| 21 | Badges, streaks, or gamification | Student | ⚠️ Partially Added | The public landing page contains illustrative streak/stat copy, but no authenticated gamification model or live streak calculation exists. |

### Teacher features and isolation

| # | Feature / Request | Role | Status | Notes |
|---:|---|---|---|---|
| 22 | Teacher dashboard scoped to own subject and records | Teacher | ✅ Added | Dashboard queries use authenticated teacher ownership and tenant checks. |
| 23 | Teacher student directory isolation | Teacher | ✅ Added | Directory results are restricted to students connected through that teacher's access codes/content. |
| 24 | Live teacher analytics | Teacher | ✅ Added | Aggregates are calculated from database records with 7/30/90-day engagement buckets. |
| 25 | Create lessons/courses | Teacher | ⚠️ Partially Added | Creating a lesson creates or reuses its course/module; there is no separate full course-builder screen. |
| 26 | Edit and delete lessons | Teacher | ✅ Added | Server-side ownership checks protect lesson updates/deletes and delete dependent records. |
| 27 | Question-bank CRUD | Teacher | ✅ Added | Parsed banks can be edited or deleted through protected routes. |
| 28 | Course delete button and confirmation modal | Teacher | ✅ Added | UI button, exact destructive confirmation text, strict ownership route, and dependent-record cleanup are implemented. |
| 29 | Course publishing/unpublishing workflow | Teacher | ⚠️ Partially Added | Content is presented as published/live after creation; explicit draft, publish, and unpublish states are not modeled. |
| 30 | Student removal from a course | Teacher | ❌ Not Added | There is no dedicated teacher action/API to remove an individual enrolled student. |
| 31 | Upload video/PDF/image/audio files | Teacher | ⚠️ Partially Added | File inputs exist, but current lesson creation stores submitted file names/metadata; durable binary upload/storage is not implemented in the API. YouTube URL metadata is supported. |
| 32 | Teacher profile/settings page | Teacher | ❌ Not Added | No separate profile/settings route exists. |

### Bilingual and language behavior

| # | Feature / Request | Role | Status | Notes |
|---:|---|---|---|---|
| 33 | English and Spanish learning paths | Student/Both | ✅ Added | Public subject content includes Spanish and English paths; teacher lesson subject choices include both. |
| 34 | UI language switcher for English and Spanish | Both | 🔄 Changed | The current public UI switcher is English/Arabic (`en`/`ar`), while course subjects are English/Spanish. It is not an English/Spanish UI switcher. |
| 35 | Spanish special characters in content | Both | ✅ Added | Text fields use Unicode-capable MySQL types and browser input; accented Spanish content was saved and displayed in live Preview. |
| 36 | Add a new language through the tenant model | System | ⚠️ Partially Added | Arabic exists as a tenant and chatbot helper label, but public course localization and full teacher/student UI coverage are not complete for Arabic or any new language. |
| 37 | Language preference persistence | Both | ❌ Not Added | UI language is frontend state; no database or durable cross-session preference is stored. |

### UI, deployment, and operations

| # | Feature / Request | Role | Status | Notes |
|---:|---|---|---|---|
| 38 | Responsive editorial UI and teacher content library | Both | ✅ Added | Responsive CSS, dashboard panels, cards, empty states, edit modals, and destructive-action confirmation are implemented. |
| 39 | Route manifest | System | ✅ Added | `public/manus-routes.json` declares the public/admin/auth/dashboard page routes. |
| 40 | Database migrations and lifecycle verification | System | ✅ Added | Migrations `0000`–`0003` and `scripts/e2e-phase3.mjs` cover core signup, admin, teacher, access-code, quiz, certificate, analytics, and CRUD paths. |
| 41 | Permanent website deployment | System | ✅ Added | The managed website is published at `https://linguaedu-7mwanyoy.manus.space`. |
| 42 | Full bilingual production QA and every requested feature | System | ⚠️ Partially Added | The requested QA plan is broader than the implemented product. Core requested additions were browser/API verified; unsupported assignments, messaging, profile, reset, and durable file storage remain open. |

## Bilingual support

### Current model

The implementation has two related but different language concepts:

1. **Learning subject/content:** Spanish and English are the primary learning paths. Teachers can create Spanish or English lessons. The student content API returns the subject attached to the redeemed entitlement.
2. **Public UI language:** The public landing page currently switches between English and Arabic. The UI language is frontend state and is not persisted to the database.

The student chatbot selects its subject from the authenticated tenant when available, then falls back to the request subject or Spanish. The deterministic helper supports grammar, vocabulary/translation, and study-plan prompts.

### Adding another language safely

To add a new learning language:

1. Add a tenant row in the tenant migration, for example `french`.
2. Add the subject option to the Admin and Teacher lesson forms.
3. Add localized public subject data and flashcards in `src/main.js`.
4. Add student-facing labels and validation messages.
5. Add chatbot helper labels/prompt rules.
6. Add the subject to access-code validation and tenant-scoped test fixtures.
7. Add migration and lifecycle tests before publication.

To add a new UI language, add a complete entry to the `copy` and localized content maps in `src/main.js`, update `applyCopy`, add RTL rules if needed, and persist the preference if cross-session behavior is required.

## User roles and permissions

### Super Admin

- Logs in at `/admin` using the runtime `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- Creates teacher accounts and assigns a tenant/subject.
- Lists teacher records and their assigned tenant.
- Searches and deletes teacher/student/access-code records from **Admin → Data Cleanup**; teacher deletion cascades through owned learning data, while student deletion releases redeemed codes.
- Can delete marked test records only after the exact confirmation text `DELETE TEST DATA` is entered.
- Does not use the public teacher signup route; public teacher setup is intentionally disabled.

### Teacher

- Logs in at `/teacher/login` with username, password, and selected subject.
- Can access only teacher APIs and dashboard data for the authenticated account.
- Can create/edit/delete owned lessons and question banks.
- Can generate access codes for owned content.
- Can view the isolated student directory and analytics.
- Can delete only courses matching both teacher ownership and tenant ownership.
- Cannot use student-only endpoints as a student.

### Student

- Signs up at `/student/signup` or logs in at `/student/login`.
- Starts without course entitlements.
- Redeems a teacher's access code to unlock only the selected course/module scope.
- Can view unlocked lessons, record progress/views, take quizzes, and request a certificate when eligible.
- Can use the authenticated subject-aware study chatbot.
- Cannot access teacher APIs or admin endpoints.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite 5, vanilla JavaScript modules, HTML, CSS |
| Backend | Node.js 22, Express 4 |
| ORM | Drizzle ORM 0.36 with `drizzle-orm/mysql-core` |
| Database | MySQL-compatible database through `mysql2` |
| Auth | Application-managed PBKDF2 password hashes, database sessions, HttpOnly cookies |
| AI | OpenAI-compatible `/chat/completions` endpoint using runtime secrets, with deterministic fallback |
| Migration | Committed SQL files run by `db/migrate.js` |
| Production | Node 22 Alpine Docker image, port 3000 |
| Hosting | Managed WebDev server/database deployment |
| Testing | `scripts/e2e-phase3.mjs`, curl/API checks, browser Preview verification |

## Project structure

```text
.
├── db/
│   ├── migrate.js          # Ordered SQL migration runner
│   └── schema.js           # Drizzle MySQL schema definitions
├── migrations/             # SQL migration history 0000–0003
├── public/
│   └── manus-routes.json   # Page route manifest
├── scripts/
│   └── e2e-phase3.mjs     # Lifecycle/API verification script
├── server/
│   └── index.js           # Express API, auth, authorization, CRUD, static serving
├── src/
│   ├── main.js             # Public landing page state, copy, subjects, interactions
│   ├── phase3.js           # Admin, teacher, student routes and dashboard logic
│   └── styles.css          # Landing, auth, dashboard, modal, and responsive styles
├── index.html              # SPA shell and dashboard markup
├── Dockerfile              # Production container declaration
├── drizzle.config.js       # Drizzle configuration
├── app.config.ts           # Managed WebDev project metadata
├── .env.example            # Safe runtime variable template
├── plan.md                 # Implementation/design decisions
└── package.json            # Scripts and dependencies
```

## Database schema

All tables are defined in `db/schema.js`. The SQL history is in `migrations/`.

| Table | Purpose and key relationships |
|---|---|
| `tenants` | Subject/tenant catalog: `spanish`, `english`, `arabic`. Users, courses, and access codes can reference `tenant_id`. |
| `users` | Shared identity table for `student` and `teacher` roles; stores username/email, PBKDF2 hash, name, phone, role, tenant, and creation time. |
| `student_profiles` | Student-specific first name, last name, WhatsApp, and user relation. |
| `courses` | Subject course owned by `created_by`, with grade, title, and optional tenant. |
| `modules` | Course units, unique by `(course_id, unit_number)`. |
| `lessons` | Course/module lesson with title and video/PDF/cover metadata, owned by a teacher. |
| `question_banks` | One parsed question bank per lesson; stores original text and structured JSON questions. |
| `access_codes` | Teacher-issued code with target subject/grade, scope, selected course/module JSON arrays, expiry, and redemption information. |
| `entitlements` | Student unlock records by course/module and access code. |
| `enrollments` | Student/course enrollment records. |
| `sessions` | Student/teacher application sessions with expiry. |
| `admin_sessions` | Super Admin sessions with expiry. |
| `lesson_progress` | Unique student/lesson completion state and completion timestamp. |
| `lesson_views` | Student lesson-view events used by teacher analytics. |
| `quiz_attempts` | Student quiz attempt, protected question snapshot, score, total, pass state, and timestamp. |

The schema intentionally has no foreign-key constraints in the current migrations. Deletion handlers therefore perform explicit dependent cleanup in application code.

## Pages and routes

### Page routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Public landing page, subject preview, flashcards, pricing copy, FAQ | Public |
| `/admin` | Super Admin login and teacher directory/creation | Admin session |
| `/teacher/login` | Subject-aware teacher login | Public form; dashboard requires teacher session |
| `/student/signup` | Student registration | Public form |
| `/student/login` | Student login | Public form |
| `/student` | Student dashboard, redeemed content, progress, quizzes, chatbot | Student session |

### API endpoints

#### System and auth

- `GET /api/health` — database health check.
- `GET /api/setup/status` — teacher-existence status.
- `POST /api/teacher/setup` — intentionally disabled with HTTP 410.
- `POST /api/admin/login` — create an admin session.
- `POST /api/admin/logout` — clear an admin session.
- `GET /api/admin/me` — validate the admin session.
- `POST /api/auth/login` — general non-teacher login path.
- `POST /api/auth/logout` — clear the application session.
- `GET /api/me` — return the current authenticated user or null.
- `POST /api/teacher/login` — subject-aware teacher login.
- `POST /api/student/signup` — create a student and session.
- `POST /api/student/login` — authenticate a student.

#### Admin

- `GET /api/admin/teachers` — list teachers and tenant data.
- `POST /api/admin/teachers` — validate and create a tenant-assigned teacher.

#### Teacher

- `GET /api/teacher/overview` — live analytics and engagement buckets.
- `GET /api/teacher/students` — isolated redeemed student directory.
- `GET /api/teacher/courses` — isolated owned courses, modules, lessons, and question banks.
- `POST /api/teacher/lessons` — create lesson/course/module content.
- `PUT /api/teacher/lessons/:lessonId` — edit owned lesson metadata/question text.
- `DELETE /api/teacher/lessons/:lessonId` — delete owned lesson and dependent records.
- `DELETE /api/teacher/courses/:courseId` — confirmed, tenant/ownership-checked course cascade delete.
- `PUT /api/teacher/question-banks/:questionBankId` — edit a question bank.
- `DELETE /api/teacher/question-banks/:questionBankId` — delete a question bank.
- `POST /api/teacher/access-codes` — create a targeted access code.
- `GET /api/teacher/access-codes` — list codes created by the teacher.

#### Student

- `POST /api/student/chat` — authenticated subject-aware AI/fallback study chat.
- `GET /api/student/content` — return entitlement-filtered courses and lessons.
- `POST /api/student/redeem-code` — redeem a teacher access code.
- `POST /api/student/lessons/:lessonId/view` — record an authorized view.
- `POST /api/student/lessons/:lessonId/complete` — complete an authorized lesson.
- `GET /api/student/quiz/:lessonId/start` — create an authorized randomized quiz attempt.
- `POST /api/student/quiz/:attemptId/submit` — grade a student-owned attempt.
- `GET /api/student/certificate/:courseId` — issue a PDF certificate when eligible.

## Installation and local setup

### Prerequisites

- Node.js 22 or compatible current Node.js.
- npm.
- MySQL or MariaDB.
- A database user with permission to create/update the LinguaEdu schema.

### Install

```bash
git clone https://github.com/OmarFathy2024/LinguaEdu.git
cd LinguaEdu
npm ci
cp .env.example .env
```

### Configure environment

Edit `.env` with local values. Do not commit `.env`.

```dotenv
DATABASE_URL=mysql://linguaedu:password@127.0.0.1:3306/linguaedu
LINGUORA_BOOTSTRAP_SECRET=replace-with-a-one-time-bootstrap-secret
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=replace-with-a-strong-admin-password
PORT=3000
# Optional:
OPENAI_API_KEY=replace-with-runtime-secret
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1
```

### Migrate and run

```bash
npm run db:migrate
npm run dev
```

The app listens on port `3000` by default. Verify:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/manus-routes.json
```

For a production-style local run:

```bash
npm run build
npm start
```

### Run lifecycle verification

The test script requires a running server and runtime credentials:

```bash
DATABASE_URL='mysql://user:password@127.0.0.1:3306/linguaedu' \
ADMIN_USERNAME='superadmin' \
ADMIN_PASSWORD='replace-with-a-strong-admin-password' \
LINGUORA_BOOTSTRAP_SECRET='replace-with-a-one-time-bootstrap-secret' \
E2E_BASE_URL='http://127.0.0.1:3000' \
node scripts/e2e-phase3.mjs
```

The script covers database health, student signup, admin-only teacher creation, wrong-subject rejection, teacher login, directory isolation, lesson/question-bank creation, targeted code creation/redemption, progress, quiz grading, certificate PDF output, reload persistence, analytics, and lesson/question-bank CRUD.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL/MariaDB connection string used by the application and migrations. |
| `DRIZZLE_DATABASE_URL` | Optional | Alternate database variable supported by the database configuration. |
| `LINGUORA_BOOTSTRAP_SECRET` | Legacy/optional | Retained for historical setup compatibility; public teacher setup is now disabled. |
| `ADMIN_USERNAME` | Yes | Super Admin username. |
| `ADMIN_PASSWORD` | Yes | Super Admin password. |
| `PORT` | Optional | HTTP listener port; defaults to `3000`. |
| `NODE_ENV` | Optional | Production mode enables built `dist` serving. |
| `OPENAI_API_KEY` | Optional | Enables OpenAI-compatible chatbot requests. |
| `OPENAI_MODEL` | Optional | Model name sent to the chat-completions endpoint; defaults to `gpt-4o-mini`. |
| `OPENAI_API_BASE` | Optional | OpenAI-compatible API base URL; defaults to `https://api.openai.com/v1`. |
| `E2E_BASE_URL` | Test-only | Base URL used by `scripts/e2e-phase3.mjs`. |

Never place actual credentials or API keys in `.env.example`, source control, frontend code, or this README.

## Demo and test accounts

The following are non-production test accounts created during local Preview verification. They are not production credentials and should be deleted or reset in any shared environment:

| Role | Username/email | Password | Scope |
|---|---|---|---|
| Preview Super Admin | `preview-admin` | `preview-admin-pass` | Local Preview only; configured at process start |
| QA Spanish Teacher | `qa_spanish` | `qa-spanish-pass` | Spanish tenant, local Preview only |
| QA English Teacher | `qa_english` | `qa-english-pass` | English tenant, local Preview only |

No production Super Admin credentials are documented here.

## Deployment

### Current deployment

The current permanent managed deployment is:

- **URL:** https://linguaedu-7mwanyoy.manus.space
- **Published commit:** `d8b548ca89f7902c5fbfd75eb138d3dae46e0445`
- **Runtime:** Node 22 container on port 3000 with managed server/database support.

### Production container

`Dockerfile` installs dependencies, copies the application, runs `npm run build`, exposes port 3000, and starts `npm start`.

### Redeploy checklist

1. Update source and migrations.
2. Run `npm ci`.
3. Run `node --check server/index.js` and `node --check src/phase3.js`.
4. Run `npm run build`.
5. Run `git diff --check`.
6. Apply migrations using the managed database/runtime process.
7. Verify `/api/health` and `/manus-routes.json`.
8. Run the lifecycle E2E script against the intended preview.
9. Commit and push the verified changes to `main`.
10. Publish the accepted checkpoint through the managed WebDev deployment flow.
11. Verify the resulting permanent URL and health endpoint.

## Known issues and limitations

1. **UI language mismatch:** The public UI language switch is English/Arabic, not English/Spanish. Spanish/English are learning subjects, not the current UI-language pair.
2. **No password reset/change:** Users cannot reset or change passwords through the product.
3. **No assignments or grading workflow:** There are no assignment submissions, teacher grading, or feedback records.
4. **No notifications or messaging:** The product has no notification inbox or direct messaging.
5. **No profile/settings area:** Avatar management, profile editing, language preference persistence, and password settings are absent.
6. **File inputs are metadata-only:** The lesson form accepts file inputs in the UI but currently sends file names/metadata to the API rather than uploading durable binary assets. A storage service is required for real PDF/video/image delivery.
7. **No explicit draft/publish state:** New content appears as live/published; unpublish/versioning is not modeled.
8. **No individual student removal action:** Teachers cannot remove one student from a course through a dedicated UI/API action.
9. **No schema foreign keys:** Dependent cleanup is implemented in route handlers. A failed mid-operation could leave partial cleanup; database transactions and foreign-key strategy should be added before high-volume production use.
10. **Admin date formatting:** The Admin teacher directory can display `Invalid Date` when MySQL datetime strings are parsed directly by the browser. The teacher record itself is stored, but the display formatter should normalize server timestamps to ISO format.
11. **No durable UI-language preference:** The language switch resets on reload because it is frontend state only.
12. **Production AI secret verification:** The code supports OpenAI runtime secrets, but the actual production secret value and provider response cannot be confirmed from repository inspection without exposing protected credentials.
13. **Public landing-page metrics are illustrative:** Streaks, country counts, rating, and pricing copy on the marketing page are presentation content, not database-backed learner analytics.
14. **QA account cleanup:** Browser/API QA creates test users and content in a test database. Do not use the test accounts listed above as production accounts.

## Future improvements / roadmap

### Priority 1 — production correctness

- Add a real object-storage upload pipeline for PDFs, videos, images, and audio.
- Normalize all API dates to ISO 8601 and fix Admin directory date rendering.
- Wrap destructive course/lesson operations in database transactions.
- Add database foreign keys or a documented, tested cascade strategy.
- Add secure rate limiting, login throttling, CSRF protection appropriate to the deployment topology, and security headers.
- Add production monitoring, structured logs, and error tracking.

### Priority 2 — learning workflows

- Add assignment creation, file/text submission, grading, and teacher feedback.
- Add teacher/student notifications and messaging.
- Add student profile, password-change, and password-reset flows.
- Add explicit course draft/publish/unpublish/version states.
- Add teacher actions for removing/revoking an individual student entitlement.
- Add richer progress dashboards and authenticated streak/badge logic.

### Priority 3 — language and product quality

- Decide whether the product UI should be English/Spanish or English/Arabic, then make the implementation consistent.
- Persist language preference per account and/or browser.
- Complete localization coverage for every route, validation message, empty state, and error.
- Add a language registry so adding a subject updates tenants, forms, copy, helper prompts, and tests together.
- Add automated browser regression tests at desktop, tablet, and mobile viewports.

## Final assessment

LinguaEdu is suitable for continued staging and controlled pilot use for the implemented flow: admin-created subject tenants, teacher-isolated content operations, targeted student unlocks, quizzes, progress, certificates, and the study chatbot. It is **not yet a complete launch-ready school platform** if assignments, grading, messaging, password recovery, durable media uploads, full bilingual UI localization, and high-assurance transactional cleanup are launch requirements.
