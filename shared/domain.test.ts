import { test } from "node:test";
import assert from "node:assert/strict";
import {
  grade,
  quizInputSchema,
  validateAnswers,
  leaderboard,
} from "./domain.js";
import { seedQuizzes, seedUsers } from "./seed.js";
test("all six seed quizzes and 44 questions pass schema validation", () => {
  const quizzes = seedQuizzes();
  assert.equal(quizzes.length, 6);
  assert.equal(
    quizzes.reduce((s, q) => s + q.questions.length, 0),
    44,
  );
  for (const q of quizzes) assert.ok(quizInputSchema.safeParse(q).success);
});
test("multiple-answer questions use exact set matching, without partial credit", () => {
  const q = seedQuizzes()[0].questions.find((q) => q.type === "multiple")!;
  assert.equal(grade([q], { [q.id]: q.correct }).score, 100);
  assert.equal(grade([q], { [q.id]: q.correct.slice(0, 1) }).score, 0);
  assert.equal(grade([q], { [q.id]: q.options.map((o) => o.id) }).score, 0);
});
test("weighted points determine score, not the raw count of correct answers", () => {
  const qs = structuredClone(seedQuizzes()[0].questions.slice(0, 2));
  qs[0].points = 3;
  qs[1].points = 1;
  assert.deepEqual(grade(qs, { [qs[0].id]: qs[0].correct }), {
    earnedPoints: 3,
    totalPoints: 4,
    score: 75,
  });
});
test("empty answers receive zero points", () =>
  assert.equal(grade(seedQuizzes()[0].questions, {}).score, 0));
test("duplicate question IDs, invalid limits, and empty quizzes are invalid", () => {
  const q = structuredClone(seedQuizzes()[0]);
  q.questions[1].id = q.questions[0].id;
  assert.equal(quizInputSchema.safeParse(q).success, false);
  assert.equal(
    quizInputSchema.safeParse({ ...seedQuizzes()[0], duration: 0 }).success,
    false,
  );
  assert.equal(
    quizInputSchema.safeParse({ ...seedQuizzes()[0], questions: [] }).success,
    false,
  );
});
test("answer validation rejects unknown flags and duplicate selected options", () => {
  const q = seedQuizzes()[0];
  assert.throws(() => validateAnswers(q.questions, {}, ["missing"]));
  assert.throws(() =>
    validateAnswers(q.questions, { [q.questions[0].id]: ["o0", "o0"] }, []),
  );
});
test("leaderboard begins empty without completed attempts", () =>
  assert.deepEqual(leaderboard([], seedUsers()), []));
