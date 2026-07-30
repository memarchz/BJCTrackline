# BJC Trackline

Job tracking / dispatch system. UI and domain model follow `bjc-trackline-overview.md`
and the prototype in `Job Tracking System Design/`.

- **`backend/`** — Express + TypeScript REST API, Prisma ORM, Postgres (Neon). See `backend/README.md`.
- **`frontend/`** — Next.js 16 + TypeScript client. See `frontend/README.md`.

## Running locally

Two servers, two terminals:

```bash
# 1) Backend — http://localhost:4000
cd backend
cp .env.example .env   # fill in Neon + R2 credentials, see backend/README.md
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

Sign in at http://localhost:3000/login with a seeded account (password `Password123!`
for all of them):

- Admin — `sarah.chen@bjctrackline.test`
- Non-admin — `priya.patel@bjctrackline.test`

## What's implemented

Every view from the overview: Login, Dashboard (role-scoped stats/charts), Current
Tasks / Pending Review / Starred / History, the full filterable Tasks table, task
detail drawer (full lifecycle: start → submit → approve/reject → rework/archive,
subtasks, attachments, activity log), create/edit task dialog, Teams (My Team +
Team Performance + member drilldown) and the admin All Teams equivalent, Calendar,
Chat (channels + DMs), notifications, TOR Request procurement workflow, How-to
guide, and admin Manage Users / User Accounts.

## Notable deviations from the prototype

- **No "Viewing as Admin/User" toggle.** That was a demo device to preview both
  experiences without two logins. In the real app, each account's actual `isAdmin`
  flag determines what it sees.
- **Auth is Bearer-token (localStorage), not cookies.** Simpler across dev/prod
  than cross-origin cookies for a frontend and backend on separate origins/ports.
- **File attachments go to Cloudflare R2**, not local disk (per your request)
  — see `backend/README.md` for the one-time bucket setup.

## Repo/version-control note

`frontend/` is its own git repository (created by `create-next-app`) — all frontend
work is committed there. `backend/` has no git repo; let me know if you'd like one
initialized, and whether you want one repo for the whole project or to keep
frontend/backend separate (common when they deploy independently).
