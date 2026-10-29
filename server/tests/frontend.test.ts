import { test } from "node:test";
import assert from "node:assert/strict";
import { demo, switchDemo } from "../../src/lib/demo.js";
import { csv } from "../../src/lib/utils.js";
import { newId } from "../../src/lib/id.js";
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});
test("demo boots without a backend and contains working example results", async () => {
  values.clear();
  const s = await demo.me();
  assert.equal(s!.user.role, "learner");
  assert.equal((await demo.quizzes()).length, 6);
  assert.equal((await demo.attempts()).length, 3);
});
test("demo preserves answers, flags, and score through the persistence layer", async () => {
  values.clear();
  const q = (await demo.quizzes())[0],
    a = await demo.start(q.id);
  const current = a.questions[0];
  const saved = await demo.saveAttempt(
    a.id,
    { [current.id]: [current.options[0].id] },
    [current.id],
    a.version,
  );
  const restored = await demo.attempt(a.id);
  assert.equal(restored.version, saved.version);
  assert.deepEqual(restored.answers, saved.answers);
  assert.deepEqual(restored.flagged, [current.id]);
  const done = await demo.saveAttempt(
    a.id,
    restored.answers,
    restored.flagged,
    restored.version,
    true,
  );
  assert.equal(done.status, "completed");
  assert.equal((await demo.attempt(a.id)).score, done.score);
});
test("demo role checks block management for learners", async () => {
  values.clear();
  await assert.rejects(demo.users(), /Administrator/);
  await assert.rejects(demo.quizzes(true), /permission/);
  switchDemo("instructor");
  assert.equal((await demo.quizzes(true)).length, 6);
  await assert.rejects(demo.users(), /Administrator/);
  switchDemo("admin");
  assert.equal((await demo.users()).length, 7);
});
test("demo instructor creates and publishes a quiz that appears in the catalog", async () => {
  values.clear();
  switchDemo("instructor");
  const source = (await demo.quizzes(true))[0];
  const created = await demo.saveQuiz({
    ...source,
    title: "A newly published challenge",
    questions: source.questions!,
    status: "published",
  });
  assert.ok((await demo.quizzes()).some((q) => q.id === created.id));
  assert.ok((await demo.audit().catch(() => [])).length === 0);
});
test("demo optimistic concurrency prevents a stale tab from overwriting answers", async () => {
  values.clear();
  const q = (await demo.quizzes())[0],
    a = await demo.start(q.id);
  await demo.saveAttempt(a.id, {}, [], 0);
  await assert.rejects(demo.saveAttempt(a.id, {}, [], 0), /another tab/);
});
test("CSV escapes quotes, newlines, and spreadsheet formula prefixes", () => {
  const value = csv([
    ["=SUM(A1:A5)", '"quoted"', "line\nbreak", "@cmd", "safe"],
  ]);
  assert.ok(value.startsWith("\uFEFF"));
  assert.ok(value.includes("'=SUM(A1:A5)"));
  assert.ok(value.includes('""quoted""'));
  assert.ok(value.includes("'@cmd"));
  assert.ok(value.includes('"line\nbreak"'));
});
test("browser identifiers use UUID format with or without randomUUID()", () => {
  assert.match(newId(), /^[a-f0-9-]{36}$/);
  const original = globalThis.crypto;
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: original.getRandomValues.bind(original) },
    });
    assert.match(
      newId(),
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: original,
    });
  }
});
