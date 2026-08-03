# BJC Trackline — Frontend

Next.js 16 + TypeScript web client interface.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Testing

Playwright is configured to run end-to-end (E2E) UI testing. 

### Running E2E tests

1. Ensure the Next.js dev server is running on `http://localhost:3000` (or the backend on `http://localhost:4000`).
2. Execute Playwright tests:
   ```bash
   npm run test:e2e
   ```

Tests cover 12 comprehensive user journeys:
- **Authentication**: Form checks and secure dashboard entry redirection.
- **Pages & Data Fetching**: Dashboard statistics, Starred Tasks, Current Tasks (New Tasks / In Progress), Pending Review, Teams Performance, History archives, TOR procurement Request forms, Chat interface, static guide instructions, and Calendar note saving with local storage.
- **Admin Access Control**: Access authorization checks for `/admin/teams`, `/admin/users`, and `/admin/accounts`.
- **Full-scale Task Workflow**: Simulation of task creation, starting it, submitting, approving, and archiving in the list.

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — build Next.js for production
- `npm run start` — start production Next.js server
- `npm run lint` — check for code quality and lints
- `npm run test:e2e` — execute E2E browser tests using Playwright
