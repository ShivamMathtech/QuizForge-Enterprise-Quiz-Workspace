# Deployment and operations

## 1. Vercel frontend demo

The default build needs no environment variables, database, or backend. Vercel settings:

| Setting        | Value                               |
| -------------- | ----------------------------------- |
| Root directory | Folder containing `package.json`    |
| Framework      | Vite                                |
| Node           | 24.x                                |
| Install        | `npm ci`                            |
| Build          | `npm run build`                     |
| Output         | `dist`                              |
| Mode           | Omit `VITE_APP_MODE`, or set `demo` |

The bundled `vercel.json` handles deep links. Vercel deploys only the frontend output. No real passwords, backend data, or secrets belong in `VITE_*` variables.

## 2. Local full stack

`npm run dev:full` uses `/api` through the Vite proxy and starts both processes. It intentionally enables development accounts. Close it with Ctrl+C. Data persists in `data/quizforge.sqlite`.

For Docker:

```bash
docker compose up --build
```

Open `http://localhost:4000`. The container builds the frontend in connected mode. The default compose file binds to loopback, enables development accounts, and retains SQLite in a named volume. It is a local development configuration, not a public production configuration.

## 3. Connected production on one origin

Use a persistent Linux/Windows server or container host. The API must keep its data volume between restarts. Use a reverse proxy with HTTPS; proxy the complete app and API to port 4000.

Configure build-time variables:

```dotenv
VITE_APP_MODE=api
VITE_API_URL=/api
```

Configure runtime variables:

```dotenv
NODE_ENV=production
PORT=4000
DATABASE_PATH=/absolute/persistent/path/quizforge.sqlite
ALLOWED_ORIGINS=https://quiz.your-domain.example
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
ENABLE_DEMO_ACCOUNTS=false
ALLOW_REGISTRATION=false
TRUST_PROXY=1
```

Set `TRUST_PROXY` to the exact number of trusted reverse-proxy hops; use `0` when directly exposed. Restrict direct API access so clients cannot bypass your proxy assumptions. The database path must be writable by the service user.

Create an admin with a unique password (minimum 12 characters):

```dotenv
BOOTSTRAP_ADMIN_EMAIL=your-admin-email@example.com
BOOTSTRAP_ADMIN_PASSWORD=your-unique-long-password
```

```bash
npm ci
npm run admin:create
npm run build:all
npm start
```

Remove the bootstrap password after account creation. The command refuses to overwrite an existing account. Keep `.env` out of version control and backups intended for public sharing.

In the production Docker image, use the compiled tool instead of npm’s development helper:

```bash
node dist-server/server/create-admin.js
```

Set the bootstrap values through the container platform’s environment controls, then remove them. Change the compose environment before exposing it publicly. The Dockerfile builds in API mode by default.

Create quizzes through the admin UI or import `docs/quiz-import-example.json`. Production does not automatically create public demo accounts.

## 4. Vercel frontend + separately hosted API

The preferred connected topology uses a same-origin `/api` rewrite in Vercel to an HTTPS API host. Add the API rewrite **before** the SPA fallback:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-API-HOST.example/api/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Merge these rules into the supplied `vercel.json`; preserve its other fields. Replace the example host with the real one. Build the Vercel frontend with `VITE_APP_MODE=api` and `VITE_API_URL=/api`. Allow the exact Vercel frontend origin in the API’s `ALLOWED_ORIGINS`. Keep `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=lax`. Test cookie forwarding and proxy headers on the chosen hosting setup.

Alternatively point `VITE_API_URL` directly at `https://YOUR-API-HOST.example/api`. For unrelated frontend/API domains use `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, and an exact allowed origin. Third-party-cookie blocking may prevent sessions in this topology; use the same-origin rewrite when possible.

Do not use wildcard CORS with credentials. Preview deployments have distinct origins; explicitly permit only preview origins you intend to trust. Do not silently fall back from a live assessment to demo mode when an API fails: the UI provides a clearly labeled, separate demo action.

## Backups and restore

```bash
npm run db:backup
# In the production image:
node dist-server/server/backup.js
```

The command uses SQLite’s online backup API, which includes committed WAL data. Do not copy only the live `.sqlite` file while writes are active. Store backups securely and test restoration.

To restore: stop the service, retain a backup of the existing database, replace the database with the verified backup, remove old `-wal` and `-shm` sidecars **only while stopped**, and restart. Restoring an older database also restores older accounts and session state; revoke sessions as part of your recovery procedure if appropriate.

## Runtime behavior

- Schema migration 1 runs automatically and transactionally at startup. Add later migrations without changing already-applied migration code.
- Health check: `GET /api/health`. Docker uses this endpoint.
- Logs: JSON request ID, method, route path, and response status. Passwords and request bodies are not logged.
- Graceful shutdown: SIGINT/SIGTERM closes the listener and database, with a ten-second limit.
- Sessions expire after eight hours and are cleaned up during new session creation.
- Expired attempts are finalized lazily on relevant requests. Their deadlines are enforced even before finalization is materialized.
- Keep the server clock synchronized. The browser timer is a display; the backend clock is authoritative.

## Verification boundary

Frontend/server builds, automated tests, and local browser flows are verified. A live Vercel deployment, Windows execution, production HTTPS proxy configuration, and Docker execution were not performed in this environment. Validate those on the target host before accepting real learners.
