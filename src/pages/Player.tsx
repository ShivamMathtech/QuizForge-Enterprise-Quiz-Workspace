import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  ChevronLeft,
  LogOut,
  ShieldCheck,
  Cloud,
  RotateCw,
} from "lucide-react";
import { api, mode } from "../lib/service";
import { useApp } from "../context";
import { ErrorBox, Spinner, Modal, Badge, Progress } from "../components/ui";
import { errorMessage } from "../lib/utils";
import type { Attempt, Answers } from "../../shared/domain";

export function Player() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { reload } = useApp();
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [answers, setAnswers] = useState<Answers>({}),
    [flagged, setFlagged] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(0),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("All changes saved"),
    [confirm, setConfirm] = useState(false),
    [exit, setExit] = useState(false),
    [busy, setBusy] = useState(false);
  const current = useRef<Attempt | null>(null),
    draft = useRef({ answers: {} as Answers, flagged: [] as string[] }),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    debounce = useRef<ReturnType<typeof setTimeout> | null>(null),
    expired = useRef(false),
    dirty = useRef(false),
    mounted = useRef(true),
    submitLock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    api
      .attempt(id!)
      .then((a) => {
        if (!mounted.current) return;
        if (a.status === "completed") {
          navigate(`/results/${a.id}`, { replace: true });
          return;
        }
        current.current = a;
        draft.current = { answers: a.answers, flagged: a.flagged };
        setAnswers(a.answers);
        setFlagged(a.flagged);
        setAttempt(a);
        setRemaining(
          Math.max(0, Math.ceil((Date.parse(a.deadline) - Date.now()) / 1000)),
        );
      })
      .catch((e) => setError(errorMessage(e)));
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [id, navigate]);
  async function persist(submit = false): Promise<boolean> {
    if (submit && submitLock.current) return false;
    if (submit) {
      submitLock.current = true;
      setBusy(true);
    }
    if (debounce.current) clearTimeout(debounce.current);
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (!current.current || current.current.status === "completed")
          return true;
        const snapshot = structuredClone(draft.current);
        const signature = JSON.stringify(snapshot);
        setSaveStatus(submit ? "Submitting your answers…" : "Saving…");
        try {
          const saved = await api.saveAttempt(
            current.current.id,
            snapshot.answers,
            snapshot.flagged,
            current.current.version,
            submit,
          );
          current.current = saved;
          setError("");
          dirty.current = JSON.stringify(draft.current) !== signature;
          setSaveStatus(
            dirty.current ? "Unsaved changes" : "All changes saved",
          );
          if (saved.status === "completed") {
            await reload();
            navigate(`/results/${saved.id}`, { replace: true });
          }
          return true;
        } catch (e) {
          setError(errorMessage(e));
          setSaveStatus("Changes not saved");
          return false;
        }
      });
    queue.current = task;
    const success = await task;
    if (submit) {
      submitLock.current = false;
      if (mounted.current) setBusy(false);
    }
    return success;
  }
  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((Date.parse(attempt.deadline) - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        void persistRef.current(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (current.current?.status === "in_progress") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function update(nextAnswers: Answers, nextFlags: string[]) {
    draft.current = { answers: nextAnswers, flagged: nextFlags };
    setAnswers(nextAnswers);
    setFlagged(nextFlags);
    dirty.current = true;
    setSaveStatus("Unsaved changes");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void persistRef.current(), 550);
  }
  if (!attempt)
    return (
      <div className="player-loading">
        {error ? (
          <>
            <ErrorBox message={error} />
            <button className="button" onClick={() => navigate("/results")}>
              Back to results
            </button>
          </>
        ) : (
          <Spinner />
        )}
      </div>
    );
  const q = attempt.questions[index],
    selected = answers[q.id] || [],
    answered = attempt.questions.filter(
      (q) => (answers[q.id] || []).length > 0,
    ).length;
  function select(option: string) {
    if (busy || remaining === 0) return;
    const choices =
      q.type === "single"
        ? [option]
        : selected.includes(option)
          ? selected.filter((o) => o !== option)
          : [...selected, option];
    update({ ...answers, [q.id]: choices }, flagged);
  }
  const formatted = `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  return (
    <div className="player-shell">
      <header className="player-header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setExit(true);
          }}
        >
          <img src="/favicon.svg" alt="" />
          QuizForge
        </a>
        <span className="player-header-title">{attempt.quizTitle}</span>
        <div
          className={`timer ${remaining < 120 ? "warning" : ""}`}
          role="timer"
          aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
        >
          <Clock3 size={19} />
          {formatted}
        </div>
        <button
          className="icon-button"
          title="Save and leave"
          aria-label="Save and leave"
          onClick={() => setExit(true)}
        >
          <LogOut size={19} />
        </button>
      </header>
      <div className="player-mode">
        {mode === "demo"
          ? "Practice demo · this attempt is saved in your browser"
          : "Connected assessment · answers scored on the server"}
      </div>
      <main className="player-main">
        <div className="player-question-column">
          <div className="player-breadcrumb">
            <span>{attempt.category}</span>
            <ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />
            <span>{attempt.quizTitle}</span>
          </div>
          <div className="question-top">
            <div>
              <span className="eyebrow">YOU’RE MAKING PROGRESS</span>
              <h1>
                Question {index + 1} <span>of {attempt.questions.length}</span>
              </h1>
            </div>
            <button
              className={`button ${flagged.includes(q.id) ? "flagged-button" : ""}`}
              disabled={busy || remaining === 0}
              onClick={() =>
                update(
                  answers,
                  flagged.includes(q.id)
                    ? flagged.filter((id) => id !== q.id)
                    : [...flagged, q.id],
                )
              }
            >
              <Flag size={16} />
              {flagged.includes(q.id)
                ? "Flagged for review"
                : "Flag for review"}
            </button>
          </div>
          <Progress value={(answered / attempt.questions.length) * 100} />
          <section className="question-panel">
            <div className="between">
              <Badge>
                {q.type === "single" ? "Single choice" : "Multiple answers"}
              </Badge>
              <span className="muted">
                {q.points} {q.points === 1 ? "point" : "points"}
              </span>
            </div>
            <h2>{q.prompt}</h2>
            <p className="question-hint">
              {q.type === "multiple"
                ? "Select all correct answers. Every correct option is required."
                : "Choose the one best answer."}
            </p>
            <fieldset className="answer-options">
              <legend className="sr-only">
                Answers for question {index + 1}
              </legend>
              {q.options.map((o, i) => (
                <label
                  className={selected.includes(o.id) ? "selected" : ""}
                  key={o.id}
                >
                  <input
                    name={q.id}
                    type={q.type === "single" ? "radio" : "checkbox"}
                    checked={selected.includes(o.id)}
                    disabled={busy || remaining === 0}
                    onChange={() => select(o.id)}
                  />
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{o.text}</span>
                  <span className="option-check">
                    {selected.includes(o.id) && <CheckCircle2 size={20} />}
                  </span>
                </label>
              ))}
            </fieldset>
            {selected.length > 0 && (
              <button
                className="text-button clear-answer"
                disabled={busy || remaining === 0}
                onClick={() => {
                  const next = { ...answers };
                  delete next[q.id];
                  update(next, flagged);
                }}
              >
                Clear answer
              </button>
            )}
          </section>
          <ErrorBox message={error} />
          {error && (
            <div className="button-row">
              <button
                className="button"
                onClick={() => void persist(remaining === 0)}
                disabled={busy}
              >
                <RotateCw size={15} />
                Retry {remaining === 0 ? "submission" : "save"}
              </button>
              <button className="button" onClick={() => location.reload()}>
                Reload saved progress
              </button>
            </div>
          )}
          <div className="question-navigation">
            <button
              className="button"
              disabled={index === 0 || busy}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ArrowLeft size={17} />
              Previous
            </button>
            <span
              className={`save-status ${error ? "save-error" : ""}`}
              role="status"
            >
              <Cloud size={16} />
              {saveStatus}
            </span>
            {index < attempt.questions.length - 1 ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next question
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                Review & submit
                <CheckCircle2 size={17} />
              </button>
            )}
          </div>
        </div>
        <aside className="player-aside">
          <section className="panel navigator">
            <div className="section-heading">
              <h3>Your question map</h3>
              <span className="tiny-label">
                {answered}/{attempt.questions.length}
              </span>
            </div>
            <p>Jump to any question at any time.</p>
            <div className="question-grid">
              {attempt.questions.map((question, i) => (
                <button
                  key={question.id}
                  className={`${(answers[question.id] || []).length ? "answered" : ""} ${flagged.includes(question.id) ? "flagged" : ""} ${index === i ? "current" : ""}`}
                  aria-label={`Question ${i + 1}, ${(answers[question.id] || []).length ? "answered" : "unanswered"}${flagged.includes(question.id) ? ", flagged" : ""}`}
                  aria-current={index === i ? "step" : undefined}
                  onClick={() => setIndex(i)}
                >
                  {i + 1}
                  {flagged.includes(question.id) && <i />}
                </button>
              ))}
            </div>
            <div className="map-legend">
              <span>
                <i className="answered" />
                Answered
              </span>
              <span>
                <i />
                Not answered
              </span>
              <span>
                <i className="flagged" />
                Flagged
              </span>
            </div>
            <div className="navigator-counts">
              <div>
                <span>Answered</span>
                <b>{answered}</b>
              </div>
              <div>
                <span>Not answered</span>
                <b>{attempt.questions.length - answered}</b>
              </div>
              <div>
                <span>Flagged for review</span>
                <b>{flagged.length}</b>
              </div>
            </div>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              {busy ? "Submitting…" : "Submit quiz"}
              <ArrowRight size={17} />
            </button>
          </section>
          <div className="player-tip">
            <ShieldCheck size={21} />
            <div>
              <strong>Take a breath. You’ve got this.</strong>
              <p>
                Read each option carefully. Your answers save as you go. When
                time expires, your saved answers are scored.
              </p>
            </div>
          </div>
        </aside>
      </main>
      {confirm && (
        <Modal
          title="Ready to submit?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <div className="help-content">
            <div className="submit-icon">
              <CheckCircle2 size={35} />
            </div>
            <h3>
              You’ve answered {answered} of {attempt.questions.length}{" "}
              questions.
            </h3>
            <p>
              {answered < attempt.questions.length
                ? `${attempt.questions.length - answered} unanswered questions will receive zero points. `
                : ""}
              {flagged.length
                ? `You have ${flagged.length} flagged questions. `
                : ""}
              After submission, you can review your results and explanations.
              This attempt cannot be changed.
            </p>
            <ErrorBox message={error} />
            <div className="button-row">
              <button
                className="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep reviewing
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void persist(true)}
              >
                {busy ? "Submitting…" : "Submit answers"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {exit && (
        <Modal title="Save and leave this quiz?" onClose={() => setExit(false)}>
          <div className="help-content">
            <p>
              Your timer will keep running. You can resume from My results
              before time runs out. Saved answers are scored when the deadline
              passes.
            </p>
            <ErrorBox message={error} />
            <div className="button-row">
              <button className="button" onClick={() => setExit(false)}>
                Keep going
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  if (await persist()) {
                    await reload();
                    navigate("/results");
                  }
                  setBusy(false);
                }}
              >
                Save & leave
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
