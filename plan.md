

# Linguora Phase 3 Plan

## Backend architecture
Promote the Vite preview into a single Node/Express server. In development, Express mounts Vite middleware for the existing UI; in production, it serves `dist`. API routes live under `/api`, while `/teacher/setup`, `/teacher/login`, and `/student/signup` are SPA entry paths. A managed MySQL database is enabled and accessed through Drizzle ORM with a committed SQL migration.

## Persistent model
The schema owns users and roles, student profiles, courses, lessons and media metadata, question banks, access codes, enrollments, sessions, lesson progress, and quiz attempts. Uploaded files are represented as durable metadata/URL fields in this phase; the upload endpoints accept the browser's file metadata and can be connected to project storage without changing the relational model. Migration execution is idempotent and runs before the server accepts API traffic.

## Authentication and security
Teacher setup requires the protected `LINGUORA_BOOTSTRAP_SECRET` environment value and creates the first teacher only when none exists. Regular teacher login and student signup use PBKDF2 password hashes, server-side sessions, role checks, empty initial form fields, and an HttpOnly `webdev_app_session` cookie with `SameSite=None; Secure` for embedded Preview. The client never receives password hashes or bootstrap secrets.

## End-to-end flow
Student signup persists a student plus profile; teacher directory reads the database. A teacher creates a course/lesson and access code; a student redeems the code to create an enrollment and receives unlocked lesson content from the API. Question-bank text is parsed server-side, quiz attempts are randomized and graded, lesson progress is persisted, and a server-generated PDF certificate is downloadable once progress is complete and the quiz passes.


# Phase 3 Audit & Enhancement

- Added complete teacher setup validation with full name, email, phone, password confirmation, and protected bootstrap key.
- Added target-aware access codes with subject, grade, specific course/module selection, 7/30/90/365-day expiry, and active/redeemed/expired history.
- Added durable entitlements so redemption exposes only selected content; all-grade codes resolve matching teacher-owned courses.
- Added secure no-cookie YouTube embeds, MP4/PDF preview surfaces, activated-code directory counts, live lesson history, and database-backed zero states.
- Re-ran the complete E2E lifecycle after the final server restart; all ten checks passed and isolated test records were removed.
