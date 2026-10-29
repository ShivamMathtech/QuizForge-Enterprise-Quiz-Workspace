import { z } from "zod";

export type Role = "learner" | "instructor" | "admin";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  joinedAt: string;
};
export const idSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,80}$/, "Use a valid identifier");
export const questionSchema = z
  .object({
    id: idSchema,
    type: z.enum(["single", "multiple"]),
    prompt: z.string().trim().min(8).max(2000),
    options: z
      .array(
        z.object({ id: idSchema, text: z.string().trim().min(1).max(500) }),
      )
      .min(2)
      .max(6),
    correct: z.array(idSchema).min(1).max(6),
    explanation: z.string().trim().max(2000),
    points: z.number().int().min(1).max(10),
  })
  .superRefine((q, ctx) => {
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length)
      ctx.addIssue({ code: "custom", message: "Option IDs must be unique" });
    if (
      new Set(q.correct).size !== q.correct.length ||
      q.correct.some((c) => !q.options.some((o) => o.id === c))
    )
      ctx.addIssue({
        code: "custom",
        message: "Correct answers must reference unique options",
      });
    if (q.type === "single" && q.correct.length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "Single choice requires exactly one correct answer",
      });
  });
export type Question = z.infer<typeof questionSchema>;
export const quizInputSchema = z
  .object({
    title: z.string().trim().min(5).max(100),
    description: z.string().trim().min(10).max(1000),
    category: z.string().trim().min(2).max(40),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
    duration: z.number().int().min(1).max(180),
    passPercent: z.number().int().min(1).max(100),
    maxAttempts: z.number().int().min(1).max(50),
    shuffle: z.boolean(),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean(),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .superRefine((q, ctx) => {
    if (new Set(q.questions.map((x) => x.id)).size !== q.questions.length)
      ctx.addIssue({ code: "custom", message: "Question IDs must be unique" });
  });
export type QuizInput = z.infer<typeof quizInputSchema>;
export type Quiz = QuizInput & {
  id: string;
  createdBy: string;
  updatedAt: string;
  revision: number;
};
export type CatalogQuiz = Omit<Quiz, "questions"> & {
  questionCount: number;
  questions?: Question[];
};
export type Answers = Record<string, string[]>;
export const answerSchema = z.record(idSchema, z.array(idSchema).max(6));
export const saveSchema = z.object({
  answers: answerSchema,
  flagged: z.array(idSchema).max(100),
  version: z.number().int().min(0),
});
export type AttemptQuestion = Omit<Question, "correct" | "explanation"> & {
  correct?: string[];
  explanation?: string;
};
export type Attempt = {
  id: string;
  userId: string;
  userName?: string;
  quizId: string;
  quizTitle: string;
  category: string;
  questions: AttemptQuestion[];
  answers: Answers;
  flagged: string[];
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  status: "in_progress" | "completed";
  version: number;
  passPercent: number;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number;
  passed: boolean | null;
  reason: "submitted" | "expired" | null;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  createdAt: string;
};
export type Leader = {
  id: string;
  name: string;
  quizzes: number;
  average: number;
  points: number;
};
export type PlatformSettings = { organization: string; registration: boolean };
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});
export const emailSchema = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128);
export const registerSchema = profileSchema.extend({
  email: emailSchema,
  password: passwordSchema,
});

export function validateAnswers(
  questions: Question[],
  answers: Answers,
  flagged: string[],
) {
  const ids = new Set(questions.map((q) => q.id));
  if (
    Object.keys(answers).some((id) => !ids.has(id)) ||
    flagged.some((id) => !ids.has(id))
  )
    throw new Error("Unknown question identifier");
  for (const q of questions) {
    const selected = answers[q.id] || [];
    if (
      new Set(selected).size !== selected.length ||
      selected.some((id) => !q.options.some((o) => o.id === id))
    )
      throw new Error("Invalid answer option");
    if (q.type === "single" && selected.length > 1)
      throw new Error("Choose one answer for a single-choice question");
  }
}
export function isCorrect(
  q: Pick<Question, "correct">,
  selected: string[] = [],
) {
  return (
    selected.length === q.correct.length &&
    q.correct.every((x) => selected.includes(x))
  );
}
export function grade(questions: Question[], answers: Answers) {
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = questions.reduce(
    (sum, q) => sum + (isCorrect(q, answers[q.id]) ? q.points : 0),
    0,
  );
  return {
    totalPoints,
    earnedPoints,
    score: Math.round((earnedPoints / totalPoints) * 100),
  };
}
export function catalog(quiz: Quiz, includeQuestions = false): CatalogQuiz {
  const { questions, ...meta } = quiz;
  return {
    ...meta,
    questionCount: questions.length,
    ...(includeQuestions ? { questions } : {}),
  };
}
export function leaderboard(attempts: Attempt[], users: User[]): Leader[] {
  return users
    .filter((u) => u.active && u.role === "learner")
    .map((u) => {
      const best = new Map<string, number>();
      for (const a of attempts.filter(
        (a) => a.userId === u.id && a.status === "completed",
      ))
        best.set(a.quizId, Math.max(best.get(a.quizId) ?? 0, a.score ?? 0));
      const points = [...best.values()].reduce((s, v) => s + v * 10, 0);
      return {
        id: u.id,
        name: u.name,
        quizzes: best.size,
        average: best.size ? Math.round(points / 10 / best.size) : 0,
        points,
      };
    })
    .filter((u) => u.quizzes > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
