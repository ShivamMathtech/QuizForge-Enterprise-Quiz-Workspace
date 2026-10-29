import { useEffect, useState } from "react";
import {
  Download,
  Users,
  Plus,
  ShieldCheck,
  Save,
  RotateCcw,
  UserRound,
  KeyRound,
  Building2,
  Wifi,
  FlaskConical,
  Search,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../context";
import { api, mode, openApi, configuredApi } from "../lib/service";
import { resetDemo } from "../lib/demo";
import {
  date,
  errorMessage,
  exportAttempts,
  average,
  initials,
} from "../lib/utils";
import {
  PageTitle,
  Badge,
  SearchBox,
  Spinner,
  ErrorBox,
  Empty,
  Modal,
  Progress,
} from "../components/ui";
import { AttemptTable } from "./Learning";
import type {
  Attempt,
  User,
  Role,
  Audit,
  PlatformSettings,
} from "../../shared/domain";
export function Analytics() {
  const [data, setData] = useState<Attempt[] | null>(null),
    [error, setError] = useState(""),
    [quiz, setQuiz] = useState("all"),
    [period, setPeriod] = useState("all");
  useEffect(() => {
    api
      .reports()
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const list = (data || []).filter(
    (a) =>
      (quiz === "all" || a.quizId === quiz) &&
      (period === "all" ||
        Date.parse(a.submittedAt!) >= Date.now() - Number(period) * 86400000),
  );
  const passed = list.filter((a) => a.passed).length;
  const quizzes = [
    ...new Map((data || []).map((a) => [a.quizId, a.quizTitle])).entries(),
  ];
  const categories = [...new Set(list.map((a) => a.category))];
  return (
    <>
      <PageTitle
        title="See the bigger learning picture."
        description="Understand performance, spot patterns, and support the next step."
      >
        <button
          className="button"
          disabled={!list.length}
          onClick={() => exportAttempts(list)}
        >
          <Download size={16} />
          Export report
        </button>
      </PageTitle>
      <ErrorBox message={error} />
      <div className="filter-toolbar report-filters">
        <label>
          Assessment
          <select value={quiz} onChange={(e) => setQuiz(e.target.value)}>
            <option value="all">All your assessments</option>
            {quizzes.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      {data ? (
        <>
          <div className="stats-grid">
            {[
              { label: "Completed attempts", value: list.length },
              {
                label: "Participating learners",
                value: new Set(list.map((a) => a.userId)).size,
              },
              { label: "Average score", value: `${average(list)}%` },
              {
                label: "Pass rate",
                value: `${list.length ? Math.round((passed / list.length) * 100) : 0}%`,
              },
            ].map((s) => (
              <div className="stat-card analytics-stat" key={s.label}>
                <span className="stat-label">{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-panels">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Performance by topic</h2>
                  <p>Average percentage across completed attempts</p>
                </div>
                <TrendingUp size={20} />
              </div>
              {categories.map((c) => {
                const a = list.filter((a) => a.category === c);
                return (
                  <div className="category-performance" key={c}>
                    <div className="between">
                      <strong>{c}</strong>
                      <span>{average(a)}%</span>
                    </div>
                    <Progress value={average(a)} />
                    <small>{a.length} attempts</small>
                  </div>
                );
              })}
              {!categories.length && (
                <p className="muted">
                  No completed attempts match these filters.
                </p>
              )}
            </section>
            <section className="panel">
              <h2>Score distribution</h2>
              <p className="muted">Where your learners are today</p>
              <div className="distribution">
                {[
                  [0, 39],
                  [40, 59],
                  [60, 79],
                  [80, 100],
                ].map(([low, high]) => {
                  const count = list.filter(
                    (a) => (a.score || 0) >= low && (a.score || 0) <= high,
                  ).length;
                  return (
                    <div key={low}>
                      <span>
                        {low}–{high}%
                      </span>
                      <div>
                        <i
                          style={{
                            width: `${list.length ? (count / list.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="info-box">
                Retakes appear as separate attempts in this report. Leaderboard
                points use each learner’s best score per quiz.
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="section-heading">
              <h2>Attempt report</h2>
              <Badge>{list.length} records</Badge>
            </div>
            <AttemptTable attempts={list} report />
          </section>
        </>
      ) : (
        !error && <Spinner />
      )}
    </>
  );
}
export function UserManagement() {
  const { user, notify } = useApp();
  const [users, setUsers] = useState<User[] | null>(null),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<User | null>(null);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState<Role>("learner"),
    [active, setActive] = useState(true);
  const load = () =>
    api
      .users()
      .then(setUsers)
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (edit) await api.updateUser(edit.id, role, active);
      else await api.createUser(name, email, password, role);
      await load();
      setOpen(false);
      notify(
        edit
          ? "Access updated. Existing sessions were revoked."
          : "User created. Share credentials through a secure channel.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const visible = (users || []).filter((u) =>
    `${u.name} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Good learning starts with people."
        description="Manage your workspace members and give everyone the right access."
      >
        <button
          className="button primary"
          onClick={() => {
            setEdit(null);
            setName("");
            setEmail("");
            setPassword("");
            setRole("learner");
            setActive(true);
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Add member
        </button>
      </PageTitle>
      {!open && <ErrorBox message={error} />}
      <div className="compact-stats">
        {[
          { label: "Total members", value: users?.length || 0 },
          {
            label: "Active learners",
            value:
              users?.filter((u) => u.role === "learner" && u.active).length ||
              0,
          },
          {
            label: "Instructors & admins",
            value:
              users?.filter((u) => u.role !== "learner" && u.active).length ||
              0,
          },
        ].map((s) => (
          <div className="panel" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="filter-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, or role…"
          />
          <Badge>{visible.length} members</Badge>
        </div>
        {!users && !error ? (
          <Spinner />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar">{initials(u.name)}</span>
                        <div>
                          <strong>
                            {u.name}
                            {u.id === user!.id ? " (you)" : ""}
                          </strong>
                          <small>{u.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          u.role === "admin"
                            ? "purple"
                            : u.role === "instructor"
                              ? "blue"
                              : "gray"
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={u.active ? "green" : "gray"}>
                        {u.active ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    <td>{date(u.joinedAt)}</td>
                    <td>
                      <button
                        className="text-button"
                        disabled={u.id === user!.id}
                        onClick={() => {
                          setEdit(u);
                          setRole(u.role);
                          setActive(u.active);
                          setError("");
                          setOpen(true);
                        }}
                      >
                        Manage access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <Empty
                title="No members found"
                description="Try a different search, or add a workspace member."
              />
            )}
          </div>
        )}
      </section>
      {open && (
        <Modal
          title={edit ? `Manage ${edit.name}` : "Add a workspace member"}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form className="modal-form" onSubmit={submit}>
            <ErrorBox message={error} />
            {!edit && (
              <>
                <label>
                  Full name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    required
                  />
                </label>
                <label>
                  Initial password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <small>
                    At least 12 characters. The user can change this in
                    Settings.
                  </small>
                </label>
              </>
            )}
            <label>
              Workspace role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="learner">
                  Learner — take quizzes and view own results
                </option>
                <option value="instructor">
                  Instructor — manage own quizzes and reports
                </option>
                <option value="admin">
                  Admin — manage the whole workspace
                </option>
              </select>
            </label>
            {edit && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>
                  Active account
                  <small>
                    Changing access signs this user out of all sessions.
                  </small>
                </span>
              </label>
            )}
            <div className="info-box">
              {mode === "demo"
                ? "This is a browser demo. User records are illustrative; passwords are not stored."
                : "New accounts are created immediately. No invitation email is sent."}
            </div>
            <button className="button primary full" disabled={busy}>
              {busy ? "Saving…" : edit ? "Save access" : "Create member"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function AuditPage() {
  const [events, setEvents] = useState<Audit[] | null>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const load = () =>
    api
      .audit()
      .then(setEvents)
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    void load();
  }, []);
  const visible = (events || []).filter((e) =>
    `${e.actor} ${e.action} ${e.entity}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="A clear record of what changed."
        description="Review the latest 200 recorded actions in your workspace."
      >
        <button className="button" onClick={() => void load()}>
          <RotateCcw size={16} />
          Refresh log
        </button>
      </PageTitle>
      <ErrorBox message={error} />
      <section className="panel">
        <div className="filter-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search actors, actions, or records…"
          />
          <Badge tone="green">
            <ShieldCheck size={13} />
            Recorded activity
          </Badge>
        </div>
        {!events && !error ? (
          <Spinner />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>
                      <strong>{e.actor}</strong>
                    </td>
                    <td>
                      <code>{e.action}</code>
                    </td>
                    <td>{e.entity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <Empty
                title="No matching activity"
                description="Changes to quizzes, users, and attempts appear here."
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { user, settings, reload, setUser, notify } = useApp();
  const [name, setName] = useState(user!.name),
    [workspace, setWorkspace] = useState<PlatformSettings>(settings),
    [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function save(which: string, fn: () => Promise<unknown>) {
    setBusy(which);
    setError("");
    try {
      await fn();
      notify("Your changes have been saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        title="Make this space your own."
        description="Manage your profile, security, and workspace preferences."
      />
      <ErrorBox message={error} />
      <div className="settings-grid">
        <section className="panel form-panel">
          <div className="section-heading">
            <div className="settings-title">
              <UserRound size={21} />
              <h2>Your profile</h2>
            </div>
            <Badge>{user!.role}</Badge>
          </div>
          <div className="profile-summary">
            <span className="avatar large">{initials(user!.name)}</span>
            <div>
              <strong>{user!.name}</strong>
              <p>{user!.email}</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save("profile", async () => {
                setUser(await api.profile(name));
                await reload();
              });
            }}
          >
            <label>
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label>
              Email address
              <input value={user!.email} disabled />
            </label>
            <button className="button primary" disabled={!!busy}>
              <Save size={16} />
              {busy === "profile" ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>
        <section className="panel form-panel">
          <div className="settings-title">
            <KeyRound size={21} />
            <h2>Account security</h2>
          </div>
          {mode === "demo" ? (
            <div className="info-box">
              <h3>You’re exploring the demo.</h3>
              <p>
                Demo roles have no secure credentials. In connected mode,
                passwords are hashed on the server, and sessions use secure
                HTTP-only cookies when deployed with HTTPS.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save("password", async () => {
                  await api.password(currentPassword, newPassword);
                  setCurrentPassword("");
                  setNewPassword("");
                });
              }}
            >
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
                <small>
                  At least 12 characters. Other sessions are signed out.
                </small>
              </label>
              <button className="button primary" disabled={!!busy}>
                {busy === "password" ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </section>
        {user!.role === "admin" && (
          <section className="panel form-panel">
            <div className="settings-title">
              <Building2 size={21} />
              <h2>Workspace settings</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save("workspace", async () => {
                  setWorkspace(await api.saveSettings(workspace));
                  await reload();
                });
              }}
            >
              <label>
                Organization name
                <input
                  value={workspace.organization}
                  minLength={2}
                  maxLength={80}
                  onChange={(e) =>
                    setWorkspace((s) => ({
                      ...s,
                      organization: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={workspace.registration}
                  onChange={(e) =>
                    setWorkspace((s) => ({
                      ...s,
                      registration: e.target.checked,
                    }))
                  }
                />
                <span>
                  Allow self-registration
                  <small>
                    New accounts always join as learners. The server may also
                    disable registration through configuration.
                  </small>
                </span>
              </label>
              <button className="button primary" disabled={!!busy}>
                <Save size={16} />
                Save workspace
              </button>
            </form>
          </section>
        )}
        <section className="panel form-panel">
          <div className="settings-title">
            {mode === "demo" ? <FlaskConical size={21} /> : <Wifi size={21} />}
            <h2>{mode === "demo" ? "Demo workspace" : "Connection status"}</h2>
          </div>
          <Badge tone={mode === "demo" ? "orange" : "green"}>
            {mode === "demo" ? "Browser demo active" : "Backend connected"}
          </Badge>
          <p>
            {mode === "demo"
              ? "Quizzes, attempts, and profile changes stay in this browser. Resetting restores the original sample workspace and removes your demo changes."
              : "Your account, quizzes, and results are stored by the server. Access is controlled by your assigned role."}
          </p>
          {mode === "demo" && (
            <>
              <button
                className="button danger-outline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset all demo quizzes, results, and profile changes in this browser? This cannot be undone.",
                    )
                  )
                    resetDemo();
                }}
              >
                <RotateCcw size={16} />
                Reset demo workspace
              </button>
              {configuredApi && (
                <button className="button" onClick={openApi}>
                  <Wifi size={16} />
                  Return to connected mode
                </button>
              )}
            </>
          )}
          <div className="version-label">
            QuizForge 1.0.0 · Single workspace edition
          </div>
        </section>
      </div>
    </>
  );
}
