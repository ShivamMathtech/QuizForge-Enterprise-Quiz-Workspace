# Security model

## Trust boundaries

Browser demo mode is a feature demonstration. Its answer keys and state are inspectable, editable, and removable by the browser user. Role switching is intentional. Never use demo results for grades, hiring, certification, or sensitive records.

Connected mode uses the API as the authority. The catalog omits questions and answer keys. Active attempts omit correct answers and explanations. Completed attempts expose their review only to their owner. Instructors/admins can view completed reports only within their authorized quiz scope.

## Accounts and sessions

- Passwords are salted with 16 cryptographically random bytes and derived with Node’s scrypt (64-byte output, Node default cost parameters). Timing-safe comparison verifies hashes.
- Sessions use 32 random bytes. Only SHA-256 token digests are stored in SQLite; the raw token is an HttpOnly cookie.
- Sessions expire after eight hours. No token is stored in browser localStorage in connected mode.
- A per-session CSRF token is returned by login and `/auth/me`, kept in memory, and required on authenticated writes.
- Origin allowlisting applies before authentication, including login. CORS reflects only configured origins. SameSite cookie settings complement CSRF protection.
- Production requires Secure cookies. Cross-site cookies additionally require SameSite=None and HTTPS.
- Password changes revoke all sessions and create a new current session. Access changes revoke all sessions for the affected user.
- Admins cannot modify their own role/active state through the access endpoint.
- Public registration always creates a learner, ignoring any supplied role.

Password hashing parameters should be benchmarked and versioned before deployment under an organization-specific security standard. MFA, email verification, password reset delivery, breached-password checks, and SSO are not implemented.

## Permissions

| Action                                     | Learner | Instructor  | Admin       |
| ------------------------------------------ | ------- | ----------- | ----------- |
| Browse published quizzes and take attempts | Yes     | Yes         | Yes         |
| View own attempt/review                    | Yes     | Yes         | Yes         |
| Create quizzes                             | No      | Yes         | Yes         |
| Edit quizzes                               | No      | Own only    | All         |
| Question bank                              | No      | Own quizzes | All quizzes |
| Reports                                    | No      | Own quizzes | All quizzes |
| Manage users/access                        | No      | No          | Yes         |
| Read audit log / edit workspace settings   | No      | No          | Yes         |

Frontend routes reflect the role but are not a security boundary. The server independently checks permissions for every protected operation.

## Assessment integrity

- Question snapshots are frozen at attempt creation.
- The server generates deadlines, records submissions, and computes scores.
- A partial unique database index permits one active attempt per learner per quiz.
- Start/save/submit operations use transactions. Version conflicts return 409.
- Attempts after the deadline use only already-persisted answers; late request payloads are ignored.
- Repeated submission returns the previously stored result without rescoring.
- Client-supplied score/pass values have no effect.
- Incorrect and unanswered questions earn zero. Multiple-answer questions use exact set matching.

This does not prevent learners from sharing answers, opening other websites, or using another device. There is no proctoring, plagiarism detection, lockdown browser, or hidden question pool. Default sample content is public practice material.

## Operational controls and limits

- Helmet security headers and a same-origin script policy when the API serves the frontend.
- Vercel frontend headers: nosniff, frame denial, referrer policy, and denied camera/microphone/geolocation.
- 1 MB JSON body limit. Validated email, password, text, array, question, option, and scoring bounds.
- Login/registration limiter: 30 requests per 15 minutes per IP. General API limiter: 300 requests per minute per IP. Configure trusted proxy hops correctly.
- Parameterized SQL and foreign-key enforcement.
- CSV values are quoted and formula-leading characters are neutralized.
- Quiz archiving preserves references and results. No irreversible user/quiz delete endpoint is exposed.
- Audit events capture actor, action, record, and time. They are editable by a database administrator and are **not** cryptographically tamper-evident.

Rate limiting is in memory and resets on restart. The SQLite file is not encrypted by the application. Protect its filesystem permissions, disks, and backups. The server is a single-instance design; use shared infrastructure and load-test before horizontal scaling.

## Before public use

Use unique admin credentials; disable development accounts; enable HTTPS and Secure cookies; set exact origins and proxy trust; restrict database access; configure backups, monitoring, and retention; review applicable data policies; and independently review the code and deployment. This repository has not undergone an external security audit.

Security issues should be reported privately to the operator maintaining your deployment. Do not publish credentials or learner records in public issues.
