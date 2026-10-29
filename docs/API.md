# QuizForge HTTP API

Base URL in local development: `http://localhost:4000/api`.

All bodies and normal responses use JSON. Authentication is an HttpOnly session cookie. Login/registration and `/auth/me` return `{ user, csrf }`. For authenticated POST/PUT/PATCH requests, send `X-CSRF-Token: <csrf>`. Browser requests use `credentials: include`.

Errors use `{ "message": "Human-readable error", "requestId": "..." }` where a request ID is available. Common status codes: 400 validation, 401 session/login, 403 authorization/CSRF/origin, 404 missing, 409 conflict/attempt limit, 413 payload size, 429 rate limit.

| Method | Path                    | Purpose                                                    |
| ------ | ----------------------- | ---------------------------------------------------------- |
| GET    | `/health`               | Public health check                                        |
| POST   | `/auth/register`        | `{ name, email, password }`; always creates learner        |
| POST   | `/auth/login`           | `{ email, password }`                                      |
| GET    | `/auth/me`              | Current user and CSRF token                                |
| POST   | `/auth/logout`          | Revoke current session                                     |
| PATCH  | `/profile`              | Update `{ name }`                                          |
| POST   | `/profile/password`     | `{ currentPassword, newPassword }`; revoke old sessions    |
| GET    | `/quizzes`              | Published catalog, with question counts but no answer keys |
| GET    | `/quizzes?scope=manage` | Authorized full quiz content for staff                     |
| POST   | `/quizzes`              | Staff creates a quiz from the import schema                |
| PUT    | `/quizzes/:id`          | Authorized update; include current `revision`              |
| POST   | `/quizzes/:id/start`    | Start or resume an active attempt                          |
| GET    | `/attempts`             | Current user’s attempts                                    |
| GET    | `/attempts/:id`         | Current user’s attempt or completed review                 |
| POST   | `/attempts/:id/save`    | Save answers and flags using version check                 |
| POST   | `/attempts/:id/submit`  | Grade and finalize; safe to retry                          |
| GET    | `/leaderboard`          | Active learners ranked by best scores; no email addresses  |
| GET    | `/reports`              | Completed attempts for authorized quizzes                  |
| GET    | `/users`                | Admin user listing                                         |
| POST   | `/users`                | Admin creates `{ name, email, password, role }`            |
| PATCH  | `/users/:id`            | Admin changes `{ role, active }`                           |
| GET    | `/audit`                | Admin reads latest 200 events                              |
| GET    | `/settings`             | Workspace name and effective registration policy           |
| PUT    | `/settings`             | Admin updates `{ organization, registration }`             |

## Attempt write payload

```json
{
  "answers": {
    "question-id": ["option-id"],
    "multiple-choice-question-id": ["option-a", "option-c"]
  },
  "flagged": ["question-id"],
  "version": 0
}
```

The response contains the new version. Serialize autosaves and use that returned version for the next write. A stale version returns 409. Reload the latest attempt rather than discarding the version guard. Manual submission can include the latest unsaved answers in the same payload. After the deadline, request answers are not accepted and the persisted answers are scored.

Question type `single` requires one correct answer. `multiple` allows multiple correct options. True/false questions can be modeled as a single-choice question with two options. Questions can have 2–6 options and 1–10 points. Quizzes contain 1–100 questions, last 1–180 minutes, and permit 1–50 attempts. See `shared/domain.ts` and `quiz-import-example.json` for the full schema.

## Data model

SQLite tables are `users`, `sessions`, `quizzes`, `attempts`, `audit`, `settings`, and `migrations`. Quiz/attempt bodies are stored as validated JSON with indexed identity/ownership/status columns. Attempt snapshots preserve historical questions and grading rules. There is no hard deletion API.

The initial migration is in `server/db.ts`. Queries use bound parameters. A single active-attempt partial index protects `(user_id, quiz_id)` from duplicate active records.

## Intentional boundaries

This API has no payment, email, media upload, organization/tenant, invitation delivery, proctoring, or password recovery endpoints. It is not an OpenAPI-generated SDK. Collection endpoints are not paginated; large deployments should add pagination and database-level reporting before adoption.
