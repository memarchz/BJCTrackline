# BJC Trackline — System Overview (Handoff)

A job/task-tracking prototype built as **Design Components** (`.dc.html`) on the Industry design system. Two roles — **Admin** and **User** — switch live via the "Viewing as" toggle in the top bar (`viewingAs` = `u1` admin / `u3` user). Theme is a fintech deep-navy on cool paper ground; fonts IBM Plex Sans/Mono.

## Architecture

- **`Job Tracker.dc.html`** — the shell and single source of truth. Holds all state (teams, users, tasks, notifications, chat, TOR reviews, stars, drill-downs) in one `Component` logic class, does all data enrichment in `renderVals()`, and mounts each screen via `<dc-import>`. Every child view is presentational and driven purely by props passed from here.
- **`data.js`** — mock data + builders. Exports `TEAMS`, `USERS`, `buildTasks()`, `TOR_REQUESTS`, `CONVERSATIONS`, `MESSAGES`, `buildNotifications()`. "Today" is pinned to **2026-07-24**. Tasks are generated per team (4 teams × 12) plus guaranteed personal tasks for demo user `u3` and admin `u1`, submitted-for-review items, and tasks `u3` assigned to teammates.
- **`support.js`** — DC runtime (do not edit).
- **`Login.dc.html`** — standalone entry page (cursor-follow spotlight, typewriter headline on logo hover). Logout redirects here; login enters `Job Tracker.dc.html`.

### Task model (key fields)
`id, title, priority(high/med/low), impact, status, team, assignees[], createdBy, reviewer, dueDate, createdDate, late(true/false/null), attachments[], subtasks[], log[]`.
**Statuses:** `todo → in_progress → submitted → (rejected | completed)`. `late` is true/false/null(not yet actioned); `overdue` is computed for todo/in_progress past due date.

## Navigation (sidebar)

**Menu:** Dashboard, Starred, Current Tasks, Pending Review, Teams, Calendar, Chat, History, TOR Request.
**Admin (admin only):** All Teams, Manage Users, User Accounts.
**Support:** How to use.
Sidebar scrolls with a translucent scrollbar; count badges on Starred / Current / Pending Review. Top bar has screen title+subtitle, search, role toggle, notifications bell (with unread badge + dropdown), and logout.

## Pages / views

### Dashboard — `DashboardView.dc.html`
Landing overview. Stat cards (admin: Total / In Progress / Due Soon / Late-Overdue; user: My Open / Due Soon / Awaiting Review / Completed-Jul), completion-trend line chart, priority distribution, per-team "late" bars, **Due soon** list, **Recent activity** feed, and **Upcoming for me**. Stats scope to the whole org for admin, to the user's own tasks otherwise.

### Starred — `CurrentTasksView.dc.html` (plain mode)
Tasks the user pinned via the star on any task row. Shows a status-colored left strip per card. Empty state prompts starring.

### Current Tasks — `CurrentTasksView.dc.html`
The user's actionable work in two bands: **New Tasks** (todo, with a "Mark all as started" band action) and **In Progress**. Band actions use centered icon buttons with tooltips.

### Pending Review — `CurrentTasksView.dc.html`
Three bands: **Submitted** (awaiting approval), **Rejected** (with "Move all to In Progress"), **Completed** (with "Archive all").

### History — `CurrentTasksView.dc.html` (plain mode)
The user's completed tasks with their full log; read-only.

### Tasks — `TasksView.dc.html`
Full filterable task list (admin-oriented). Filters: status tabs, team dropdown, priority dropdown; users get a My/Team scope toggle. Rows show priority/impact meters, assignees, due date, star, expand.

### Teams — `TeamsView.dc.html`
User view of **their own** team. Two tabs: **My Team** (review queue of tasks awaiting the user's review + tasks the user assigned to teammates, with create-task) and **Team Performance** (stats, top-3 podium, completion-trend chart, member table). Clicking a member name drills into that member's detail (on-time rate, stat cards, assigned tasks).
> **Open bug (todo #16):** clicking a status card in Team Performance should open a modal listing that team's tasks filtered to that status — currently not opening. Debug notes recorded.

### Calendar — `Calendar.dc.html`
Month grid of the user's tasks/deadlines by due date.

### Chat — `ChatView.dc.html`
Team channels (one per team) + DMs. Conversation list with last-message preview; message thread; composer wired to `sendMessage`.

### History / TOR / How-to
- **TOR Request — `TORView.dc.html`**: Terms-of-Reference procurement requests. 4 status cards (Pending Chief Approval, TOR, PTA, Completed) and a 6-stage lifecycle stepper (TOR → Bidding → PTA → PR → PO → Completed). Admin can approve/reject with a comment (`reviewTOR`).
- **How to use — `HowToView.dc.html`**: guide + FAQ, under the Support section.

### Admin-only

- **All Teams — `TeamsView.dc.html`** (`is-user=false`, `with-perf=true`): same component as Teams but scoped to any team the admin drills into, from a team-list overview. Overview + Team Performance tabs; per-row edit/delete task actions (icon buttons with hover animations) open the create/delete dialogs.
- **Manage Users — `UsersManageView.dc.html`**: add teams, add/remove/assign members, delete users. Shows unassigned users with a team picker.
- **User Accounts — `AccountsView.dc.html`**: create accounts, set/edit passwords, and set/edit email addresses inline; shows team + admin status per user.

## Dialogs / overlays (in the shell)
- **`CreateTaskDialog.dc.html`** — create OR edit a task (title, description, team → filters assignees, priority/impact, due date, subtasks with per-subtask assignees, attachments). Opening from a team context pre-assigns that team. New tasks open the detail drawer first.
- **`TaskDrawer.dc.html`** — right-side task detail: attachments upload, start / submit-for-review, reviewer approve/reject (with reason), rework, archive, full activity log.
- Confirmation modals: delete task, logout. Toasts: task submitted, follow-up reminder sent.

## Interactions & motion
Staggered card entrances, nav icon spring + slide-on-hover, button press feedback, bell shake, input focus transitions, view fade-in. All guarded by `prefers-reduced-motion`.

## Conventions for editing
- Change state/data logic in **`Job Tracker.dc.html`**'s logic class; child views only render props.
- Prefer `dc_html_str_replace` / `dc_js_str_replace` for targeted edits.
- Styling is **inline** (design-system CSS + a `<helmet><style>` block for resets/keyframes/badges). No new stylesheets.
- Dates/data are mock; "today" = 2026-07-24. Keep new sample data consistent with that anchor.