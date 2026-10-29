import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  User,
  CatalogQuiz,
  Attempt,
  PlatformSettings,
} from "../shared/domain";
import { api } from "./lib/service";
import { errorMessage } from "./lib/utils";
type AppState = {
  user: User | null;
  quizzes: CatalogQuiz[];
  managed: CatalogQuiz[];
  attempts: Attempt[];
  settings: PlatformSettings;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  notify: (message: string) => void;
  setUser: (u: User | null) => void;
};
const Ctx = createContext<AppState>(null!);
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [quizzes, setQuizzes] = useState<CatalogQuiz[]>([]),
    [managed, setManaged] = useState<CatalogQuiz[]>([]),
    [attempts, setAttempts] = useState<Attempt[]>([]),
    [settings, setSettings] = useState<PlatformSettings>({
      organization: "QuizForge Workspace",
      registration: true,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const reload = useCallback(async () => {
    setError("");
    try {
      const session = await api.me();
      setUser(session?.user ?? null);
      if (session) {
        const [q, a, s, m] = await Promise.all([
          api.quizzes(),
          api.attempts(),
          api.settings(),
          session.user.role === "learner"
            ? Promise.resolve([])
            : api.quizzes(true),
        ]);
        setQuizzes(q);
        setAttempts(a);
        setSettings(s);
        setManaged(m);
      } else {
        setQuizzes([]);
        setManaged([]);
        setAttempts([]);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  return (
    <Ctx.Provider
      value={{
        user,
        quizzes,
        managed,
        attempts,
        settings,
        loading,
        error,
        reload,
        notify: setToast,
        setUser,
      }}
    >
      {children}
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);
