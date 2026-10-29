import { useState, useEffect } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  BarChart3,
  Trophy,
  FileQuestion,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  CircleHelp,
  ChevronRight,
  BookOpen,
  ArrowUpRight,
  Wifi,
  FlaskConical,
} from "lucide-react";
import { useApp } from "./context";
import { api, mode, openDemo, openApi, configuredApi } from "./lib/service";
import { switchDemo } from "./lib/demo";
import { initials, errorMessage, date } from "./lib/utils";
import { Spinner, ErrorBox, Modal, Badge } from "./components/ui";
import { Dashboard, Explore, Results, Result, Leaders } from "./pages/Learning";
import { Player } from "./pages/Player";
import {
  Manage,
  Builder,
  Bank,
  Analytics,
  UserManagement,
  AuditPage,
  SettingsPage,
} from "./pages/Management";
import { Auth } from "./pages/Auth";
import type { Role } from "../shared/domain";
const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/explore", label: "Explore quizzes", icon: Compass },
  { to: "/results", label: "My results", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];
const staffLinks = [
  { to: "/manage", label: "Manage quizzes", icon: FileQuestion },
  { to: "/bank", label: "Question bank", icon: BookOpen },
  { to: "/analytics", label: "Analytics & reports", icon: BarChart3 },
];
export default function App() {
  const { user, loading, error, reload, notify, attempts, settings } = useApp();
  const loc = useLocation(),
    nav = useNavigate();
  const [mobile, setMobile] = useState(false),
    [help, setHelp] = useState(false),
    [notifications, setNotifications] = useState(false),
    [search, setSearch] = useState("");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  if (loading) return <Spinner />;
  if (error)
    return (
      <div className="connection-screen">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          QuizForge<span>workspace</span>
        </div>
        <h1>Your workspace is temporarily unavailable.</h1>
        <ErrorBox message={error} />
        <div className="button-row">
          <button className="button primary" onClick={() => void reload()}>
            Try again
          </button>
          {mode === "api" && (
            <button className="button" onClick={openDemo}>
              Explore the browser demo
            </button>
          )}
        </div>
        <p>
          Demo data stays in your browser and is separate from connected
          accounts.
        </p>
      </div>
    );
  if (!user) return <Auth />;
  if (loc.pathname.startsWith("/play/"))
    return (
      <Routes>
        <Route path="/play/:id" element={<Player />} />
      </Routes>
    );
  const staff = user.role !== "learner";
  const allLinks = [
    ...links,
    ...staffLinks,
    { to: "/users", label: "People & access" },
    { to: "/audit", label: "Audit log" },
    { to: "/settings", label: "Settings" },
  ];
  const current =
    allLinks.find((l) =>
      l.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(l.to),
    )?.label ||
    (loc.pathname.startsWith("/builder") ? "Quiz builder" : "Quiz results");
  async function signout() {
    try {
      await api.logout();
      await reload();
      nav("/");
    } catch (e) {
      notify(errorMessage(e));
    }
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setMobile(false)}>
          <img src="/favicon.svg" alt="" />
          QuizForge<span>WORKSPACE</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace-picker">
          <span className="workspace-letter">{settings.organization[0]}</span>
          <div>
            <strong>{settings.organization}</strong>
            <small>Learning workspace</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <div className="nav-label">LEARN & GROW</div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              onClick={() => setMobile(false)}
            >
              <l.icon size={19} />
              {l.label}
              {l.to === "/explore" && <span className="new-dot" />}
            </NavLink>
          ))}
        </nav>
        {staff && (
          <>
            <div className="nav-label">WORKSPACE TOOLS</div>
            <nav>
              {staffLinks.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobile(false)}>
                  <l.icon size={19} />
                  {l.label}
                </NavLink>
              ))}
              {user.role === "admin" && (
                <>
                  <NavLink to="/users" onClick={() => setMobile(false)}>
                    <Users size={19} />
                    People & access
                  </NavLink>
                  <NavLink to="/audit" onClick={() => setMobile(false)}>
                    <ShieldCheck size={19} />
                    Audit log
                  </NavLink>
                </>
              )}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon">✦</div>
            <strong>A little progress, every day.</strong>
            <p>Your next breakthrough starts with one question.</p>
            <Link to="/explore" onClick={() => setMobile(false)}>
              Find your next challenge <ArrowUpRight size={15} />
            </Link>
          </div>
          <nav>
            <NavLink to="/settings" onClick={() => setMobile(false)}>
              <Settings size={19} />
              Settings
            </NavLink>
            <button onClick={() => setHelp(true)}>
              <CircleHelp size={19} />
              Help & getting started
            </button>
          </nav>
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => void signout()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{current}</strong>
          </div>
          <div className="top-actions">
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                nav(`/explore?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a quiz…"
                aria-label="Find a quiz"
              />
              <kbd>↵</kbd>
            </form>
            <button
              className="notification-button icon-button"
              aria-label="View notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {attempts.length > 0 && <i />}
            </button>
            <Link
              to="/settings"
              className="avatar small"
              aria-label="Your profile"
            >
              {initials(user.name)}
            </Link>
          </div>
        </header>
        <div className={`mode-bar ${mode}`}>
          <span>
            {mode === "demo" ? <FlaskConical size={14} /> : <Wifi size={14} />}
            <strong>
              {mode === "demo" ? "Interactive demo" : "Connected workspace"}
            </strong>
            <span className="mode-detail">
              {mode === "demo"
                ? "Sample data · changes saved in this browser"
                : "Secure accounts · server-verified results"}
            </span>
          </span>
          {mode === "demo" ? (
            <div className="mode-switch">
              <label htmlFor="role-switch">Experience as</label>
              <select
                id="role-switch"
                value={user.role}
                onChange={async (e) => {
                  switchDemo(e.target.value as Role);
                  await reload();
                  nav("/");
                }}
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
              {configuredApi && (
                <button onClick={openApi} className="text-button">
                  Reconnect
                </button>
              )}
            </div>
          ) : (
            <Badge tone="green">{user.role}</Badge>
          )}
        </div>
        <main className="main-content" id="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:id" element={<Result />} />
            <Route path="/leaderboard" element={<Leaders />} />
            <Route
              path="/manage"
              element={staff ? <Manage /> : <Navigate to="/" />}
            />
            <Route
              path="/builder/:id"
              element={staff ? <Builder /> : <Navigate to="/" />}
            />
            <Route
              path="/bank"
              element={staff ? <Bank /> : <Navigate to="/" />}
            />
            <Route
              path="/analytics"
              element={staff ? <Analytics /> : <Navigate to="/" />}
            />
            <Route
              path="/users"
              element={
                user.role === "admin" ? <UserManagement /> : <Navigate to="/" />
              }
            />
            <Route
              path="/audit"
              element={
                user.role === "admin" ? <AuditPage /> : <Navigate to="/" />
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link className="button primary" to="/">
                    Back to overview
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} QuizForge</span>
          <span>Learn with purpose. Grow with confidence.</span>
        </footer>
      </div>
      {help && (
        <Modal title="Welcome to QuizForge" onClose={() => setHelp(false)}>
          <div className="help-content">
            <h3>Start with a challenge</h3>
            <p>
              Explore a quiz, read the instructions, and start your timed
              attempt. Answers save as you work. You can flag questions, move
              between them, and review before submitting.
            </p>
            <h3>Build your own assessments</h3>
            <p>
              Switch to Instructor or Admin in the demo to create quizzes, add
              questions, configure scoring, and publish. Admins can also manage
              access and workspace settings.
            </p>
            <h3>Your data, clearly separated</h3>
            <p>
              Demo data lives in this browser and can be reset in Settings.
              Connected mode uses a real backend with authentication and
              server-side scoring. Demo results are practice only.
            </p>
            <h3>Keyboard friendly</h3>
            <p>
              Use Tab to move between controls and Enter or Space to activate
              them. All quiz options and navigation buttons are keyboard
              accessible.
            </p>
            <button className="button primary" onClick={() => setHelp(false)}>
              Let’s get started
            </button>
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal title="Your activity" onClose={() => setNotifications(false)}>
          <div className="help-content">
            {attempts.slice(0, 5).map((a) => (
              <Link
                className="notification-item"
                key={a.id}
                to={
                  a.status === "completed"
                    ? `/results/${a.id}`
                    : `/play/${a.id}`
                }
                onClick={() => setNotifications(false)}
              >
                <span className="activity-icon">
                  <FileQuestion size={20} />
                </span>
                <div>
                  <strong>{a.quizTitle}</strong>
                  <p>
                    {a.status === "completed"
                      ? `Completed · ${a.score}%`
                      : "In progress"}{" "}
                    · {date(a.startedAt)}
                  </p>
                </div>
                <ChevronRight size={16} />
              </Link>
            ))}
            {!attempts.length && (
              <p>Your quiz activity will appear here once you begin.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
