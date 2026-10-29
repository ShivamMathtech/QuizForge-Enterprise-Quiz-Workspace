import type {
  User,
  CatalogQuiz,
  QuizInput,
  Attempt,
  Answers,
  Leader,
  Audit,
  PlatformSettings,
  Role,
} from "../../shared/domain";
import { demo } from "./demo";
export type Session = { user: User; csrf?: string };
export interface Service {
  me(): Promise<Session | null>;
  login(email: string, password: string): Promise<Session>;
  register(name: string, email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  quizzes(manage?: boolean): Promise<CatalogQuiz[]>;
  saveQuiz(
    input: QuizInput,
    id?: string,
    revision?: number,
  ): Promise<CatalogQuiz>;
  start(id: string): Promise<Attempt>;
  attempts(): Promise<Attempt[]>;
  attempt(id: string): Promise<Attempt>;
  saveAttempt(
    id: string,
    answers: Answers,
    flagged: string[],
    version: number,
    submit?: boolean,
  ): Promise<Attempt>;
  leaders(): Promise<Leader[]>;
  reports(): Promise<Attempt[]>;
  users(): Promise<User[]>;
  createUser(
    name: string,
    email: string,
    password: string,
    role: Role,
  ): Promise<User>;
  updateUser(id: string, role: Role, active: boolean): Promise<User>;
  audit(): Promise<Audit[]>;
  settings(): Promise<PlatformSettings>;
  saveSettings(s: PlatformSettings): Promise<PlatformSettings>;
  profile(name: string): Promise<User>;
  password(currentPassword: string, newPassword: string): Promise<Session>;
}
function storedMode() {
  try {
    return sessionStorage.getItem("qf-mode");
  } catch {
    return null;
  }
}
export const mode =
  storedMode() === "demo"
    ? "demo"
    : import.meta.env.VITE_APP_MODE === "api"
      ? "api"
      : "demo";
export const configuredApi = import.meta.env.VITE_APP_MODE === "api";
let csrf = "";
const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      credentials: "include",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection, then try again. Your open quiz stays on this screen.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(
      "The API URL did not return JSON. Check VITE_API_URL and backend routing.",
      response.status,
    );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.message || "Request failed", response.status);
  if (data.csrf) csrf = data.csrf;
  return data as T;
}
const http: Service = {
  me: async () => {
    try {
      return await request<Session>("/auth/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: (email, password) =>
    request("/auth/login", "POST", { email, password }),
  register: (name, email, password) =>
    request("/auth/register", "POST", { name, email, password }),
  logout: async () => {
    await request("/auth/logout", "POST");
    csrf = "";
  },
  quizzes: (manage = false) =>
    request(`/quizzes${manage ? "?scope=manage" : ""}`),
  saveQuiz: (input, id, revision) =>
    request(`/quizzes${id ? `/${id}` : ""}`, id ? "PUT" : "POST", {
      ...input,
      ...(id ? { revision } : {}),
    }),
  start: (id) => request(`/quizzes/${id}/start`, "POST"),
  attempts: () => request("/attempts"),
  attempt: (id) => request(`/attempts/${id}`),
  saveAttempt: (id, answers, flagged, version, submit = false) =>
    request(`/attempts/${id}/${submit ? "submit" : "save"}`, "POST", {
      answers,
      flagged,
      version,
    }),
  leaders: () => request("/leaderboard"),
  reports: () => request("/reports"),
  users: () => request("/users"),
  createUser: (name, email, password, role) =>
    request("/users", "POST", { name, email, password, role }),
  updateUser: (id, role, active) =>
    request(`/users/${id}`, "PATCH", { role, active }),
  audit: () => request("/audit"),
  settings: () => request("/settings"),
  saveSettings: (s) => request("/settings", "PUT", s),
  profile: (name) => request("/profile", "PATCH", { name }),
  password: (currentPassword, newPassword) =>
    request("/profile/password", "POST", { currentPassword, newPassword }),
};
export const api: Service = mode === "demo" ? demo : http;
export const openDemo = () => {
  sessionStorage.setItem("qf-mode", "demo");
  location.href = "/";
};
export const openApi = () => {
  sessionStorage.removeItem("qf-mode");
  location.href = "/";
};
