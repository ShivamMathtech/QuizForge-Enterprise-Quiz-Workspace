# Verification report

Verified on 29 October 2026 using Node.js 24.22.1 and npm 11.9.0 on Linux.

## Automated checks

- Frontend TypeScript compilation and Vite production build: passed.
- Backend TypeScript compilation: passed.
- Demo frontend build and API-mode frontend build: passed.
- API, scoring, demo adapter, CSV, and identifier tests: **45 passed, 0 failed**.
- Dependency audit at verification time: **0 known vulnerabilities** reported by `npm audit`.

Test coverage includes authentication, password hashing, public registration role enforcement, duplicate accounts, origin/CSRF checks, role restrictions, instructor ownership, question validation, hidden active answer keys, concurrent start/resume, optimistic versions, weighted scoring, exact multiple-answer matching, immutable snapshots, deadlines, repeat submission, attempt limits, attempt privacy, best-score ranking, user deactivation, session revocation, password changes, registration settings, audit events, SQL-bound input, payload errors, production cookie configuration, migrations, browser demo persistence, and formula-safe CSV output.

## Browser checks performed

- Desktop dashboard, catalog, quiz instructions, and navigation rendered.
- Started a timed demo attempt, selected an answer, flagged the question, saved and left, and resumed with the answer/flag preserved.
- Submitted that attempt and verified the expected score and answer explanations.
- Switched to Instructor, created a complete question through the visual editor, and published a quiz; it appeared in the management list with Published status.
- Reviewed 390px phone and 768px tablet layouts in browser frames. Document widths matched their viewports with no horizontal overflow.
- Opened mobile navigation successfully.
- Started both applications with the full-stack launcher under the managed preview and confirmed the connected frontend reached its sign-in screen.
- The authenticated API lifecycle was exercised by integration tests. Authenticated browser UI checks used demo mode; no real user credentials were needed.

A compatibility defect discovered during browser testing was fixed: browser IDs also work on HTTP LAN previews where `crypto.randomUUID()` is unavailable. The fallback uses `crypto.getRandomValues()` and is covered by a test.

## What was not executed here

- A public Vercel deployment or custom domain setup.
- Windows batch-file execution on an actual Windows machine.
- Docker image/compose execution.
- External HTTPS proxy/cross-site-cookie deployment.
- Browser testing across Safari, Firefox, assistive technologies, or real mobile devices.
- Independent security review, load testing, high availability, or enterprise certification.

The deployment files and Windows launchers are provided, but these target-specific checks must be performed in the deployment environment. Unit/integration tests do not establish suitability for high-stakes assessments or large multi-tenant workloads.

## Reproduce

```bash
npm ci
npm run check
npm audit
```

For browser verification, start with `npm run dev` for the independent demo or `npm run dev:full` for the local API-backed application. The automated suite uses isolated in-memory databases and does not modify your development database.
