# BJC Trackline

Job tracking / dispatch system. UI and domain model follow `bjc-trackline-overview.md` and the prototype in `Job Tracking System Design/`.

- **`backend/`** — Express + TypeScript REST API, Prisma ORM, Postgres (Neon). See [backend/README.md](file:///c:/CEDT/Intern/BJCTrackline/backend/README.md).
- **`frontend/`** — Next.js 16 + TypeScript client. See [frontend/README.md](file:///c:/CEDT/Intern/BJCTrackline/frontend/README.md).

## Running locally

Two servers, two terminals:

```bash
# 1) Backend — http://localhost:4000
cd backend
cp .env.example .env   # fill in Neon connection strings, see backend/README.md
npm install
npm run prisma:migrate
npm run seed
npm run dev

# 2) Frontend — http://localhost:3000
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Sign in at http://localhost:3000/login with:
- **EHR Credentials (Admin)** — User: `5005430` / Pass: `P6150K` (Recommended)
- Seeded Local Account (Password `Password123!` for all of them):
  - Admin — `sarah.chen@bjctrackline.test`
  - Non-admin — `priya.patel@bjctrackline.test`

---

## Running Tests

### 1) Backend Integration Tests (Vitest)
Tests cover authentication routes, task routes, and general endpoints. Uses Transaction Rollback to ensure database isolation.
```bash
cd backend
npm run test
```

### 2) Frontend E2E Tests (Playwright)
Tests cover 12 workflow states: login validation, dashboard statistics loading, starred/current tasks, calendars daily notes, chat interface, TOR requests, admin views, and complete task workflow (create → start → submit → approve → archive).
```bash
cd frontend
npm run test:e2e
```

---

## Notable Architecture Updates & Security

- **Secure Cookie Auth**: Authentication now uses secure, HTTP-only cookies (`token` cookie) with CSRF protection, instead of Bearer token localStorage storage.
- **EHR Authentication Fallback**: Integrated external login support (EHR) enabling authentication via actual employee credentials.
- **Database Transaction Isolation**: Integration tests run within transaction rollbacks so that local development database records are preserved and never deleted by tests.
- **Local File Storage**: Task attachments are stored locally inside the configured uploads directory (defaults to `./uploads`). Paths are validated to prevent directory traversal exploits.
