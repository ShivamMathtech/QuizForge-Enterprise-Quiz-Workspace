import { useEffect, useState, useMemo } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Trophy,
  Target,
  TrendingUp,
  Download,
  SlidersHorizontal,
  Flag,
  Printer,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { useApp } from "../context";
import { api, mode } from "../lib/service";
import {
  average,
  date,
  errorMessage,
  exportAttempts,
  initials,
} from "../lib/utils";
import {
  PageTitle,
  Badge,
  QuizCard,
  SearchBox,
  Modal,
  ErrorBox,
  Spinner,
  Empty,
  Progress,
  CategoryIcon,
} from "../components/ui";
import type { CatalogQuiz, Attempt, Leader } from "../../shared/domain";

function useStart() {
  const [selected, setSelected] = useState<CatalogQuiz | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const { attempts } = useApp();
  const used = selected ? attempts.filter((a) => a.quizId === selected.id) : [];
  const active = used.find((a) => a.status === "in_progress");
  const start = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const a = await api.start(selected.id);
      navigate(`/play/${a.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const dialog = selected && (
    <Modal
      title="Ready for your next challenge?"
      onClose={() => {
        if (!busy) setSelected(null);
      }}
    >
      <div className="quiz-intro">
        <div className="intro-icon">
          <CategoryIcon category={selected.category} size={32} />
        </div>
        <Badge>{selected.category}</Badge>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
        <div className="intro-stats">
          <div>
            <BookOpen />
            <strong>{selected.questionCount}</strong>
            <span>Questions</span>
          </div>
          <div>
            <Clock3 />
            <strong>{selected.duration} min</strong>
            <span>Time limit</span>
          </div>
          <div>
            <Target />
            <strong>{selected.passPercent}%</strong>
            <span>Passing score</span>
          </div>
        </div>
        <div className="info-box">
          <strong>Before you begin</strong>
          <ul>
            <li>
              The timer starts immediately and keeps running if you leave.
            </li>
            <li>Answers are saved automatically. Check the save indicator.</li>
            <li>
              Multiple-choice questions require all correct options; no partial
              credit.
            </li>
            <li>
              You have used {used.length} of {selected.maxAttempts} attempts.
              {active ? " An unfinished attempt will resume." : ""}
            </li>
          </ul>
        </div>
        <ErrorBox message={error} />
        <button
          className="button primary full"
          disabled={busy || (!active && used.length >= selected.maxAttempts)}
          onClick={() => void start()}
        >
          {busy
            ? "Preparing your quiz…"
            : active
              ? "Resume your attempt"
              : "Start quiz"}
          <ArrowRight size={18} />
        </button>
        {mode === "demo" && (
          <small className="muted">
            Practice demo · results are stored in this browser
          </small>
        )}
      </div>
    </Modal>
  );
  return {
    start: (q: CatalogQuiz) => {
      setError("");
      setSelected(q);
    },
    dialog,
  };
}
export function Dashboard() {
  const { user, quizzes, attempts } = useApp();
  const { start, dialog } = useStart();
  const completed = attempts.filter((a) => a.status === "completed"),
    active = attempts.filter((a) => a.status === "in_progress");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  useEffect(() => {
    api
      .leaders()
      .then(setLeaders)
      .catch(() => {});
  }, []);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const sevenDays = weekStart.getTime();
  const weekly = completed.filter(
    (a) => Date.parse(a.submittedAt!) >= sevenDays,
  ).length;
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      count: completed.filter(
        (a) => new Date(a.submittedAt!).toDateString() === day.toDateString(),
      ).length,
    };
  });
  const max = Math.max(2, ...week.map((d) => d.count));
  return (
    <>
      <PageTitle
        eyebrow="MAKE TODAY COUNT"
        title={`Welcome back, ${user!.name.split(" ")[0]} 👋`}
        description="A little curiosity today. A lot more confidence tomorrow."
      >
        <Link className="button" to="/results">
          <CalendarDays size={16} />
          My learning activity
        </Link>
      </PageTitle>
      <div className="dashboard-top">
        <section className="hero-card">
          <div className="hero-copy">
            <span className="hero-badge">
              <Sparkles size={13} />
              THE NEXT STEP IS YOURS
            </span>
            <h2>
              Big ideas start with
              <br />a little challenge.
            </h2>
            <p>
              Put your knowledge to work. Discover something new.
              <br className="desktop-only" /> Find the quiz that moves you
              forward.
            </p>
            <Link className="button white" to="/explore">
              Explore quizzes <ArrowRight size={17} />
            </Link>
            <div className="hero-foot">
              <span className="mini-faces">
                <i>JS</i>
                <i>UI</i>
                <i>CS</i>
              </span>
              <span>
                {quizzes.length} curated challenges. Endless possibilities.
              </span>
            </div>
          </div>
          <div className="hero-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-dot dot-one" />
            <div className="floating-dot dot-two" />
            <div className="float-card card-a">
              <CheckCircle2 size={22} />
              <span>
                One step
                <br />
                <b>closer.</b>
              </span>
            </div>
            <div className="trophy-block">
              <Trophy size={77} strokeWidth={1.5} />
              <span>YOU’VE GOT THIS</span>
            </div>
            <div className="float-card card-b">
              <TrendingUp size={24} />
              <span>
                Keep
                <br />
                <b>growing.</b>
              </span>
            </div>
            <span className="hero-star">✦</span>
          </div>
        </section>
        <section className="panel weekly-goal">
          <div className="between">
            <span className="section-kicker">YOUR WEEKLY GOAL</span>
            <Target size={19} />
          </div>
          <div
            className="goal-ring"
            style={
              {
                "--progress": `${Math.min(weekly / 5, 1) * 360}deg`,
              } as React.CSSProperties
            }
          >
            <div>
              <strong>
                {weekly}
                <small>/5</small>
              </strong>
              <span>quizzes completed</span>
            </div>
          </div>
          <h3>
            {weekly >= 5
              ? "Goal complete. Great work!"
              : "Consistency looks good on you."}
          </h3>
          <p>
            {weekly >= 5
              ? "You made room for learning this week."
              : `${Math.max(0, 5 - weekly)} more ${5 - weekly === 1 ? "quiz" : "quizzes"} to reach your weekly goal.`}
          </p>
          <Link className="text-button" to="/explore">
            Keep the momentum <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Quizzes completed",
            value: completed.length,
            sub: "Every attempt is progress",
            icon: BookOpen,
            tone: "purple",
          },
          {
            label: "Average score",
            value: `${average(completed)}%`,
            sub: "Across completed attempts",
            icon: Target,
            tone: "green",
          },
          {
            label: "Personal best",
            value: `${Math.max(0, ...completed.map((a) => a.score || 0))}%`,
            sub: "Your highest quiz score",
            icon: Trophy,
            tone: "orange",
          },
          {
            label: "Quizzes passed",
            value: new Set(
              completed.filter((a) => a.passed).map((a) => a.quizId),
            ).size,
            sub: "Unique challenges mastered",
            icon: CheckCircle2,
            tone: "blue",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span className={`stat-icon ${s.tone}`}>
              <s.icon size={20} />
            </span>
            <span className="stat-label">{s.label}</span>
            <strong>{s.value}</strong>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>
      {!!active.length && (
        <div className="resume-banner">
          <span className="activity-icon">
            <Clock3 />
          </span>
          <div>
            <strong>You have an unfinished challenge.</strong>
            <p>{active[0].quizTitle} · Your timer is still running.</p>
          </div>
          <Link className="button primary" to={`/play/${active[0].id}`}>
            Resume quiz
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="dashboard-columns">
        <div>
          <div className="section-heading">
            <div>
              <h2>Picked for your next step</h2>
              <p>A fresh challenge. A new perspective.</p>
            </div>
            <Link className="text-button" to="/explore">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="quiz-grid two">
            {quizzes.slice(0, 2).map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                onStart={start}
                completed={completed.some((a) => a.quizId === q.id)}
              />
            ))}
          </div>
          {!quizzes.length && (
            <Empty
              title="Your first quiz is on the way"
              description="Published quizzes will appear here."
            />
          )}
          <section className="panel activity-panel">
            <div className="section-heading">
              <div>
                <h2>Your learning rhythm</h2>
                <p>Completed quizzes over the past seven days</p>
              </div>
              <Badge tone="green">{weekly} this week</Badge>
            </div>
            <div className="bar-chart" aria-label="Completed quizzes per day">
              {week.map((d, i) => (
                <div className="bar-column" key={i}>
                  <div className="bar-track">
                    <div
                      className={i === 6 ? "bar today" : "bar"}
                      style={{
                        height: `${Math.max(3, (d.count / max) * 100)}%`,
                      }}
                      title={`${d.label}: ${d.count} quizzes`}
                    >
                      <span>{d.count}</span>
                    </div>
                  </div>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="right-rail">
          <section className="panel">
            <div className="section-heading">
              <h2>Recent activity</h2>
              <Link
                to="/results"
                className="icon-button"
                aria-label="All results"
              >
                <ArrowUpRight size={19} />
              </Link>
            </div>
            {completed.slice(0, 3).map((a) => (
              <Link className="activity-row" to={`/results/${a.id}`} key={a.id}>
                <span className="activity-icon">
                  <CategoryIcon category={a.category} size={19} />
                </span>
                <div>
                  <strong>{a.quizTitle}</strong>
                  <small>{date(a.submittedAt!)}</small>
                </div>
                <Badge tone={a.passed ? "green" : "orange"}>{a.score}%</Badge>
              </Link>
            ))}
            {!completed.length && (
              <p className="muted">Complete a quiz to see your first result.</p>
            )}
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Top learners</h2>
              <Trophy size={18} color="#c28b30" />
            </div>
            <p className="muted small-text">
              Best score per quiz. Every challenge counts.
            </p>
            {leaders.slice(0, 3).map((l, i) => (
              <div className="leader-mini" key={l.id}>
                <span className="rank">0{i + 1}</span>
                <span className={`avatar tone-${i}`}>{initials(l.name)}</span>
                <div>
                  <strong>{l.name}</strong>
                  <small>{l.quizzes} quizzes completed</small>
                </div>
                <b>
                  {l.points.toLocaleString()}
                  <small> pts</small>
                </b>
              </div>
            ))}
            {!leaders.length && (
              <p className="muted">
                The first completed quiz starts the leaderboard.
              </p>
            )}
            <Link className="rail-link" to="/leaderboard">
              View leaderboard
              <ChevronRight size={16} />
            </Link>
          </section>
          <div className="daily-note">
            <span>✦ A THOUGHT TO TAKE WITH YOU</span>
            <blockquote>
              “The beautiful thing about learning is that nobody can take it
              away from you.”
            </blockquote>
            <small>— B. B. King</small>
          </div>
        </div>
      </div>
      {dialog}
    </>
  );
}
export function Explore() {
  const { quizzes, attempts } = useApp();
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState("All topics"),
    [difficulty, setDifficulty] = useState("All levels"),
    [sort, setSort] = useState("recommended");
  const { start, dialog } = useStart();
  const search = params.get("q") || "";
  const filtered = useMemo(
    () =>
      quizzes
        .filter(
          (q) =>
            (category === "All topics" || q.category === category) &&
            (difficulty === "All levels" || q.difficulty === difficulty) &&
            `${q.title} ${q.description} ${q.category}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "shortest"
            ? a.duration - b.duration
            : sort === "title"
              ? a.title.localeCompare(b.title)
              : Number(b.featured) - Number(a.featured),
        ),
    [quizzes, search, category, difficulty, sort],
  );
  return (
    <>
      <PageTitle
        eyebrow="CURIOSITY LOOKS GOOD ON YOU"
        title="Find your next challenge."
        description="Explore a topic you love, or take your first step into something new."
      />
      <div className="explore-banner">
        <span className="explore-badge">
          <CompassIcon />
        </span>
        <div>
          <h3>A world of knowledge. One question at a time.</h3>
          <p>
            {quizzes.length} published quizzes across{" "}
            {new Set(quizzes.map((q) => q.category)).size} topics. Find your
            starting point.
          </p>
        </div>
        <Sparkles size={31} />
      </div>
      <div className="filter-tabs">
        {["All topics", ...new Set(quizzes.map((q) => q.category))].map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
            {c === "All topics" && <span>{quizzes.length}</span>}
          </button>
        ))}
      </div>
      <div className="filter-toolbar">
        <SearchBox
          value={search}
          onChange={(q) => setParams(q ? { q } : {}, { replace: true })}
        />
        <div className="filter-select">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["All levels", "Beginner", "Intermediate", "Advanced"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <select
          aria-label="Sort quizzes"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recommended">Recommended first</option>
          <option value="shortest">Shortest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      <div className="results-label">
        Showing <strong>{filtered.length}</strong>{" "}
        {filtered.length === 1 ? "quiz" : "quizzes"}
      </div>
      <div className="quiz-grid">
        {filtered.map((q) => (
          <QuizCard
            quiz={q}
            key={q.id}
            onStart={start}
            completed={attempts.some(
              (a) => a.quizId === q.id && a.status === "completed",
            )}
          />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No quizzes match just yet"
          description="Try another topic or clear your search."
          action={
            <button
              className="button"
              onClick={() => {
                setParams({});
                setCategory("All topics");
                setDifficulty("All levels");
              }}
            >
              Clear filters
            </button>
          }
        />
      )}{" "}
      {dialog}
    </>
  );
}
function CompassIcon() {
  return <BookOpen size={29} />;
}
export function Results() {
  const { attempts } = useApp();
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const filtered = attempts.filter(
    (a) =>
      (filter === "all" ||
        (filter === "active"
          ? a.status === "in_progress"
          : filter === "passed"
            ? a.passed === true
            : a.passed === false)) &&
      a.quizTitle.toLowerCase().includes(search.toLowerCase()),
  );
  const completed = attempts.filter((a) => a.status === "completed");
  return (
    <>
      <PageTitle
        title="Progress worth celebrating."
        description="Every attempt tells a story. See how far you’ve come."
      >
        <button
          className="button"
          onClick={() => exportAttempts(filtered)}
          disabled={!filtered.length}
        >
          <Download size={16} />
          Export CSV
        </button>
      </PageTitle>
      <div className="result-summary">
        <div>
          <span>COMPLETED ATTEMPTS</span>
          <strong>{completed.length}</strong>
        </div>
        <div>
          <span>AVERAGE SCORE</span>
          <strong>{average(completed)}%</strong>
        </div>
        <div>
          <span>PASS RATE</span>
          <strong>
            {completed.length
              ? Math.round(
                  (completed.filter((a) => a.passed).length /
                    completed.length) *
                    100,
                )
              : 0}
            %
          </strong>
        </div>
      </div>
      <section className="panel">
        <div className="filter-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search your results…"
          />
          <select
            aria-label="Filter results"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All attempts</option>
            <option value="active">In progress</option>
            <option value="passed">Passed</option>
            <option value="failed">Needs practice</option>
          </select>
        </div>
        <AttemptTable attempts={filtered} />
      </section>
    </>
  );
}
export function AttemptTable({
  attempts,
  report = false,
}: {
  attempts: Attempt[];
  report?: boolean;
}) {
  if (!attempts.length)
    return (
      <Empty
        title="A fresh page in your learning story"
        description="Complete a quiz and your results will appear here."
        action={
          !report && (
            <Link className="button primary" to="/explore">
              Explore quizzes
            </Link>
          )
        }
      />
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{report ? "Learner" : "Quiz"}</th>
            {report && <th>Quiz</th>}
            <th>Date</th>
            <th>Score</th>
            <th>Status</th>
            {!report && (
              <th>
                <span className="sr-only">Action</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{report ? a.userName : a.quizTitle}</strong>
                <small>{report ? a.userId.slice(0, 8) : a.category}</small>
              </td>
              {report && <td>{a.quizTitle}</td>}
              <td>{date(a.startedAt)}</td>
              <td>
                <strong>{a.score !== null ? `${a.score}%` : "—"}</strong>
              </td>
              <td>
                <Badge
                  tone={
                    a.status === "in_progress"
                      ? "blue"
                      : a.passed
                        ? "green"
                        : "orange"
                  }
                >
                  {a.status === "in_progress"
                    ? "In progress"
                    : a.passed
                      ? "Passed"
                      : "Needs practice"}
                </Badge>
              </td>
              {!report && (
                <td>
                  <Link
                    className="text-button"
                    to={
                      a.status === "in_progress"
                        ? `/play/${a.id}`
                        : `/results/${a.id}`
                    }
                  >
                    {a.status === "in_progress" ? "Resume" : "Review"}
                    <ArrowUpRight size={16} />
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Result() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all");
  const { user } = useApp();
  useEffect(() => {
    setAttempt(null);
    setError("");
    api
      .attempt(id!)
      .then(setAttempt)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);
  if (error) return <ErrorBox message={error} />;
  if (!attempt) return <Spinner />;
  if (attempt.status === "in_progress")
    return (
      <Empty
        title="Your quiz is still in progress"
        description="Finish your attempt to see the result."
        action={
          <Link to={`/play/${attempt.id}`} className="button primary">
            Resume quiz
          </Link>
        }
      />
    );
  const a = attempt;
  const correct = (q: Attempt["questions"][number]) =>
    q.correct?.length === (a.answers[q.id] || []).length &&
    q.correct.every((o) => (a.answers[q.id] || []).includes(o));
  const displayed = a.questions.filter(
    (q) =>
      filter === "all" ||
      (filter === "correct"
        ? correct(q)
        : filter === "flagged"
          ? a.flagged.includes(q.id)
          : !correct(q)),
  );
  return (
    <div className="result-page">
      <div className="print-heading">
        <img src="/favicon.svg" alt="" />
        <h2>QuizForge · Assessment result</h2>
      </div>
      <PageTitle
        eyebrow="A STEP FORWARD"
        title={
          a.passed
            ? "Well done. You made it!"
            : "Every attempt is a chance to grow."
        }
        description={a.quizTitle}
      >
        <button className="button" onClick={() => window.print()}>
          <Printer size={16} />
          Print result
        </button>
        <button className="button" onClick={() => exportAttempts([a])}>
          <Download size={16} />
          Export
        </button>
      </PageTitle>
      <div className="score-overview panel">
        <div className={`score-circle ${a.passed ? "pass" : "fail"}`}>
          <strong>
            {a.score}
            <small>%</small>
          </strong>
          <span>YOUR SCORE</span>
        </div>
        <div className="score-copy">
          <Badge tone={a.passed ? "green" : "orange"}>
            {a.passed ? "Assessment passed" : "More practice needed"}
          </Badge>
          <h2>{user!.name}</h2>
          <p>
            {a.passed
              ? "Your effort is paying off. Keep challenging yourself."
              : "Review the explanations below and come back stronger."}
          </p>
          <div className="score-details">
            <span>
              <CheckCircle2 size={17} />
              {a.earnedPoints} / {a.totalPoints} points
            </span>
            <span>
              <Target size={17} />
              {a.passPercent}% passing score
            </span>
            <span>
              <Clock3 size={17} />
              {Math.max(
                0,
                Math.round(
                  (Date.parse(a.submittedAt!) - Date.parse(a.startedAt)) /
                    60000,
                ),
              )}{" "}
              minutes
            </span>
          </div>
          <small className="muted">
            {date(a.submittedAt!)} ·{" "}
            {a.reason === "expired"
              ? "Time expired; saved answers were scored."
              : "Submitted successfully."}{" "}
            · ID {a.id}
          </small>
        </div>
      </div>
      <div className="section-heading review-header">
        <div>
          <h2>Your answer review</h2>
          <p>Understand the why behind every answer.</p>
        </div>
        <select
          aria-label="Filter reviewed questions"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All questions</option>
          <option value="incorrect">Incorrect / unanswered</option>
          <option value="correct">Correct answers</option>
          <option value="flagged">Flagged questions</option>
        </select>
      </div>
      {displayed.map((q) => (
        <section
          className={`panel review-card ${correct(q) ? "correct" : "incorrect"}`}
          key={q.id}
        >
          <div className="between">
            <span className="tiny-label">
              QUESTION {a.questions.indexOf(q) + 1} · {q.points}{" "}
              {q.points === 1 ? "POINT" : "POINTS"}
            </span>
            <Badge tone={correct(q) ? "green" : "orange"}>
              {correct(q)
                ? "Correct"
                : !(a.answers[q.id] || []).length
                  ? "Unanswered"
                  : "Incorrect"}
            </Badge>
          </div>
          <h3>{q.prompt}</h3>
          <div className="review-options">
            {q.options.map((o) => (
              <div
                className={`${q.correct?.includes(o.id) ? "is-correct" : ""} ${a.answers[q.id]?.includes(o.id) ? "was-selected" : ""}`}
                key={o.id}
              >
                <span>{o.text}</span>
                <small>
                  {q.correct?.includes(o.id) ? "Correct answer" : ""}
                  {a.answers[q.id]?.includes(o.id) ? " · Your answer" : ""}
                </small>
              </div>
            ))}
          </div>
          <div className="explanation">
            <BookOpen size={18} />
            <div>
              <strong>Why this is the answer</strong>
              <p>
                {q.explanation ||
                  "No explanation was provided for this question."}
              </p>
            </div>
          </div>
        </section>
      ))}
      {!displayed.length && (
        <Empty
          title="No questions in this view"
          description="Choose a different review filter."
        />
      )}
      <div className="result-bottom">
        <Link className="button primary" to="/explore">
          Find your next challenge
          <ArrowRight size={17} />
        </Link>
        <Link className="button" to="/results">
          All results
        </Link>
      </div>
    </div>
  );
}
export function Leaders() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null),
    [error, setError] = useState("");
  const { user } = useApp();
  useEffect(() => {
    api
      .leaders()
      .then(setLeaders)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="GROW TOGETHER"
        title="A little friendly competition."
        description="Celebrate consistency, curiosity, and the people raising the bar."
      />
      <div className="leaderboard-note">
        <ShieldCheck size={20} />
        <p>
          Points = your best percentage score on each quiz × 10. Retakes improve
          your best score; they don’t multiply points.
          {mode === "demo"
            ? " This leaderboard includes illustrative demo learners."
            : ""}
        </p>
      </div>
      <ErrorBox message={error} />
      {!leaders && !error ? (
        <Spinner />
      ) : leaders?.length ? (
        <>
          <div className="podium">
            {leaders.slice(0, 3).map((l, i) => (
              <div key={l.id} className={`podium-card place-${i}`}>
                <span className="podium-place">
                  <Trophy size={20} />
                  {i + 1 === 1 ? "1st" : i + 1 === 2 ? "2nd" : "3rd"} place
                </span>
                <span className="avatar large">{initials(l.name)}</span>
                <h3>{l.name}</h3>
                <p>
                  {l.quizzes} quizzes · {l.average}% average
                </p>
                <strong>
                  {l.points.toLocaleString()}
                  <small> points</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Learner</th>
                  <th>Quizzes</th>
                  <th>Average best score</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l, i) => (
                  <tr key={l.id} className={l.id === user!.id ? "my-rank" : ""}>
                    <td>
                      <b>#{i + 1}</b>
                    </td>
                    <td>
                      <div className="person-cell">
                        <span className="avatar small">{initials(l.name)}</span>
                        <strong>{l.name}</strong>
                        {l.id === user!.id && <Badge>You</Badge>}
                      </div>
                    </td>
                    <td>{l.quizzes}</td>
                    <td>{l.average}%</td>
                    <td>
                      <b>{l.points.toLocaleString()}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty
          title="The leaderboard starts with you"
          description="Complete a quiz to earn your first points."
          action={
            <Link className="button primary" to="/explore">
              Explore quizzes
            </Link>
          }
        />
      )}
    </>
  );
}
