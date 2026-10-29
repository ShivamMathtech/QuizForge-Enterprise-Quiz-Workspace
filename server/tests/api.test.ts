import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { Store } from "../db.js";
import { createApp, initialize } from "../app.js";
import { hashPassword } from "../security.js";
import type { Attempt, Quiz } from "../../shared/domain.js";

async function fixture(t: { after: (f: () => void) => void }) {
  const store = new Store(":memory:");
  await initialize(store, true);
  t.after(() => store.close());
  const app = createApp(store, { quiet: true });
  async function login(role = "learner") {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/login")
      .send({ email: `${role}@quizforge.local`, password: "QuizForge!2026" })
      .expect(200);
    const csrf = res.body.csrf as string;
    return {
      agent,
      csrf,
      user: res.body.user,
      post: (path: string, body: unknown = {}) =>
        agent.post(path).set("X-CSRF-Token", csrf).send(body),
      put: (path: string, body: unknown) =>
        agent.put(path).set("X-CSRF-Token", csrf).send(body),
      patch: (path: string, body: unknown) =>
        agent.patch(path).set("X-CSRF-Token", csrf).send(body),
    };
  }
  return { store, app, login };
}
const correct = (q: Quiz) =>
  Object.fromEntries(q.questions.map((q) => [q.id, q.correct]));

test("health is public, authenticated resources are private", async (t) => {
  const { app } = await fixture(t);
  await request(app).get("/api/health").expect(200);
  for (const path of [
    "/quizzes",
    "/attempts",
    "/users",
    "/reports",
    "/audit",
    "/settings",
  ])
    await request(app).get(`/api${path}`).expect(401);
});
test("login rejects invalid passwords and hides password hashes", async (t) => {
  const { app, login } = await fixture(t);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "learner@quizforge.local", password: "wrong" })
    .expect(401);
  const s = await login();
  assert.equal(s.user.password, undefined);
  const me = await s.agent.get("/api/auth/me").expect(200);
  assert.equal(me.body.user.role, "learner");
  assert.ok(me.body.csrf);
});
test("registration assigns learner even when a caller requests admin", async (t) => {
  const { app, store } = await fixture(t);
  const r = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Learner",
      email: "NEW@EXAMPLE.TEST",
      password: "TestingPassword!26",
      role: "admin",
    })
    .expect(201);
  assert.equal(r.body.user.role, "learner");
  assert.equal(r.body.user.email, "new@example.test");
  assert.notEqual(
    store.email("new@example.test")!.password,
    "TestingPassword!26",
  );
  assert.match(r.headers["set-cookie"][0], /HttpOnly/);
});
test("duplicate emails and short passwords are rejected", async (t) => {
  const { app } = await fixture(t);
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Duplicate User",
      email: "learner@quizforge.local",
      password: "TestingPassword!26",
    })
    .expect(409);
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Short Password",
      email: "short@example.test",
      password: "short",
    })
    .expect(400);
});
test("cross-origin writes and missing CSRF tokens are rejected", async (t) => {
  const { app, login } = await fixture(t);
  await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://attacker.invalid")
    .send({ email: "learner@quizforge.local", password: "QuizForge!2026" })
    .expect(403);
  const s = await login();
  await s.agent
    .patch("/api/profile")
    .send({ name: "Wrong Origin" })
    .expect(403);
  await s.patch("/api/profile", { name: "Allowed Name" }).expect(200);
});
test("learner cannot access administrative or instructor endpoints", async (t) => {
  const { login, store } = await fixture(t),
    s = await login();
  for (const path of ["/users", "/reports", "/audit", "/quizzes?scope=manage"])
    await s.agent.get(`/api${path}`).expect(403);
  await s.post("/api/quizzes", store.quizzes()[0]).expect(403);
  await s
    .put("/api/settings", { organization: "Hacked", registration: true })
    .expect(403);
});
test("published catalog never includes question content or answer keys", async (t) => {
  const { login } = await fixture(t),
    s = await login();
  const r = await s.agent.get("/api/quizzes").expect(200);
  assert.equal(r.body.length, 6);
  assert.equal(r.body[0].questions, undefined);
  assert.ok(r.body[0].questionCount > 0);
});
test("instructor can author quizzes; drafts are hidden from learners", async (t) => {
  const { login, store } = await fixture(t),
    teacher = await login("instructor"),
    learner = await login();
  const q = {
    ...store.quizzes()[0],
    title: "Draft for a new course",
    status: "draft",
  };
  const r = await teacher.post("/api/quizzes", q).expect(201);
  assert.equal(r.body.createdBy, teacher.user.id);
  const catalog = await learner.agent.get("/api/quizzes");
  assert.ok(!catalog.body.some((q: Quiz) => q.id === r.body.id));
  await learner.post(`/api/quizzes/${r.body.id}/start`).expect(403);
});
test("question validation rejects missing and duplicate correct option IDs", async (t) => {
  const { login, store } = await fixture(t),
    s = await login("instructor");
  const q = structuredClone(store.quizzes()[0]);
  q.questions[0].correct = ["not-an-option"];
  await s.post("/api/quizzes", q).expect(400);
  q.questions[0].correct = ["o0", "o0"];
  await s.post("/api/quizzes", q).expect(400);
});
test("quiz revision conflicts are detected", async (t) => {
  const { login, store } = await fixture(t),
    s = await login("instructor"),
    q = store.quizzes()[0];
  await s
    .put(`/api/quizzes/${q.id}`, { ...q, title: "Updated assessment title" })
    .expect(200);
  await s.put(`/api/quizzes/${q.id}`, q).expect(409);
});
test("instructors cannot edit or report on another instructor’s assessments", async (t) => {
  const { login, store, app } = await fixture(t),
    admin = await login("admin");
  const r = await admin
    .post("/api/users", {
      name: "Other Instructor",
      email: "other@example.test",
      password: "OtherPassword!2026",
      role: "instructor",
    })
    .expect(201);
  const other = request.agent(app);
  const loginResponse = await other
    .post("/api/auth/login")
    .send({ email: r.body.email, password: "OtherPassword!2026" })
    .expect(200);
  const q = store.quizzes()[0];
  await other
    .put(`/api/quizzes/${q.id}`)
    .set("X-CSRF-Token", loginResponse.body.csrf)
    .send(q)
    .expect(403);
  const managed = await other.get("/api/quizzes?scope=manage").expect(200);
  assert.equal(managed.body.length, 0);
  const reports = await other.get("/api/reports").expect(200);
  assert.equal(reports.body.length, 0);
});
test("start returns a sanitized, timed snapshot and resumes without duplicates", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const [a, b] = await Promise.all([
    s.post(`/api/quizzes/${q.id}/start`),
    s.post(`/api/quizzes/${q.id}/start`),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body.id, b.body.id);
  assert.equal(store.attempts().length, 1);
  assert.equal(a.body.questions[0].correct, undefined);
  assert.equal(a.body.questions[0].explanation, undefined);
  assert.ok(Date.parse(a.body.deadline) > Date.now());
});
test("answers and flags persist, with optimistic version checks", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const body = {
    answers: { [q.questions[0].id]: q.questions[0].correct },
    flagged: [q.questions[0].id],
    version: 0,
  };
  const r = await s.post(`/api/attempts/${a.id}/save`, body).expect(200);
  assert.equal(r.body.version, 1);
  assert.deepEqual(r.body.answers, body.answers);
  assert.deepEqual(r.body.flagged, body.flagged);
  await s.post(`/api/attempts/${a.id}/save`, body).expect(409);
  const restored = await s.agent.get(`/api/attempts/${a.id}`).expect(200);
  assert.deepEqual(restored.body.answers, body.answers);
});
test("unrecognized answer IDs and multiple values for single choice are rejected", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  await s
    .post(`/api/attempts/${a.id}/save`, {
      answers: { unknown: ["o0"] },
      flagged: [],
      version: 0,
    })
    .expect(400);
  await s
    .post(`/api/attempts/${a.id}/save`, {
      answers: { [q.questions[0].id]: ["o0", "o1"] },
      flagged: [],
      version: 0,
    })
    .expect(400);
});
test("server scores answers and ignores forged client scores", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const r = await s
    .post(`/api/attempts/${a.id}/submit`, {
      answers: {},
      flagged: [],
      version: 0,
      score: 100,
      passed: true,
    })
    .expect(200);
  assert.equal(r.body.score, 0);
  assert.equal(r.body.passed, false);
  assert.equal(r.body.status, "completed");
  assert.ok(r.body.questions[0].correct);
});
test("correct full answers pass and repeat submission is idempotent", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const payload = { answers: correct(q), flagged: [], version: 0 };
  const r = await s.post(`/api/attempts/${a.id}/submit`, payload).expect(200);
  assert.equal(r.body.score, 100);
  assert.equal(r.body.passed, true);
  const again = await s
    .post(`/api/attempts/${a.id}/submit`, { ...payload, answers: {} })
    .expect(200);
  assert.deepEqual(again.body, r.body);
  assert.equal(
    store.audits().filter((e) => e.action === "attempt.submitted").length,
    1,
  );
});
test("deadline rejects late answers and scores only saved work", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const stored = store.attempt(a.id)!;
  stored.deadline = new Date(Date.now() - 1000).toISOString();
  store.putAttempt(stored);
  const r = await s
    .post(`/api/attempts/${a.id}/submit`, {
      answers: correct(q),
      flagged: [],
      version: 0,
    })
    .expect(200);
  assert.equal(r.body.score, 0);
  assert.equal(r.body.reason, "expired");
});
test("expired attempts finalize on retrieval even after a browser was closed", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const saved = store.attempt(a.id)!;
  saved.answers = correct(q);
  saved.deadline = new Date(Date.now() - 5000).toISOString();
  store.putAttempt(saved);
  const r = await s.agent.get("/api/attempts").expect(200);
  assert.equal(r.body[0].status, "completed");
  assert.equal(r.body[0].score, 100);
  assert.equal(r.body[0].reason, "expired");
});
test("quiz edits do not change in-progress snapshots or historical scoring", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    teacher = await login("instructor"),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  const edit = structuredClone(q);
  edit.questions[0].correct = ["o0"];
  edit.title = "New quiz revision for next cohort";
  await teacher.put(`/api/quizzes/${q.id}`, edit).expect(200);
  const r = await s
    .post(`/api/attempts/${a.id}/submit`, {
      answers: correct(q),
      flagged: [],
      version: 0,
    })
    .expect(200);
  assert.equal(r.body.score, 100);
  assert.equal(r.body.quizTitle, q.title);
});
test("maximum attempts are enforced after completed work", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    q = store.quizzes()[0];
  q.maxAttempts = 1;
  store.putQuiz(q);
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  await s
    .post(`/api/attempts/${a.id}/submit`, {
      answers: {},
      flagged: [],
      version: 0,
    })
    .expect(200);
  await s.post(`/api/quizzes/${q.id}/start`).expect(409);
});
test("attempt access is isolated between users", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    other = await login("admin"),
    q = store.quizzes()[0];
  const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
  await other.agent.get(`/api/attempts/${a.id}`).expect(403);
  await other
    .post(`/api/attempts/${a.id}/submit`, {
      answers: {},
      flagged: [],
      version: 0,
    })
    .expect(403);
});
test("reports contain own quiz results and leaderboard uses best score per quiz", async (t) => {
  const { login, store } = await fixture(t),
    s = await login(),
    teacher = await login("instructor"),
    q = store.quizzes()[0];
  for (let i = 0; i < 2; i++) {
    const { body: a } = await s.post(`/api/quizzes/${q.id}/start`);
    await s
      .post(`/api/attempts/${a.id}/submit`, {
        answers: correct(q),
        flagged: [],
        version: 0,
      })
      .expect(200);
  }
  const report = await teacher.agent.get("/api/reports").expect(200);
  assert.equal(report.body.length, 2);
  assert.equal(report.body[0].userName, "Shivam Singh");
  const leaders = await s.agent.get("/api/leaderboard").expect(200);
  assert.equal(leaders.body[0].points, 1000);
  assert.equal(leaders.body[0].quizzes, 1);
  assert.equal(leaders.body[0].email, undefined);
});
test("deactivation revokes sessions and blocks future login", async (t) => {
  const { login, app } = await fixture(t),
    s = await login(),
    admin = await login("admin");
  await admin
    .patch(`/api/users/${s.user.id}`, { role: "learner", active: false })
    .expect(200);
  await s.agent.get("/api/auth/me").expect(401);
  await request(app)
    .post("/api/auth/login")
    .send({ email: s.user.email, password: "QuizForge!2026" })
    .expect(401);
});
test("an admin cannot demote or deactivate their own account", async (t) => {
  const { login } = await fixture(t),
    s = await login("admin");
  await s
    .patch(`/api/users/${s.user.id}`, { role: "learner", active: false })
    .expect(400);
});
test("password updates revoke other sessions and rotate current session", async (t) => {
  const { login, app } = await fixture(t),
    s = await login(),
    other = await login();
  await s
    .post("/api/profile/password", {
      currentPassword: "wrong",
      newPassword: "NewSecretPassword!26",
    })
    .expect(400);
  const r = await s
    .post("/api/profile/password", {
      currentPassword: "QuizForge!2026",
      newPassword: "NewSecretPassword!26",
    })
    .expect(200);
  assert.ok(r.body.csrf);
  await other.agent.get("/api/auth/me").expect(401);
  await request(app)
    .post("/api/auth/login")
    .send({ email: s.user.email, password: "QuizForge!2026" })
    .expect(401);
  await request(app)
    .post("/api/auth/login")
    .send({ email: s.user.email, password: "NewSecretPassword!26" })
    .expect(200);
});
test("logout removes the session", async (t) => {
  const { login } = await fixture(t),
    s = await login();
  await s.post("/api/auth/logout").expect(200);
  await s.agent.get("/api/auth/me").expect(401);
});
test("registration can be closed and settings changes are audited", async (t) => {
  const { login, app } = await fixture(t),
    s = await login("admin");
  await s
    .put("/api/settings", {
      organization: "Learning Studio",
      registration: false,
    })
    .expect(200);
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Blocked User",
      email: "closed@example.test",
      password: "TestingPassword!26",
    })
    .expect(403);
  const r = await s.agent.get("/api/audit").expect(200);
  assert.ok(
    r.body.some((a: { action: string }) => a.action === "settings.updated"),
  );
});
test("input strings are stored through bound SQL parameters", async (t) => {
  const { login, store } = await fixture(t),
    s = await login();
  const name = "Robert'); DROP TABLE users; --";
  await s.patch("/api/profile", { name }).expect(200);
  assert.equal(store.user(s.user.id)!.name, name);
  assert.ok(store.users().length >= 3);
});
test("malformed JSON and oversized bodies have safe client errors", async (t) => {
  const { app } = await fixture(t);
  await request(app)
    .post("/api/auth/login")
    .type("json")
    .send("{broken")
    .expect(400);
  await request(app)
    .post("/api/auth/login")
    .send({ data: "x".repeat(1024 * 1024 + 10) })
    .expect(413);
});
test("production refuses insecure cookie configuration", async (t) => {
  const { store } = await fixture(t);
  assert.throws(
    () => createApp(store, { production: true, secure: false }),
    /COOKIE_SECURE/,
  );
  assert.throws(
    () => createApp(store, { sameSite: "none", secure: false }),
    /secure cookies/,
  );
});
test("database schema migration is idempotent", async (t) => {
  const { store } = await fixture(t);
  store.migrate();
  store.migrate();
  assert.equal(store.users().length, 3);
  const rows = store.db.prepare("SELECT * FROM migrations").all();
  assert.equal(rows.length, 1);
});
