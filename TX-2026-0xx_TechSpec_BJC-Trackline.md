**SPECIFICATION DOCUMENT**

*Doc No: TX-2026-0xx*

| **Project Name:** | **BJC Trackline** | **Developer Name:** | **Teetuch Chansenah (GCP Intern)** |
|---|---|---|---|

**Reason for Request**

- [ ] First time (New System)
- [ ] Fixed bug program
- [ ] User change request (Improvement)
- [x] Other (please specify): **Transfer the project to the HR (HRIS) team**

---

## 1. Overview & Functional Requirement

### 1.1 Background / Objective

BJC Trackline is a job/task-tracking web application built to let teams create, assign, track,
and review work end-to-end — from task creation through in-progress work, submission,
approval/rejection, rework, and archiving — with supporting features for team performance
reporting, internal chat, a calendar of deadlines, a Terms-of-Reference (TOR) procurement
approval workflow, and admin tools for managing users, teams, and accounts.

The system was originally designed as an HTML/JS prototype (`Job Tracking System Design/`,
documented in `bjc-trackline-overview.md`) and has since been implemented as a production-style
two-tier application:

- **Backend** — Express 4 + TypeScript REST API, Prisma ORM, PostgreSQL (hosted on Neon).
- **Frontend** — Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, React 19.

**Objective of this document**: to hand over the technical design, API surface, data model,
environment configuration, and known limitations of BJC Trackline from the development team to
the **HRIS team**, so that the HRIS team can take over ownership, deployment, maintenance, and
future enhancement of the system.

### 1.2 Functional Requirement / User Story

| No. | Requirement / User Story | Description | Priority |
|---|---|---|---|
| 1 | As a user, I can log in with my email/username and password | JWT-based login; session persists via a token stored in the browser | High |
| 2 | As a user, I can view a personal dashboard | Role-scoped stats (admin: org-wide; user: personal), 8-week completion trend, priority distribution, due-soon list, recent activity, upcoming tasks | High |
| 3 | As a user, I can create a task and assign it to one or more people, optionally split into subtasks with per-subtask assignees | A task must have at least one responsible person (task-level assignee or subtask assignee) | High |
| 4 | As an assignee, I can progress my task through its lifecycle | `todo → in_progress → submitted`, then the reviewer approves (`completed`) or rejects (`rejected → rework → in_progress`) | High |
| 5 | As a task creator/admin, I can review submitted work | Approve (marks on-time/late) or reject with a required reason | High |
| 6 | As a user, I can star/pin tasks I want to keep an eye on | Shown under "Starred" | Medium |
| 7 | As a user, I can view "Current Tasks", "Pending Review", and "History" | Grouped views over the same task pool, scoped to the logged-in user | High |
| 8 | As a user, I can filter/search the full task list | By status, priority, team, assignee, due date range, free text | Medium |
| 9 | As an assignee, I can attach files to a task and download attachments others uploaded | Stored on the server's local disk, streamed back through an authenticated endpoint | Medium |
| 10 | As a task owner, I can "archive" a completed task | Only tasks already in `completed` status can be archived; status itself does not change | Medium |
| 11 | As a task owner/admin, I can "nudge" assignees on a task | Sends an in-app notification and (if SMTP is configured) an email reminder | Low |
| 12 | As a user, I can view my team ("My Team") and Team Performance | Stats, top-3 performers, completion trend, per-member table | High |
| 13 | As a user/admin, I can drill into a specific team member | See their All Task / Completed / Late / On-time cards, an In Progress tab, and a Completed tab (folds in archived work) | High |
| 14 | As an admin, I can see a member's task score and rejection count, plus completion-rate/average-score charts | Admin-only view inside the member drill-down's Completed tab | Medium |
| 15 | As an admin, I can manage teams, users, and accounts | Create/delete teams, assign members, create/edit/delete user accounts, set credentials, toggle admin flag | High |
| 16 | As a user, I can view a monthly calendar of my task due dates | Read-only month grid | Low |
| 17 | As a user, I can chat in per-team channels and 1:1 DMs | Unread counts, message history, read receipts | Medium |
| 18 | As a user, I receive in-app notifications | Assigned / rejected / approved / comment / nudged; mark-as-read, mark-all, delete-all | Medium |
| 19 | As a user, I can raise a Terms-of-Reference (TOR) procurement request | Linear 6-stage workflow: TOR → Bidding → PTA → PR → PO → Completed | Medium |
| 20 | As an admin, I can approve/advance or reject a TOR request | Reject requires a comment; advance moves to the next stage | Medium |

### 1.3 Scope

**In Scope:**
- Full task lifecycle (create/edit/delete, start/submit/cancel/approve/reject/rework/archive,
  subtask-level lifecycle, bulk actions, attachments, starring, nudging).
- Team management and team/member performance reporting, including the admin-only
  score/rejection-count and completion-rate/average-score charts on the member drill-down page.
- Dashboard (role-scoped), Calendar, Chat (team channels + DMs), Notifications.
- TOR (Terms of Reference) procurement request workflow.
- Admin tools: Manage Users, User Accounts, All Teams.
- JWT-based authentication (Bearer token, primary transport) with a secondary httpOnly-cookie
  fallback already supported server-side.
- Email notifications for task nudges via SMTP (optional — degrades gracefully if unset).

**Out of Scope:**
- No automated test suite exists in the repository at handover time (no unit/integration/e2e
  tests) — see Section 4 for a manual UAT checklist to use in its place.
- No mobile app / native client — web only, responsive but not a dedicated mobile layout.
- No push notifications outside the in-app notification bell (no browser push, no SMS).
- No CI/CD pipeline is included in this handover; deployment steps are manual (see Section 6).
- File storage is local disk on the API server, not object storage — see the **Known
  Limitation** callout below.

> **Known Limitation — Local disk file storage**: Task attachments are written to a local
> directory on the API server (`UPLOADS_DIR`, default `./uploads`) rather than to object storage
> (the project was originally built against Cloudflare R2 and was later migrated to local disk).
> This means: (a) the uploads directory **must** be placed on a persistent volume outside the
> app's deploy/release directory in production, or files will be lost on redeploy, and (b) if the
> API is ever scaled to multiple instances/containers without a shared volume, uploads will not be
> visible across instances. Recommend confirming the production hosting plan handles this before
> go-live, or migrating back to object storage (S3/R2/GCS) if multi-instance deployment is planned.

---

## 2. System Design / Flow / API Specification

### 2.1 Solution Overview / Architecture

```
┌─────────────────────────┐        HTTPS / REST (JSON)        ┌──────────────────────────────┐
│        Frontend         │  ───────────────────────────────▶ │            Backend            │
│  Next.js 16 (App Router)│  ◀─────────────────────────────── │   Express 4 + TypeScript API  │
│  React 19 + Tailwind 4  │        Bearer JWT in header        │        (backend/src/)         │
│      (frontend/src)     │                                    └───────────────┬──────────────┘
└─────────────────────────┘                                                    │
        localStorage                                                   Prisma ORM (typed client)
      (bjc_token, JWT)                                                         │
                                                                                ▼
                                                                 ┌──────────────────────────────┐
                                                                 │   PostgreSQL (Neon, managed)  │
                                                                 └──────────────────────────────┘

Other backend integrations:
  - Local disk (UPLOADS_DIR)   — task attachment storage, streamed back via an authenticated route
  - SMTP (optional)            — nudge-reminder emails via Nodemailer
```

- **Frontend** calls the backend exclusively through `NEXT_PUBLIC_API_URL` (an axios instance in
  `frontend/src/lib/api.ts`) and holds no direct database or file-system access.
- **Backend** is a single Express process (`backend/src/app.ts` / `index.ts`) exposing a REST API
  under `/api`, backed by one PostgreSQL database via Prisma. No separate worker/queue process,
  no cache layer (Redis, etc.) — all reads are synchronous Prisma queries.
- **Authentication** is stateless JWT (see Section 2.2 and the Auth note in Section 7); there is
  no server-side session store.
- **Deployment topology** is two independently deployable units (`backend/`, `frontend/`) that
  communicate only over HTTP — they can be hosted on different providers/regions as long as CORS
  (`CORS_ORIGIN`) and `NEXT_PUBLIC_API_URL` are configured to match.

### 2.2 Process Flow

**Task lifecycle (core flow):**

```
 todo ──start──▶ in_progress ──submit──▶ submitted ──approve──▶ completed ──archive──▶ completed (archived=true)
                     ▲                       │
                     │                    reject (reason required)
                     │                       ▼
                     └──────rework────── rejected

  submitted ──cancel──▶ in_progress   (undo a submit, before review)
```

- `late` is `null` until a submission is reviewed; set to `false` (on time) or `true` (late) on
  **approve**, and forced to `true` on **reject**.
- `overdue` is a *computed*, always-fresh flag (not stored) — true only while status is
  `todo`/`in_progress` and `dueDate` has passed; it turns off once the task is submitted/rejected/
  completed.
- A task with subtasks has no lifecycle/score of its own for scoring purposes — each subtask
  moves through the same state machine independently, and when **every** subtask reaches
  `completed`, the parent task auto-completes.

**Auth flow:**

```
Login form ──POST /api/auth/login──▶ verify credentials (bcrypt) ──▶ sign JWT (7d default)
                                                                          │
                       ┌──────────────────────────────────────────────────┘
                       ▼
     Frontend stores JWT in localStorage (`bjc_token`)
                       │
                       ▼
     Every API call attaches `Authorization: Bearer <token>`
                       │
                       ▼
     Backend `requireAuth` verifies JWT, loads `req.user`; `requireAdmin` additionally checks `isAdmin`
                       │
                       ▼
     401 response ──▶ frontend clears token and redirects to /login
```

**TOR (Terms of Reference) review flow:**

```
pending_chief_approval → tor → bidding → pta → pr → po → completed   (each "advance" moves step +1)
                                    │
                                    └── "reject" (comment required) → rejected=true, step/status unchanged
```

*(Attach a sequence/flowchart diagram here if the HRIS team requires a visual version — the state
machines above are text-form equivalents of what the diagram should show.)*

### 2.3 API Specification

All endpoints are mounted under `/api` (`backend/src/app.ts`) and require `Authorization: Bearer
<token>` unless marked **public**. A secondary httpOnly `token` cookie is also accepted by the
backend, but the frontend only ever uses the Bearer header. `GET /api/health` (public) returns
`{ ok: true }` for uptime checks. Unmatched routes return 404 `{ error: "Not found" }"`.

**Auth** (`/api/auth`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| POST | `/api/auth/login` | Req: `identifier, password, remember?` → Res: `{ token, user }` | **Public.** Also sets an httpOnly `token` cookie (unused by the frontend) |
| POST | `/api/auth/logout` | → 204 | **Public** (clears cookie) |
| GET | `/api/auth/me` | → `{ user }` | Auth required |

**Users** (`/api/users`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/users/` | Query: `unassigned?` → `{ users[] }` | Auth required |
| POST | `/api/users/` | Req: `name, email, username?, password, title?, teamId?, admin?` → 201 `{ user }` | Admin only |
| PATCH | `/api/users/:id` | Req: `name?, title?, teamId?, admin?` → `{ user }` | Admin only |
| PATCH | `/api/users/:id/credentials` | Req: `email?, password?` → `{ user }` | Admin only |
| DELETE | `/api/users/:id` | → 204 | Admin only; cannot delete self |

**Teams** (`/api/teams`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/teams/` | → `{ teams: [{id,name,memberCount,taskCount}] }` | Auth required |
| POST | `/api/teams/` | Req: `name` → 201 `{ team }` | Admin only |
| DELETE | `/api/teams/:id` | → 204 | Admin only |
| GET | `/api/teams/:id` | → `{ team: {id,name,members[]} }` | Auth required |
| GET | `/api/teams/:id/performance` | → `{ stats, trend, top3, members, tasks }` | Auth required; `members[]` includes per-member `completionTrend` (8-week on-time/late/avg-score) |

**Tasks** (`/api/tasks`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/tasks/` | Query: `assigneeId, createdById, teamId, status, priority, starred, archived, archivedAny, overdue, dueBefore, dueAfter, q` → `{ tasks[] }` | Non-admins see only their own/team-visible tasks |
| GET | `/api/tasks/:id` | → `{ task }` | Requires `canViewTask` |
| POST | `/api/tasks/` | Req: `title, description?, teamId, priority, impact, dueDate, assigneeIds?, subtasks?[]` → 201 `{ task }` | Must assign ≥1 person (task or subtask level) |
| PATCH | `/api/tasks/:id` | Same shape, all optional → `{ task }` | Creator or admin only |
| DELETE | `/api/tasks/:id` | → 204 | Creator or admin only |
| POST | `/api/tasks/:id/attachments` | Multipart `file` (max 20 MB) → 201 `{ task }` | Task/subtask assignee only |
| GET | `/api/tasks/:id/attachments/:attachmentId/download` | → binary stream | Requires `canViewTask`; streamed from local disk |
| DELETE | `/api/tasks/:id/attachments/:attachmentId` | → `{ task }` | Uploader or admin only |
| POST / DELETE | `/api/tasks/:id/star` | → 204 | Auth required |
| POST | `/api/tasks/:id/start` | `todo → in_progress` → `{ task }` | Assignee only |
| POST | `/api/tasks/:id/submit` | `in_progress → submitted` → `{ task }` | Assignee only |
| POST | `/api/tasks/:id/cancel` | `submitted → in_progress` → `{ task }` | Assignee or admin |
| POST | `/api/tasks/:id/approve` | `submitted → completed` → `{ task }` | Creator or admin only; computes `late` |
| POST | `/api/tasks/:id/reject` | Req: `reason` → `{ task }` | Creator or admin only; `late=true` |
| POST | `/api/tasks/:id/rework` | `rejected → in_progress` → `{ task }` | Assignee only |
| POST | `/api/tasks/:id/archive` | `completed → archived=true` → `{ task }` | Assignee only; completed tasks only |
| POST | `/api/tasks/:id/nudge` | → `{ task }` | Creator or admin; notification + optional email |
| POST | `/api/tasks/:id/nudge/dismiss` | → `{ task }` | Clears own nudge badge |
| POST | `/api/tasks/:id/subtasks/:subtaskId/start\|submit\|rework` | → `{ task }` | Subtask assignee or parent-task assignee |
| POST | `/api/tasks/:id/subtasks/:subtaskId/approve` | → `{ task }` | Creator/admin; auto-completes parent if all subtasks done |
| POST | `/api/tasks/:id/subtasks/:subtaskId/reject` | Req: `reason` → `{ task }` | Creator or admin only |
| POST | `/api/tasks/bulk/start\|rework\|archive` | Req: `ids[]` → `{ updated }` | Scoped to the caller's own eligible tasks |

**TOR** (`/api/tor`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/tor/` | → `{ requests[] }` | Auth required |
| POST | `/api/tor/` | Req: `project, code, dept, amount, openedDate` → 201 `{ request }` | Starts at `pending_chief_approval`, step 0 |
| PATCH | `/api/tor/:id/review` | Req: `action: "advance"\|"reject", comment?` → `{ request }` | Admin only; `reject` requires `comment` |

**Conversations / Chat** (`/api/conversations`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/conversations/` | → `{ conversations[] }` | Team channels + DMs, with unread counts |
| GET | `/api/conversations/:id/messages` | → `{ messages[], otherReadAt }` | Access-checked |
| POST | `/api/conversations/:id/read` | → 204 | Marks conversation read |
| POST | `/api/conversations/:id/messages` | Req: `text` → 201 `{ message }` | Access-checked |
| POST | `/api/conversations/dm/:userId` | → `{ conversationId }` | Get-or-create DM |

**Notifications** (`/api/notifications`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/notifications/` | → `{ notifications[] }` | Latest 50 |
| PATCH | `/api/notifications/:id/read` | → 204 | |
| POST | `/api/notifications/read-all` | → 204 | |
| DELETE | `/api/notifications/` | → 204 | Deletes all own notifications |

**Dashboard** (`/api/dashboard`)

| Method | Endpoint | Request / Response | Remark |
|---|---|---|---|
| GET | `/api/dashboard/` | → `{ stats, priorityDistribution, completionTrend, dueSoon, recentActivity, upcomingForMe }` | Always scoped to the logged-in user, even for admins |

---

## 3. Data Model / Database Schema

**Database**: PostgreSQL (hosted on Neon — managed/serverless Postgres). **ORM**: Prisma
(`prisma-client-js`). Schema source of truth: `backend/prisma/schema.prisma`. Two connection
strings are used: `DATABASE_URL` (pooled, used at runtime) and `DIRECT_URL` (direct, used by
`prisma migrate`).

**Enums**

| Enum | Values |
|---|---|
| `Level` | `low`, `medium`, `high` |
| `TaskStatus` | `todo`, `in_progress`, `submitted`, `rejected`, `completed` |
| `TaskLogAction` | `created`, `started`, `submitted`, `cancelled`, `rejected`, `approved`, `reworked`, `archived`, `commented` |
| `ConversationKind` | `team`, `dm` |
| `NotificationType` | `assigned`, `rejected`, `approved`, `comment`, `nudged` |
| `TorStatus` | `pending_chief_approval`, `tor`, `bidding`, `pta`, `pr`, `po`, `completed` |

### 3.1 Table / Field List

| Table Name | Field Name | Data Type | Remark |
|---|---|---|---|
| Team (`TL_Team`) | id | String (cuid) | PK |
| | name | String | Unique |
| | createdAt | DateTime | Default now() |
| User | id | String (cuid) | PK |
| | name | String | |
| | email | String | Unique |
| | username | String? | Unique, optional |
| | passwordHash | String | bcrypt hash |
| | title | String? | Job title, optional |
| | isAdmin | Boolean | Default false — sole authorization flag (no role enum) |
| | teamId | String? | FK → Team, optional (unassigned users allowed) |
| | createdAt | DateTime | Default now() |
| Task (`TL_Task`) | id | String (cuid) | PK |
| | title | String | |
| | description | String? (Text) | |
| | priority | Level | enum |
| | impact | Level | enum |
| | status | TaskStatus | Default `todo` |
| | archived | Boolean | Default false — only settable once status=`completed` |
| | late | Boolean? | null=not yet actioned, false=on time, true=late |
| | teamId | String | FK → Team |
| | createdById | String | FK → User |
| | dueDate | DateTime | |
| | createdDate | DateTime | Default now() |
| | submittedDate | DateTime? | |
| | reviewDate | DateTime? | |
| | rejectReason | String? | |
| | createdAt / updatedAt | DateTime | updatedAt auto-managed |
| | *(indexes)* | | `@@index([teamId])`, `@@index([status])`, `@@index([dueDate])` |
| TaskAssignee (`TL_TaskAssignee`) | taskId, userId | String, String | Composite PK; join table (Task ↔ User) |
| | nudgedAt | DateTime? | Set when owner nudges; cleared per-assignee on dismiss |
| Subtask (`TL_Subtask`) | id | String (cuid) | PK |
| | title | String | |
| | description | String? (Text) | |
| | status | TaskStatus | Default `todo` |
| | late | Boolean? | Same semantics as Task.late |
| | taskId | String | FK → Task (cascade delete) |
| | assigneeId | String? | FK → User, optional |
| | dueDate | DateTime? | Falls back to parent Task.dueDate when null |
| | submittedDate / reviewDate / rejectReason | DateTime? / DateTime? / String? | |
| TaskLogEntry (`TL_TaskLogEntry`) | id | String (cuid) | PK |
| | ts | DateTime | Default now() |
| | action | TaskLogAction | enum |
| | note | String? | |
| | taskId | String | FK → Task (cascade delete); indexed |
| | subtaskId | String? | FK → Subtask (cascade delete), optional; indexed |
| | byId | String | FK → User (actor) |
| Attachment (`TL_Attachment`) | id | String (cuid) | PK |
| | name | String | Original filename |
| | key | String | Disk storage key, format `tasks/<taskId>/<uuid>-<name>` (schema comment still says "R2 key" — stale, see Section 1.3) |
| | uploadedAt | DateTime | Default now() |
| | taskId | String | FK → Task (cascade delete) |
| | uploadedById | String | FK → User |
| StarredTask (`TL_StarredTask`) | userId, taskId | String, String | Composite PK; join table |
| | starredAt | DateTime | Default now() |
| TorRequest (`TL_TorRequest`) | id | String (cuid) | PK |
| | project | String | |
| | code | String | Unique |
| | dept | String | |
| | amount | Decimal(14,2) | |
| | openedDate | DateTime | |
| | status | TorStatus | enum |
| | step | Int | 0–6, maps to `TorStatus` progression |
| | comment | String? | Required when rejecting |
| | rejected | Boolean | Default false; reflects the *most recent* review only |
| | requesterId | String | FK → User |
| | reviewerId | String? | FK → User, optional |
| | createdAt / updatedAt | DateTime | |
| Conversation (`TL_Conversation`) | id | String (cuid) | PK |
| | kind | ConversationKind | `team` or `dm` |
| | teamId | String? | Unique, optional — one conversation per team |
| | dmUserAId / dmUserBId | String? / String? | Optional; A always the lexicographically smaller user id; `@@unique([dmUserAId, dmUserBId])` |
| ConversationRead (`TL_ConversationRead`) | conversationId, userId | String, String | Composite PK |
| | lastReadAt | DateTime | Default now() |
| Message (`TL_Message`) | id | String (cuid) | PK |
| | text | String (Text) | |
| | ts | DateTime | Default now() |
| | conversationId | String | FK → Conversation (cascade delete); indexed |
| | fromId | String | FK → User |
| Notification (`TL_Notification`) | id | String (cuid) | PK |
| | type | NotificationType | enum |
| | text | String | |
| | ts | DateTime | Default now() |
| | read | Boolean | Default false |
| | userId | String | FK → User (cascade delete); indexed |

*(Full relation list — e.g. `User.assignedTasks`, `User.createdTasks`, `Team.conversation` — is
in `backend/prisma/schema.prisma`; omitted above for brevity since they mirror the FKs listed.)*

**Computed values worth noting (not stored columns):**
- `Task.score` / `Subtask.score` — 0–10, 2 decimals, computed on read (see formula in Section 1's
  business-rules note and `backend/src/utils/serializeTask.ts::computeScore`). Not a DB column.
- `Task.overdue` — computed on read from `status` + `dueDate`, not stored.

---

## 4. Test Case / Acceptance Criteria

No automated test suite exists in the repository at handover time. The table below is a manual
UAT checklist the HRIS team can run before/after taking ownership; **Status** is left blank for
the reviewer to fill in.

| No. | Test Scenario | Expected Result | Status (Pass/Fail) | Remark |
|---|---|---|---|---|
| 1 | Log in with a valid email/username + password | Redirected to Dashboard; token stored; `GET /auth/me` succeeds | | |
| 2 | Log in with wrong password | 401 error shown, no token stored | | |
| 3 | Create a task with one assignee, no subtasks | Task created with status `todo`; visible to assignee and creator | | |
| 4 | Try to create a task with no assignee and no subtask assignee | Request rejected (validation error) | | |
| 5 | Assignee starts, then submits a task | Status moves `todo → in_progress → submitted`; `submittedDate` set | | |
| 6 | Creator approves a submitted task before the due date | Status → `completed`; `late = false`; score computed | | |
| 7 | Creator approves a submitted task after the due date | Status → `completed`; `late = true` | | |
| 8 | Creator rejects a submitted task with a reason | Status → `rejected`; `late = true`; reason stored and visible | | |
| 9 | Assignee reworks a rejected task | Status → `in_progress`; `submittedDate`/`reviewDate`/`late` cleared | | |
| 10 | Owner archives a completed task | `archived = true`; status remains `completed`; task no longer counted in the default (non-archived) task list | | |
| 11 | Attempt to archive a task that is not `completed` | Request rejected | | |
| 12 | Create a task with subtasks, complete all subtasks | Parent task auto-transitions to `completed` | | |
| 13 | Upload an attachment to a task, then download it | File stored on disk under `UPLOADS_DIR`; download streams the correct file to an authorized viewer | | |
| 14 | A user who is not an assignee/creator/team member tries to open a task | Access denied / task not returned in list | | |
| 15 | Non-admin navigates directly to `/admin/users` URL | Redirected to `/dashboard` (admin-only layout guard) | | |
| 16 | Admin creates a team, assigns members, then deletes the team | Team and its assignments removed cleanly | | |
| 17 | Open Team Performance → click a member name | Member drill-down shows All Task / Completed / Late / On-time cards, In Progress tab (all non-completed tasks, no status badges), Completed tab (completed + archived tasks) | | |
| 18 | On the member drill-down Completed tab, log in as a non-admin viewing a teammate | Score and rejection-count columns and charts are **not** shown | | |
| 19 | Same as above, logged in as admin | Score badge, rejection count, Completion-rate chart, and Average-score chart are shown | | |
| 20 | Send a message in a team channel and in a DM | Message appears for both participants; unread badge increments for the recipient | | |
| 21 | Nudge a task's assignee | Notification created for the assignee; email sent if SMTP is configured, silently skipped otherwise | | |
| 22 | Create a TOR request, then admin advances it through all 6 steps | Status/step progress in order to `completed` | | |
| 23 | Admin rejects a TOR request without a comment | Request rejected (comment required) | | |
| 24 | Log out | Token cleared client-side; server cookie cleared; redirected to `/login` | | |

---

## 5. Version Control

| Version | Date | Author(s) | Revision Notes |
|---|---|---|---|
| 1.0 | 2026-07-31 | Teetuch Chansenah (GCP Intern) | Initial technical specification, written for handover of BJC Trackline to the HRIS team. |

---

## 6. Environment

**Server App IP:**
`________________________________` *(TBD — to be assigned once the HRIS team selects a hosting
target for the backend; runs on Node.js, listens on `PORT` — default `4000`)*

**Server Database IP:**
`________________________________` *(Not a fixed self-hosted IP — the database is PostgreSQL
hosted on Neon (https://neon.tech), a managed/serverless provider accessed via connection string,
not a static IP. See `DATABASE_URL` / `DIRECT_URL` below.)*

**Database Name:**
`________________________________` *(Set per the Neon project created for this app; confirm the
current production project name with the outgoing dev team before cutover.)*

**Configuration reference** — environment variables required by each service:

*Backend (`backend/.env`, see `backend/.env.example`):*

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled) — used by the app at runtime |
| `DIRECT_URL` | Neon direct (unpooled) connection string — used by `prisma migrate` |
| `JWT_SECRET` | Secret used to sign JWTs — must be a long random string in production |
| `JWT_EXPIRES_IN` | JWT expiry, default `7d` |
| `PORT` | Backend HTTP port, default `4000` |
| `CORS_ORIGIN` | Allowed CORS origin — set to the deployed frontend's URL |
| `FRONTEND_URL` | Base URL of the deployed frontend — used to build links in nudge emails |
| `SEED_TODAY` | "Today" anchor for seeding demo data — leave unset in production |
| `UPLOADS_DIR` | Disk path for task attachments — **must** be a persistent volume outside the deploy directory in production |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional SMTP config for nudge-reminder emails; email sending is skipped (with a console warning) if unset |

*Frontend (`frontend/.env.local`, see `frontend/.env.example`):*

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the frontend calls for the backend API, default `http://localhost:4000/api` |

**Local development quick-start** (see `README.md`, `backend/README.md` for full detail):

```bash
# Backend — http://localhost:4000
cd backend && cp .env.example .env    # fill in DATABASE_URL / DIRECT_URL / JWT_SECRET
npm install && npm run prisma:migrate && npm run seed && npm run dev

# Frontend — http://localhost:3000
cd frontend && cp .env.example .env.local
npm install && npm run dev
```

Seeded demo accounts (password `Password123!` for all): Admin — `sarah.chen@bjctrackline.test`;
Non-admin — `priya.patel@bjctrackline.test`.

---

## 7. Object List

| Object Type | Object Name | Remark |
|---|---|---|
| Constant | `Level`, `TaskStatus`, `TaskLogAction`, `ConversationKind`, `NotificationType`, `TorStatus` | Prisma enums, `backend/prisma/schema.prisma` |
| Session | JWT Bearer token, key `bjc_token` in browser `localStorage` | 7-day default expiry (`JWT_EXPIRES_IN`); secondary httpOnly cookie also accepted by the backend but unused by the frontend |
| Control | Shared UI primitives — `Toast`, confirm dialogs (`DeleteTaskConfirmDialog`, `NudgeConfirmDialog`), `TaskDrawer`, `CreateTaskDialog` | `frontend/src/components/ui/`, `frontend/src/components/tasks/`, `frontend/src/components/teams/` |
| Component | `Sidebar`, `Topbar`, `TaskRowCard`, `TaskListWithPagination`, `TeamDetail`, `CompletionChart`, `CompletionRateChart`, `AvgScoreChart` | `frontend/src/components/` |
| Fields | Full field list per table — see Section 3.1 | Key computed fields: `score`, `overdue`, `viewerStatus`/`viewerDueDate` (per-viewer context) |
| Report | Dashboard (role-scoped stats/trends), Team Performance (top-3, completion trend), Member drill-down (Completion-rate & Average-score charts, admin only) | `frontend/src/app/(app)/dashboard`, `.../teams`, `.../admin/teams` |
| Menus | Dashboard, Starred, Current Tasks, Pending Review, Teams, Calendar, Chat, History, TOR Request, How to use; Admin: All Teams, Manage Users, User Accounts | `frontend/src/components/layout/Sidebar.tsx` |
| Pages | See full route map in Section 8 | `frontend/src/app/` (Next.js App Router) |
| API | 8 route groups, ~50 endpoints | See Section 2.3; `backend/src/routes/` |
| File | Task attachments — local disk under `UPLOADS_DIR`, key format `tasks/<taskId>/<uuid>-<filename>` | `backend/src/utils/fileStorage.ts` |
| Queries | Team performance aggregation (per-member stats + 8-week trend), Dashboard 8-week completion/score trend, Task list filter query (status/priority/team/date/text) | `backend/src/routes/teams.ts`, `backend/src/routes/dashboard.ts`, `backend/src/routes/tasks.ts` |
| Function | `computeScore`, `rejectionCount`, `getViewerContext`, `isOverdue`, `serializeTask`, `canViewTask` | `backend/src/utils/serializeTask.ts`, `backend/src/routes/tasks.ts` |
| SQL Database | PostgreSQL (Neon) — 14 tables: `Team`, `User`, `Task`, `TaskAssignee`, `Subtask`, `TaskLogEntry`, `Attachment`, `StarredTask`, `TorRequest`, `Conversation`, `ConversationRead`, `Message`, `Notification` (13 listed; `_prisma_migrations` is Prisma's own bookkeeping table, 14th) | Managed via Prisma Migrate, `backend/prisma/` |

---

## 8. Structure and Content

**Folder:**
```
BJCTrackline/
├─ backend/                     — Express + TypeScript REST API
│  ├─ src/
│  │  ├─ app.ts, index.ts       — app assembly / entrypoint
│  │  ├─ db.ts, env.ts          — Prisma client singleton, typed env loader
│  │  ├─ middleware/            — requireAuth, requireAdmin, error handler
│  │  ├─ routes/                — auth, users, teams, tasks, tor, chat, notifications, dashboard
│  │  ├─ types/                 — Express Request augmentation
│  │  └─ utils/                 — asyncHandler, fileStorage, jwt, mailer, serializeTask
│  └─ prisma/                   — schema.prisma, migrations/, seed.ts
├─ frontend/                    — Next.js 16 (App Router) client
│  └─ src/
│     ├─ app/                   — pages (see route map below)
│     ├─ components/            — layout/, dashboard/, tasks/, teams/, ui/
│     └─ lib/                   — api.ts, auth-context.tsx, token.ts, types.ts, format.ts, hooks
├─ uploads/                     — local task-attachment storage (backend runtime, not committed)
├─ Job Tracking System Design/  — original HTML/JS prototype (reference only)
├─ bjc-trackline-overview.md    — original prototype design/handoff notes
└─ README.md                    — root run-instructions
```

**URL Information**

**API:**
`________________________________` *(production base URL — TBD; local dev default is
`http://localhost:4000/api`, set via `NEXT_PUBLIC_API_URL`)*

**Domain:**
`________________________________` *(production domain — not yet assigned at handover time)*

**Script File:**
- `backend/prisma/seed.ts` — resets and reloads demo teams/users/tasks/TOR/chat data (`npm run seed`)
- `backend/prisma/migrations/` — versioned SQL migrations, applied via `npm run prisma:migrate`
  (dev) or `npm run prisma:deploy` (CI/production)
- Full npm script reference: see `backend/README.md` and `frontend/package.json`

**Full frontend route map** (Next.js App Router, `frontend/src/app/`):

| Path | Access | Notes |
|---|---|---|
| `/login` | Public | |
| `/dashboard` | Authenticated | Role-scoped stats |
| `/starred`, `/current-tasks`, `/pending-review`, `/history` | Authenticated | Personal task views |
| `/tasks` | Authenticated | Full filterable task list |
| `/teams`, `/teams/:teamId` | Authenticated | "My Team" + Team Performance + member drill-down |
| `/calendar` | Authenticated | Monthly due-date grid |
| `/chat` | Authenticated | Team channels + DMs |
| `/tor` | Authenticated | TOR request workflow |
| `/how-to` | Authenticated | Help/FAQ |
| `/admin/teams`, `/admin/teams/:teamId` | Admin only (layout guard + sidebar) | All-teams view + drill-down |
| `/admin/users` | Admin only (layout guard + sidebar) | Manage Users |
| `/admin/accounts` | Admin only (layout guard + sidebar) | User Accounts |

---

## 9. Review & Approval

**Reviewed By**

| Role | Name |
|---|---|
| | |
| | |

**Approved By**

Have reviewed and accepted the terms and conditions

| **Developer** | **HRIS Dev Acknowledge** | **HRIS Manager** | **Head Of HRIS** |
|---|---|---|---|
| Sign: (____________) | Sign: (____________) | Sign: (____________) | Sign: (____________) |
| Date: | Date: | Date: | Date: |
