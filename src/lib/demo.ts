import { newId } from "./id";
import type { Service } from "./service";
import { seedQuizzes, seedUsers, seedAttempts } from "../../shared/seed";
import {
  quizInputSchema,
  registerSchema,
  profileSchema,
  validateAnswers,
  grade,
  catalog,
  leaderboard,
  type Attempt,
  type Quiz,
  type User,
  type Audit,
  type PlatformSettings,
  type Role,
  type Question,
} from "../../shared/domain";

type State = {
  version: 1;
  users: User[];
  quizzes: Quiz[];
  attempts: Attempt[];
  audit: Audit[];
  settings: PlatformSettings;
  selected: string | null;
};
const key = "quizforge-demo-v1";
function initial(): State {
  const quizzes = seedQuizzes();
  return {
    version: 1,
    users: seedUsers(),
    quizzes,
    attempts: seedAttempts(quizzes),
    audit: [
      {
        id: "seed",
        actor: "QuizForge",
        action: "demo.initialized",
        entity: "Sample workspace",
        createdAt: new Date().toISOString(),
      },
    ],
    settings: { organization: "QuizForge Workspace", registration: true },
    selected: "demo-learner",
  };
}
function read(): State {
  const raw = localStorage.getItem(key);
  if (!raw) {
    const s = initial();
    write(s);
    return s;
  }
  try {
    const s = JSON.parse(raw);
    if (
      s.version !== 1 ||
      !Array.isArray(s.quizzes) ||
      !Array.isArray(s.users) ||
      !Array.isArray(s.attempts)
    )
      throw new Error();
    return s;
  } catch {
    throw new Error(
      "Demo data could not be read. Open Settings and reset the demo, or clear this site’s browser storage.",
    );
  }
}
function write(s: State) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    throw new Error(
      "Browser storage is full or blocked. Enable site storage or reset the demo before continuing.",
    );
  }
}
const uid = () => newId();
function current(s: State) {
  const u = s.users.find((u) => u.id === s.selected && u.active);
  if (!u) throw new Error("Choose a demo role to continue");
  return u;
}
function log(s: State, action: string, entity: string) {
  s.audit.unshift({
    id: uid(),
    actor: current(s).name,
    action,
    entity,
    createdAt: new Date().toISOString(),
  });
  s.audit = s.audit.slice(0, 200);
}
function manage(s: State, q?: Quiz) {
  const u = current(s);
  if (u.role === "learner" || (q && u.role !== "admin" && q.createdBy !== u.id))
    throw new Error("You do not have permission to manage this quiz");
}
function admin(s: State) {
  if (current(s).role !== "admin")
    throw new Error("Administrator access required");
}
function finish(a: Attempt, reason: "submitted" | "expired") {
  const result = grade(a.questions as Question[], a.answers);
  Object.assign(a, result, {
    status: "completed",
    passed: result.score >= a.passPercent,
    reason,
    submittedAt: reason === "expired" ? a.deadline : new Date().toISOString(),
    version: a.version + 1,
  });
}
function expire(s: State) {
  let changed = false;
  for (const a of s.attempts)
    if (a.status === "in_progress" && Date.parse(a.deadline) <= Date.now()) {
      finish(a, "expired");
      changed = true;
    }
  if (changed) write(s);
}
function view(a: Attempt): Attempt {
  return structuredClone(
    a.status === "completed"
      ? a
      : {
          ...a,
          questions: a.questions.map(
            ({ correct: _c, explanation: _e, ...q }) => q,
          ),
        },
  );
}
function mine(s: State, id: string) {
  const a = s.attempts.find((a) => a.id === id);
  if (!a || a.userId !== current(s).id) throw new Error("Attempt not found");
  return a;
}
export function switchDemo(role: Role) {
  const s = read();
  s.selected = `demo-${role}`;
  write(s);
}
export function resetDemo() {
  localStorage.removeItem(key);
  location.href = "/";
}
export const demo: Service = {
  me: async () => {
    const s = read();
    const user = s.users.find((u) => u.id === s.selected && u.active);
    return user ? { user } : null;
  },
  login: async (email, _password) => {
    const s = read();
    const u = s.users.find((u) => u.email === email.toLowerCase() && u.active);
    if (!u) throw new Error("Use one of the demo roles below");
    s.selected = u.id;
    write(s);
    return { user: u };
  },
  register: async (name, email, password) => {
    const input = registerSchema.parse({ name, email, password });
    const s = read();
    if (!s.settings.registration) throw new Error("Registration is closed");
    if (s.users.some((u) => u.email === input.email))
      throw new Error("Email already exists");
    const u: User = {
      id: uid(),
      name: input.name,
      email: input.email,
      role: "learner",
      active: true,
      joinedAt: new Date().toISOString(),
    };
    s.users.push(u);
    s.selected = u.id;
    write(s);
    return { user: u };
  },
  logout: async () => {
    const s = read();
    s.selected = null;
    write(s);
  },
  quizzes: async (scope = false) => {
    const s = read();
    if (scope) manage(s);
    return s.quizzes
      .filter((q) =>
        scope
          ? current(s).role === "admin" || q.createdBy === current(s).id
          : q.status === "published",
      )
      .map((q) => catalog(q, scope));
  },
  saveQuiz: async (input, id, revision) => {
    const s = read(),
      data = quizInputSchema.parse(input),
      old = s.quizzes.find((q) => q.id === id);
    manage(s, old);
    if (id && !old) throw new Error("Quiz not found");
    if (old && old.revision !== revision)
      throw new Error("Quiz changed in another tab. Reload first.");
    const q: Quiz = {
      ...data,
      id: id || uid(),
      createdBy: old?.createdBy || current(s).id,
      revision: (old?.revision || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    s.quizzes = old
      ? s.quizzes.map((x) => (x.id === id ? q : x))
      : [q, ...s.quizzes];
    log(s, old ? "quiz.updated" : "quiz.created", q.title);
    write(s);
    return catalog(q, true);
  },
  start: async (id) => {
    const s = read();
    expire(s);
    const q = s.quizzes.find((q) => q.id === id && q.status === "published");
    if (!q) throw new Error("Quiz is not available");
    const prior = s.attempts.filter(
      (a) => a.userId === current(s).id && a.quizId === id,
    );
    const active = prior.find((a) => a.status === "in_progress");
    if (active) return view(active);
    if (prior.length >= q.maxAttempts)
      throw new Error("You have used all attempts for this quiz");
    const questions = structuredClone(q.questions);
    if (q.shuffle)
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    const a: Attempt = {
      id: uid(),
      userId: current(s).id,
      quizId: id,
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
      totalPoints: q.questions.reduce((n, q) => n + q.points, 0),
      passed: null,
      reason: null,
    };
    s.attempts.unshift(a);
    log(s, "attempt.started", q.title);
    write(s);
    return view(a);
  },
  attempts: async () => {
    const s = read();
    expire(s);
    return s.attempts
      .filter((a) => a.userId === current(s).id)
      .map(view)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
  attempt: async (id) => {
    const s = read();
    expire(s);
    return view(mine(s, id));
  },
  saveAttempt: async (id, answers, flagged, version, submit = false) => {
    const s = read();
    expire(s);
    const a = mine(s, id);
    if (a.status === "completed") return view(a);
    if (a.version !== version)
      throw new Error(
        "Attempt changed in another tab. Reload to continue safely.",
      );
    validateAnswers(a.questions as Question[], answers, flagged);
    a.answers = structuredClone(answers);
    a.flagged = [...new Set(flagged)];
    a.version++;
    if (submit) {
      finish(a, "submitted");
      log(s, "attempt.submitted", a.quizTitle);
    }
    write(s);
    return view(a);
  },
  leaders: async () => {
    const s = read();
    expire(s);
    return leaderboard(s.attempts, s.users);
  },
  reports: async () => {
    const s = read();
    manage(s);
    expire(s);
    const own = new Set(
      s.quizzes.filter((q) => q.createdBy === current(s).id).map((q) => q.id),
    );
    return s.attempts
      .filter(
        (a) =>
          a.status === "completed" &&
          (current(s).role === "admin" || own.has(a.quizId)),
      )
      .map((a) => ({
        ...view(a),
        userName: s.users.find((u) => u.id === a.userId)?.name,
      }));
  },
  users: async () => {
    const s = read();
    admin(s);
    return s.users;
  },
  createUser: async (name, email, password, role) => {
    const data = registerSchema.parse({ name, email, password }),
      s = read();
    admin(s);
    if (s.users.some((u) => u.email === data.email))
      throw new Error("Email already exists");
    const u: User = {
      id: uid(),
      name: data.name,
      email: data.email,
      role,
      active: true,
      joinedAt: new Date().toISOString(),
    };
    s.users.unshift(u);
    log(s, "user.created", u.email);
    write(s);
    return u;
  },
  updateUser: async (id, role, active) => {
    const s = read();
    admin(s);
    if (id === current(s).id)
      throw new Error("You cannot change your own access");
    const u = s.users.find((u) => u.id === id);
    if (!u) throw new Error("User not found");
    Object.assign(u, { role, active });
    log(s, "user.access.updated", u.email);
    write(s);
    return u;
  },
  audit: async () => {
    const s = read();
    admin(s);
    return s.audit;
  },
  settings: async () => read().settings,
  saveSettings: async (settings) => {
    const s = read();
    admin(s);
    if (settings.organization.trim().length < 2)
      throw new Error("Enter an organization name");
    s.settings = settings;
    log(s, "settings.updated", settings.organization);
    write(s);
    return settings;
  },
  profile: async (name) => {
    const data = profileSchema.parse({ name }),
      s = read(),
      u = current(s);
    u.name = data.name;
    write(s);
    return u;
  },
  password: async () => {
    throw new Error(
      "Passwords are available in connected mode. Demo roles have no secure credentials.",
    );
  },
};
