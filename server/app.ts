import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID, randomInt } from "node:crypto";
import { z, ZodError } from "zod";
import { Store, publicUser } from "./db.js";
import {
  hashPassword,
  verifyPassword,
  token,
  digest,
  dummyPassword,
} from "./security.js";
import {
  quizInputSchema,
  registerSchema,
  profileSchema,
  passwordSchema,
  saveSchema,
  grade,
  catalog,
  validateAnswers,
  leaderboard,
  type User,
  type Attempt,
  type Question,
  type Quiz,
} from "../shared/domain.js";
import { seedQuizzes, seedUsers } from "../shared/seed.js";

type Config = {
  origins: string[];
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  production: boolean;
  registration: boolean;
  trustProxy: number;
  quiet?: boolean;
};
type AuthRequest = Request & {
  user: User;
  session: { token: string; csrf: string };
  requestId: string;
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
function viewAttempt(a: Attempt) {
  if (a.status === "completed") return a;
  return {
    ...a,
    questions: a.questions.map(({ correct: _c, explanation: _e, ...q }) => q),
  };
}
export function createApp(store: Store, options: Partial<Config> = {}) {
  const config: Config = {
    origins: ["http://localhost:5173", "http://localhost:4000"],
    secure: false,
    sameSite: "lax",
    production: false,
    registration: true,
    trustProxy: 0,
    ...options,
  };
  if (config.production && !config.secure)
    throw new Error("Production requires COOKIE_SECURE=true and HTTPS");
  if (config.sameSite === "none" && !config.secure)
    throw new Error("SameSite=none requires secure cookies");
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'", ...config.origins],
        },
      },
    }),
  );
  app.use((req, res, next) => {
    const requestId = randomUUID();
    (req as AuthRequest).requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    if (!config.quiet)
      res.on("finish", () =>
        console.info(
          JSON.stringify({
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
          }),
        ),
      );
    const origin = req.get("origin");
    if (origin && !config.origins.includes(origin)) {
      res
        .status(403)
        .json({ message: "This origin is not allowed", requestId });
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many requests. Try again in a minute." },
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many sign-in attempts. Try again in 15 minutes." },
  });
  const cookie = {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: "/api",
    maxAge: 8 * 3600000,
  };
  function issueSession(res: Response, user: User) {
    const raw = token(),
      csrf = token();
    store.db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
    store.db
      .prepare("INSERT INTO sessions VALUES (?,?,?,?)")
      .run(digest(raw), user.id, csrf, Date.now() + cookie.maxAge);
    res.cookie("qf_session", raw, cookie);
    return { user, csrf };
  }
  function auth(req: Request, _res: Response, next: NextFunction) {
    const raw = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("qf_session="))
      ?.slice(11);
    if (!raw || !/^[a-f0-9]{64}$/.test(raw))
      return next(new HttpError(401, "Please sign in to continue"));
    const session = store.db
      .prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?")
      .get(digest(raw), Date.now());
    const user = session ? store.user(String(session.user_id)) : undefined;
    if (!session || !user?.active)
      return next(
        new HttpError(401, "Your session has expired. Please sign in again."),
      );
    const a = req as AuthRequest;
    a.user = publicUser(user);
    a.session = { token: digest(raw), csrf: String(session.csrf) };
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("X-CSRF-Token") !== a.session.csrf
    )
      return next(
        new HttpError(403, "Invalid request token. Reload and try again."),
      );
    next();
  }
  const user = (req: Request) => (req as AuthRequest).user;
  const admin = (req: Request) => {
    if (user(req).role !== "admin") fail(403, "Administrator access required");
  };
  const manage = (req: Request, q?: Quiz) => {
    const u = user(req);
    if (
      u.role === "learner" ||
      (q && u.role !== "admin" && q.createdBy !== u.id)
    )
      fail(403, "You do not have permission to manage this quiz");
  };
  const getQuiz = (id: string) => store.quiz(id) ?? fail(404, "Quiz not found");
  const getAttempt = (id: string, req: Request) => {
    const a = store.attempt(id) ?? fail(404, "Attempt not found");
    if (a.userId !== user(req).id)
      fail(403, "This attempt belongs to another user");
    return a;
  };
  function complete(a: Attempt, reason: "submitted" | "expired") {
    if (a.status === "completed") return a;
    const result = grade(a.questions as Question[], a.answers);
    Object.assign(a, result, {
      status: "completed",
      passed: result.score >= a.passPercent,
      reason,
      submittedAt: reason === "expired" ? a.deadline : new Date().toISOString(),
      version: a.version + 1,
    });
    store.putAttempt(a);
    store.audit(
      store.user(a.userId)?.name ?? a.userId,
      `attempt.${reason}`,
      a.id,
    );
    return a;
  }
  function expire(uid?: string) {
    for (const a of store.attempts())
      if (
        (!uid || a.userId === uid) &&
        a.status === "in_progress" &&
        Date.parse(a.deadline) <= Date.now()
      )
        complete(a, "expired");
  }
  const settings = () =>
    JSON.parse(
      String(
        store.db.prepare("SELECT body FROM settings WHERE id=1").get()!.body,
      ),
    );

  app.get("/api/health", (_req, res) => {
    store.db.prepare("SELECT 1").get();
    res.json({ status: "ok", service: "quizforge", version: "1.0.0" });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const input = z
      .object({
        email: z
          .email()
          .max(254)
          .transform((x) => x.toLowerCase()),
        password: z.string().max(128),
      })
      .parse(req.body);
    const u = store.email(input.email);
    const matches = await verifyPassword(
      input.password,
      u?.password ?? dummyPassword,
    );
    if (!u || !matches || !u.active)
      fail(401, "Email or password is incorrect");
    store.audit(u.name, "auth.login", u.id);
    res.json(issueSession(res, publicUser(u)));
  });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    if (!config.registration || !settings().registration)
      fail(403, "Registration is closed. Contact your administrator.");
    const data = registerSchema.parse(req.body);
    if (store.email(data.email))
      fail(409, "An account with this email already exists");
    const password = await hashPassword(data.password);
    const u: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      role: "learner",
      active: true,
      joinedAt: new Date().toISOString(),
    };
    store.addUser(u, password);
    store.audit(u.name, "user.register", u.id);
    res.status(201).json(issueSession(res, u));
  });
  app.get("/api/auth/me", auth, (req, res) =>
    res.json({ user: user(req), csrf: (req as AuthRequest).session.csrf }),
  );
  app.post("/api/auth/logout", auth, (req, res) => {
    store.db
      .prepare("DELETE FROM sessions WHERE token=?")
      .run((req as AuthRequest).session.token);
    res.clearCookie("qf_session", { ...cookie, maxAge: undefined });
    res.json({ ok: true });
  });
  app.patch("/api/profile", auth, (req, res) => {
    const input = profileSchema.parse(req.body);
    store.db
      .prepare("UPDATE users SET name=? WHERE id=?")
      .run(input.name, user(req).id);
    store.audit(user(req).name, "profile.update", user(req).id);
    res.json(publicUser(store.user(user(req).id)!));
  });
  app.post("/api/profile/password", auth, async (req, res) => {
    const data = z
      .object({
        currentPassword: z.string().max(128),
        newPassword: passwordSchema,
      })
      .parse(req.body);
    if (
      !(await verifyPassword(
        data.currentPassword,
        store.user(user(req).id)!.password,
      ))
    )
      fail(400, "Current password is incorrect");
    const hash = await hashPassword(data.newPassword);
    store.tx(() => {
      store.db
        .prepare("UPDATE users SET password=? WHERE id=?")
        .run(hash, user(req).id);
      store.db
        .prepare("DELETE FROM sessions WHERE user_id=?")
        .run(user(req).id);
      store.audit(user(req).name, "password.changed", user(req).id);
    });
    res.json(issueSession(res, user(req)));
  });
  app.get("/api/quizzes", auth, (req, res) => {
    const scope = req.query.scope === "manage";
    if (scope) manage(req);
    const list = store
      .quizzes()
      .filter((q) =>
        scope
          ? user(req).role === "admin" || q.createdBy === user(req).id
          : q.status === "published",
      );
    res.json(list.map((q) => catalog(q, scope)));
  });
  app.post("/api/quizzes", auth, (req, res) => {
    manage(req);
    const input = quizInputSchema.parse(req.body);
    const q: Quiz = {
      ...input,
      id: randomUUID(),
      createdBy: user(req).id,
      updatedAt: new Date().toISOString(),
      revision: 1,
    };
    store.tx(() => {
      store.putQuiz(q);
      store.audit(user(req).name, "quiz.created", q.title);
    });
    res.status(201).json(catalog(q, true));
  });
  app.put("/api/quizzes/:id", auth, (req, res) => {
    const old = getQuiz(String(req.params.id));
    manage(req, old);
    const revision = z.number().int().parse(req.body.revision);
    const input = quizInputSchema.parse(req.body);
    const q = store.tx(() => {
      const latest = getQuiz(old.id);
      if (latest.revision !== revision)
        fail(
          409,
          "This quiz changed in another session. Reload before editing.",
        );
      const next = {
        ...latest,
        ...input,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.putQuiz(next);
      store.audit(user(req).name, "quiz.updated", next.title);
      return next;
    });
    res.json(catalog(q, true));
  });
  app.post("/api/quizzes/:id/start", auth, (req, res) => {
    const result = store.tx(() => {
      expire(user(req).id);
      const q = getQuiz(String(req.params.id));
      if (q.status !== "published") fail(403, "This quiz is not published");
      const prior = store
        .attempts()
        .filter((a) => a.userId === user(req).id && a.quizId === q.id);
      const active = prior.find((a) => a.status === "in_progress");
      if (active) return active;
      if (prior.length >= q.maxAttempts)
        fail(409, "You have used all attempts for this quiz");
      const questions = structuredClone(q.questions);
      if (q.shuffle)
        for (let i = questions.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      const a: Attempt = {
        id: randomUUID(),
        userId: user(req).id,
        quizId: q.id,
        quizTitle: q.title,
        category: q.category,
        questions,
        answers: {},
        flagged: [],
        startedAt: new Date().toISOString(),
        deadline: new Date(Date.now() + q.duration * 60000).toISOString(),
        submittedAt: null,
        status: "in_progress",
        version: 0,
        passPercent: q.passPercent,
        score: null,
        earnedPoints: null,
        totalPoints: q.questions.reduce((s, q) => s + q.points, 0),
        passed: null,
        reason: null,
      };
      store.putAttempt(a);
      store.audit(user(req).name, "attempt.started", q.title);
      return a;
    });
    res.json(viewAttempt(result));
  });
  app.get("/api/attempts", auth, (req, res) => {
    store.tx(() => expire(user(req).id));
    res.json(
      store
        .attempts()
        .filter((a) => a.userId === user(req).id)
        .map(viewAttempt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    );
  });
  app.get("/api/attempts/:id", auth, (req, res) => {
    const a = store.tx(() => {
      let a = getAttempt(String(req.params.id), req);
      if (a.status === "in_progress" && Date.parse(a.deadline) <= Date.now())
        a = complete(a, "expired");
      return a;
    });
    res.json(viewAttempt(a));
  });
  for (const action of ["save", "submit"] as const)
    app.post(`/api/attempts/:id/${action}`, auth, (req, res) => {
      const a = store.tx(() => {
        const a = getAttempt(String(req.params.id), req);
        if (a.status === "completed") return a;
        if (Date.parse(a.deadline) <= Date.now()) return complete(a, "expired");
        const data = saveSchema.parse(req.body);
        if (data.version !== a.version)
          fail(
            409,
            "This attempt changed in another tab. Reload to continue safely.",
          );
        try {
          validateAnswers(
            a.questions as Question[],
            data.answers,
            data.flagged,
          );
        } catch (e) {
          fail(400, (e as Error).message);
        }
        a.answers = data.answers;
        a.flagged = [...new Set(data.flagged)];
        a.version++;
        if (action === "submit") return complete(a, "submitted");
        store.putAttempt(a);
        return a;
      });
      res.json(viewAttempt(a));
    });
  app.get("/api/leaderboard", auth, (_req, res) => {
    store.tx(() => expire());
    res.json(leaderboard(store.attempts(), store.users()));
  });
  app.get("/api/reports", auth, (req, res) => {
    manage(req);
    store.tx(() => expire());
    const owned = new Set(
      store
        .quizzes()
        .filter((q) => q.createdBy === user(req).id)
        .map((q) => q.id),
    );
    res.json(
      store
        .attempts()
        .filter(
          (a) =>
            a.status === "completed" &&
            (user(req).role === "admin" || owned.has(a.quizId)),
        )
        .map((a) => ({
          ...a,
          userName: store.user(a.userId)?.name ?? "Unknown user",
        })),
    );
  });
  app.get("/api/users", auth, (req, res) => {
    admin(req);
    res.json(store.users());
  });
  app.post("/api/users", auth, async (req, res) => {
    admin(req);
    const data = registerSchema
      .extend({ role: z.enum(["learner", "instructor", "admin"]) })
      .parse(req.body);
    if (store.email(data.email))
      fail(409, "An account with this email already exists");
    const hash = await hashPassword(data.password);
    const u: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      role: data.role,
      active: true,
      joinedAt: new Date().toISOString(),
    };
    store.addUser(u, hash);
    store.audit(user(req).name, "user.created", u.email);
    res.status(201).json(u);
  });
  app.patch("/api/users/:id", auth, (req, res) => {
    admin(req);
    const target =
      store.user(String(req.params.id)) ?? fail(404, "User not found");
    if (target.id === user(req).id)
      fail(400, "You cannot change your own role or active status");
    const data = z
      .object({
        role: z.enum(["learner", "instructor", "admin"]),
        active: z.boolean(),
      })
      .parse(req.body);
    store.tx(() => {
      store.db
        .prepare("UPDATE users SET role=?,active=? WHERE id=?")
        .run(data.role, data.active ? 1 : 0, target.id);
      store.db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
      store.audit(user(req).name, "user.access.updated", target.email);
    });
    res.json(publicUser(store.user(target.id)!));
  });
  app.get("/api/audit", auth, (req, res) => {
    admin(req);
    res.json(store.audits());
  });
  app.get("/api/settings", auth, (_req, res) =>
    res.json({
      ...settings(),
      registration: config.registration && settings().registration,
    }),
  );
  app.put("/api/settings", auth, (req, res) => {
    admin(req);
    const input = z
      .object({
        organization: z.string().trim().min(2).max(80),
        registration: z.boolean(),
      })
      .parse(req.body);
    store.tx(() => {
      store.db
        .prepare("UPDATE settings SET body=? WHERE id=1")
        .run(JSON.stringify(input));
      store.audit(user(req).name, "settings.updated", input.organization);
    });
    res.json({
      ...input,
      registration: config.registration && input.registration,
    });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "API endpoint not found" }),
  );
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    let status = 500,
      message = "Something went wrong. Please try again.";
    if (err instanceof HttpError) {
      status = err.status;
      message = err.message;
    } else if (err instanceof ZodError) {
      status = 400;
      message = err.issues
        .map((x) => `${x.path.join(".") || "Input"}: ${x.message}`)
        .join("; ");
    } else if (err instanceof Error && /UNIQUE constraint/.test(err.message)) {
      status = 409;
      message = "This record already exists. Refresh and try again.";
    } else if (err instanceof SyntaxError) {
      status = 400;
      message = "Invalid JSON request";
    } else if ((err as { type?: string })?.type === "entity.too.large") {
      status = 413;
      message = "Request is too large (maximum 1 MB)";
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          requestId: (req as AuthRequest).requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    res
      .status(status)
      .json({ message, requestId: (req as AuthRequest).requestId });
  });
  return app;
}

export async function initialize(store: Store, demo = false) {
  if (!demo) return;
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Demo accounts are forbidden in production. Set ENABLE_DEMO_ACCOUNTS=false.",
    );
  const hash = await hashPassword("QuizForge!2026");
  for (const u of seedUsers().slice(0, 3))
    if (!store.email(u.email)) store.addUser(u, hash);
  if (store.quizzes().length === 0) {
    const owner = store.email("instructor@quizforge.local")!.id;
    for (const q of seedQuizzes(owner)) store.putQuiz(q);
  }
}
