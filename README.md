# QuizForge — Enterprise Quiz Workspace

A complete React + TypeScript quiz application with a working Express backend, a persistent SQLite database, and a standalone browser demo that deploys to Vercel without a backend.

**Start here:** use Node.js **24 LTS**. The repository root is the folder containing `package.json` and `vercel.json`.

## Choose how to run it

| Mode               | Command                            | What you get                                                                   |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| Frontend demo      | `npm ci` then `npm run dev`        | All demo screens and interactions, with browser persistence; no API required   |
| Full stack locally | `npm ci` then `npm run dev:full`   | React frontend, Express API, SQLite database, real accounts and server scoring |
| Windows demo       | Double-click `START-DEMO.bat`      | Installs dependencies if needed and starts the demo                            |
| Windows full stack | Double-click `START-FULLSTACK.bat` | Installs dependencies if needed and starts both applications                   |
| Docker locally     | `docker compose up --build`        | Frontend and API together at `http://localhost:4000`                           |

The normal Vite frontend URL is `http://localhost:5173`. If it is occupied, use the URL Vite prints. Full-stack API defaults to port 4000. For connected development, keep port 5173 available or add the actual frontend origin to `ALLOWED_ORIGINS`.

Initial dependency installation needs internet. Once served, the demo does not need an API. This is not a service-worker-based offline installation: the browser still needs access to the frontend hosting to load the page.

## Deploy the frontend to Vercel — no backend needed

1. Extract this ZIP and upload the **contents of `quizforge-enterprise`** to a GitHub repository.
2. Import that repository into Vercel.
3. Select the repository root containing `package.json`.
4. Use framework **Vite**, build command **`npm run build`**, output directory **`dist`**, install command **`npm ci`**, and Node **24.x**.
5. Do **not** add backend environment variables for the demo. `VITE_APP_MODE` defaults to `demo`.
6. Deploy. The included `vercel.json` provides SPA rewrites so `/explore`, `/results`, and other direct links work after refresh.

Every visitor gets an independent browser demo. Creating quizzes, completing attempts, switching roles, viewing reports, and changing demo settings work without a backend. Demo data is not shared across browsers or devices.

If you previously set `VITE_APP_MODE=api`, remove it or set it to `demo`, then redeploy. Vite environment variables are embedded at build time.

**Do not deploy the SQLite backend as a Vercel Function.** This project’s backend uses a persistent local database and a long-running Node process. Vercel hosts the demo frontend; run the API locally or on a persistent server. See [deployment instructions](docs/DEPLOYMENT.md) for connected hosting.

## Full-stack local setup

```bash
npm ci
npm run dev:full
```

The development launcher starts the frontend in API mode and enables three **local development accounts**. It creates the database and six quizzes on first run. Real backend attempts begin empty; the backend never pretends sample attempts were taken by real users.

| Role          | Email                        | Local development password |
| ------------- | ---------------------------- | -------------------------- |
| Administrator | `admin@quizforge.local`      | `QuizForge!2026`           |
| Instructor    | `instructor@quizforge.local` | `QuizForge!2026`           |
| Learner       | `learner@quizforge.local`    | `QuizForge!2026`           |

These accounts are for local testing only. The backend refuses `ENABLE_DEMO_ACCOUNTS=true` when `NODE_ENV=production`.

For custom configuration, copy `.env.example` to `.env`. On Windows Command Prompt:

```bat
copy .env.example .env
```

For separate terminals:

```bash
# Terminal 1, after copying .env.example to .env:
npm run server:dev

# Terminal 2: set VITE_APP_MODE=api in .env first:
npm run dev
```

The frontend uses `/api` through Vite’s development proxy. No database client, Python, C++ build tools, or native SQLite npm package is needed. Node 24 supplies `node:sqlite`.

## Included workflows

### Learners

- Personalized overview with recent activity, scores, weekly progress, and recommended quizzes.
- Search, category and difficulty filters, and catalog sorting.
- Instructions, attempt limits, timed assessment player, question navigation, and review flags.
- Single-choice and multiple-answer questions with weighted points.
- Automatic answer saving, save status, safe retries, and resume after refresh.
- Submission confirmation showing unanswered and flagged questions.
- Scores, explanations, answer review filters, CSV export, and printable results.
- Best-score leaderboard that avoids multiplying points through repeated attempts.
- Profile editing and password changes in connected mode.

### Instructors

- Create, edit, publish, duplicate, and archive their own quizzes.
- Visual question editor with option validation, correct-answer selection, points, explanations, and reordering.
- Time limit, passing score, attempt cap, and randomized question order.
- Reuse questions through the question bank.
- JSON import/export; working example in `docs/quiz-import-example.json`.
- Performance analytics and CSV reports for their own assessments.

### Administrators

- Manage all quizzes and assessment reports.
- Create users; change roles; activate or deactivate accounts.
- Update workspace name and self-registration policy.
- Read the latest 200 audit events.

### Backend protections

- Server-enforced roles and ownership checks.
- Scrypt password hashes, opaque cookie sessions, CSRF tokens, and restricted origins.
- Login/API rate limits, security headers, request IDs, input limits, and safe errors.
- Bound SQL parameters, schema migrations, foreign keys, and a unique active-attempt constraint.
- Server-side grading and deadlines. Client-supplied scores are never trusted.
- Immutable attempt snapshots, so later quiz edits do not alter earlier attempts.
- Optimistic version checks prevent silent overwrites from stale tabs.
- Idempotent submissions. Completed attempts cannot be changed.
- Password and access changes revoke other sessions.
- Consistent database backup command.

## Scoring and deadlines

Each question earns its configured points only when the selected options exactly match its correct options. Multiple-answer questions have no partial credit. An unanswered or incorrect question earns zero; there is no negative marking.

`score = round(100 × earned points ÷ total points)`

The rounded percentage is compared with the quiz’s passing score. The timer continues after leaving or closing the page. After the deadline, only previously saved answers are graded. Expired attempts finalize when accessed through attempts, reports, leaderboard, or when starting another attempt. There is no background scheduler; no user request is needed to stop the deadline from being enforced.

Leaderboard points are `10 × the best percentage score on each quiz`, summed across unique quizzes. Staff can preview/take quizzes, but only active learner accounts are ranked.

## Commands

| Command                | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Frontend with the selected mode; defaults to demo           |
| `npm run dev:full`     | Full local development with seeded accounts                 |
| `npm run server:dev`   | API in watch mode, reading `.env`                           |
| `npm run build`        | Type-check and build the frontend into `dist/`              |
| `npm run build:server` | Compile the API into `dist-server/`                         |
| `npm run build:all`    | Build both applications                                     |
| `npm start`            | Run the compiled API and serve an existing `dist/`          |
| `npm run preview`      | Preview the frontend production build                       |
| `npm test`             | Run API, domain, and demo-adapter tests                     |
| `npm run check`        | Build both applications and run the tests                   |
| `npm run admin:create` | Create the first admin from bootstrap environment variables |
| `npm run db:backup`    | Save a consistent SQLite backup under `backups/`            |

`npm start` serves whatever frontend was last built. For a connected single-origin deployment, set `VITE_APP_MODE=api` and `VITE_API_URL=/api` **before** building. A normal default build intentionally remains a demo.

## Project layout

```text
src/                  React application, pages, responsive styles
  lib/service.ts      HTTP adapter and mode selection
  lib/demo.ts         Browser demo implementation
  pages/Player.tsx    Timed player and serialized autosave
shared/               Domain schemas, scoring rules, starter content
server/               Express API, SQLite store, security, backup/admin tools
  tests/              Integration and frontend-adapter tests
scripts/              Development launcher
docs/                 Deployment, security, API, verification, import example
public/               Local favicon asset
vercel.json           Frontend deployment and SPA routing
Dockerfile            Connected full-stack container
compose.yaml          Local Docker setup with persistent volumes
START-*.bat           Windows launchers
```

## Scope and operational limits

This is a working **single-workspace enterprise-style application**, with real authorization, persistence, and assessment flows. It is not a claim of enterprise certification, independent security auditing, or unlimited scale.

SSO/SAML, MFA, email verification/password recovery, email invitations, tenant isolation, scheduled exams, proctoring, payments, file uploads, and external LMS integrations are not included. The question bank is derived from quizzes, not a separately versioned question repository. All published quizzes are open to signed-in users; there is no cohort assignment system.

SQLite and in-process rate limits target a single application instance. Several collection endpoints read the workspace dataset into memory, and responses are not paginated. For large institutions, add a PostgreSQL repository, pagination, shared rate limiting/session infrastructure, monitoring, load tests, and independent security review. Browser demo storage is neither confidential nor tamper-resistant and must not be used for high-stakes exams.

See [SECURITY.md](docs/SECURITY.md), [API.md](docs/API.md), and [VERIFICATION.md](docs/VERIFICATION.md).

## Troubleshooting

- **`vite` or `tsx` not found:** run `npm ci` in the folder containing `package.json`.
- **`node:sqlite` unavailable:** install Node 24 LTS, reopen the terminal, then check `node -v`.
- **Vercel blank screen / API error:** use the root folder, `npm run build`, `dist`, and `VITE_APP_MODE=demo` or no mode variable.
- **Refresh gives a 404:** ensure `vercel.json` is in the project root and redeploy.
- **Local API cannot be reached:** start `npm run dev:full`; check port 4000 and `/api/health`.
- **Origin rejected:** add the exact browser origin to `ALLOWED_ORIGINS` and restart the API.
- **Login works but immediately signs out:** check cookie settings, HTTPS, and whether third-party cookies are blocked. Prefer a same-origin API proxy.
- **Stale attempt/quiz conflict:** another tab saved a newer revision. Reload the saved version before continuing.
- **Demo storage full/corrupt:** reset the demo in Settings or clear this site’s storage. Do not store valuable work only in demo mode; export quiz JSON/CSV.
- **Windows platform-specific package error after copying dependencies:** delete only `node_modules`, keep `package-lock.json`, and run `npm ci` on Windows. The ZIP deliberately excludes `node_modules`.

## References

- [Vite deployment guide](https://vite.dev/guide/static-deploy)
- [Vite on Vercel and SPA rewrites](https://vercel.com/docs/frameworks/frontend/vite)
- [Node 24 SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

Prepared for Shivam Singh. Starter content and implementation are included for modification; third-party packages retain their own licenses.
