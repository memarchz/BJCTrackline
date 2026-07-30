# BJC Trackline — Backend

Express + TypeScript REST API backed by Postgres (Neon) via Prisma.

## Setup

1. Create a Neon project (https://neon.tech) and grab two connection strings from the dashboard:
   - the **pooled** connection string → `DATABASE_URL`
   - the **direct** connection string → `DIRECT_URL` (used by Prisma Migrate)
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, and a random `JWT_SECRET`.
3. Install dependencies and set up the database:

   ```bash
   npm install
   npm run prisma:migrate   # creates tables from prisma/schema.prisma
   npm run seed             # loads demo teams/users/tasks/TOR/chat data
   npm run dev               # starts the API on http://localhost:4000
   ```

Demo accounts (all use password `Password123!`):

- Admin — `sarah.chen@bjctrackline.test`
- Non-admin — `priya.patel@bjctrackline.test`

## Scripts

- `npm run dev` — run with hot reload (tsx)
- `npm run build` / `npm start` — compile to `dist/` and run
- `npm run prisma:migrate` — create/apply a migration in development
- `npm run prisma:deploy` — apply existing migrations (CI/production)
- `npm run prisma:studio` — browse the database
- `npm run seed` — reset and reseed demo data

## API surface

All routes are under `/api` and (except `/api/auth/login`) require a `Bearer` token or the
`token` cookie set at login.

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/users` — accounts, team assignment (admin for writes)
- `GET/POST/DELETE /api/teams`, `GET /api/teams/:id`, `GET /api/teams/:id/performance`
- `GET/POST/PATCH/DELETE /api/tasks`, plus lifecycle actions:
  `/:id/start`, `/:id/submit`, `/:id/approve`, `/:id/reject`, `/:id/rework`, `/:id/archive`,
  `/:id/star`, `/:id/attachments`, and bulk `/bulk/start`, `/bulk/rework`, `/bulk/archive`
- `GET/POST/PATCH /api/tor` — Terms-of-Reference procurement requests
- `GET /api/conversations`, `GET/POST /api/conversations/:id/messages`, `POST /api/conversations/dm/:userId`
- `GET/PATCH /api/notifications`
- `GET /api/dashboard` — role-scoped stats, trends, due-soon, recent activity

## File storage (Cloudflare R2)

Task attachments (`POST /api/tasks/:id/attachments`) upload directly to a Cloudflare R2
bucket via the S3-compatible API (`@aws-sdk/client-s3`, no separate R2 SDK needed).
**The bucket stays private** — no public access setting to enable. Downloads go
through a short-lived signed URL (5 min) minted on demand via
`GET /api/tasks/:id/attachments/:attachmentId/download-url`, so a leaked link
expires quickly instead of exposing the file forever.

1. Create an R2 bucket in the Cloudflare dashboard (leave public access off).
2. Create an R2 API token (Account → R2 → Manage API tokens) with read/write access to the bucket.
3. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` in `.env`.

Until these env vars are set, the rest of the API works fine — only the attachment
upload/download/delete endpoints will error.

## Notes

- Task statuses: `todo → in_progress → submitted → (rejected | completed)`. `late` is
  `null` until a task is actioned, then `true`/`false`.
