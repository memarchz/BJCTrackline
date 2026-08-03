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

Login accounts:
- **EHR Account (Admin)** — User: `<ESS_ID>` / Pass: `<ESS_PASSWORD>`
- Local Seed Accounts (Password `Password123!`):
  - Admin — `sarah.chen@bjctrackline.test`
  - Non-admin — `priya.patel@bjctrackline.test`

## Testing

Integration tests are implemented using **Vitest** and **Supertest**. 
- Database operations in each test run within a PostgreSQL Transaction that is rolled back after each test case (`db.$transaction`). This preserves existing database data completely.
- Skip rate limiters during local development and testing to prevent API lockouts.

To run the backend test suite:
```bash
npm run test
```

## Scripts

- `npm run dev` — run with hot reload (tsx)
- `npm run build` / `npm start` — compile to `dist/` and run
- `npm run prisma:migrate` — create/apply a migration in development
- `npm run prisma:deploy` — apply existing migrations (CI/production)
- `npm run prisma:studio` — browse the database
- `npm run seed` — reset and reseed demo data
- `npm run test` — run integration tests

## API surface

All routes are under `/api` and require a secure HTTP-only `token` cookie or Bearer token header set at login.
EHR login authentication automatically falls back to standard mock EHR authentication validation when credentials cannot be queried locally.

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

## File storage (Local Disk)

Task attachments (`POST /api/tasks/:id/attachments`) upload directly to the server's local disk inside the configured directory (defaults to `./uploads`). 

1. The target folder is defined by `UPLOADS_DIR` in `.env` (fallback is a directory named `uploads` next to the package).
2. Download URL requests return the local file stream path with strict validation mapping to prevent path traversal vulnerability (`..` escapes).

