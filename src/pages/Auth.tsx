import { useState } from "react";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { api, mode, openDemo } from "../lib/service";
import { switchDemo } from "../lib/demo";
import { useApp } from "../context";
import { ErrorBox } from "../components/ui";
import { errorMessage } from "../lib/utils";
import type { Role } from "../../shared/domain";
export function Auth() {
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { reload } = useApp();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) await api.register(name, email, password);
      else await api.login(email, password);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <section className="auth-story">
        <div className="brand light">
          <img src="/favicon.svg" alt="" />
          QuizForge
        </div>
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            Small challenges.
            <br />
            Extraordinary
            <br />
            <em>possibilities.</em>
          </h1>
          <p>
            A focused space to test your knowledge, celebrate your progress, and
            discover what you’re capable of.
          </p>
          <div className="auth-points">
            <span>
              <CheckCircle2 />
              Thoughtful assessments
            </span>
            <span>
              <CheckCircle2 />
              Progress you can see
            </span>
            <span>
              <CheckCircle2 />A workspace that grows with you
            </span>
          </div>
        </div>
        <small>LEARN. CHALLENGE. GROW.</small>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <BadgeLabel />
          <h2>{register ? "Create your account" : "Welcome back."}</h2>
          <p>
            {register
              ? "Make room for a little progress, every day."
              : "Your next breakthrough is waiting for you."}
          </p>
          {mode === "demo" ? (
            <div className="demo-entry">
              <p>Choose a role to explore the interactive demo.</p>
              {(["learner", "instructor", "admin"] as Role[]).map((role) => (
                <button
                  className="button"
                  key={role}
                  onClick={async () => {
                    switchDemo(role);
                    await reload();
                  }}
                >
                  Continue as {role}
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <form onSubmit={submit}>
                <ErrorBox message={error} />
                {register && (
                  <label>
                    Full name
                    <input
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={register ? 12 : 1}
                    maxLength={128}
                    placeholder={
                      register
                        ? "At least 12 characters"
                        : "Enter your password"
                    }
                  />
                </label>
                <button className="button primary full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : register
                      ? "Create account"
                      : "Sign in to workspace"}
                  <ArrowRight size={18} />
                </button>
              </form>
              <p className="auth-toggle">
                {register ? "Already have an account?" : "New to QuizForge?"}{" "}
                <button
                  className="text-button"
                  onClick={() => {
                    setRegister(!register);
                    setError("");
                  }}
                >
                  {register ? "Sign in" : "Create an account"}
                </button>
              </p>
              <div className="divider">
                <span>OR EXPLORE FIRST</span>
              </div>
              <button className="button full" onClick={openDemo}>
                Open the interactive demo
              </button>
              <small className="muted">
                No account needed. Sample data stays in your browser.
              </small>
            </>
          )}
          <div className="auth-security">
            <ShieldCheck size={16} />A focused, secure learning workspace
          </div>
        </div>
      </section>
    </div>
  );
}
function BadgeLabel() {
  return (
    <div className="auth-logo-mark">
      Q<span>✦</span>
    </div>
  );
}
