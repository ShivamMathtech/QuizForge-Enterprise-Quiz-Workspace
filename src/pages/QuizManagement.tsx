import { newId } from "../lib/id";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Archive,
  Copy,
  Upload,
  Download,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Save,
  CheckCircle2,
  BookOpen,
  Search,
  CircleHelp,
} from "lucide-react";
import { useApp } from "../context";
import { api } from "../lib/service";
import { errorMessage, date, download } from "../lib/utils";
import {
  PageTitle,
  SearchBox,
  Badge,
  ErrorBox,
  Empty,
  Modal,
} from "../components/ui";
import {
  quizInputSchema,
  type QuizInput,
  type CatalogQuiz,
  type Question,
} from "../../shared/domain";

const newQuestion = (): Question => ({
  id: newId(),
  type: "single",
  prompt: "",
  options: [0, 1, 2, 3].map((i) => ({ id: `o${i}`, text: "" })),
  correct: ["o0"],
  explanation: "",
  points: 1,
});
const newQuiz = (): QuizInput => ({
  title: "",
  description: "",
  category: "Development",
  difficulty: "Beginner",
  duration: 15,
  passPercent: 70,
  maxAttempts: 3,
  shuffle: true,
  status: "draft",
  featured: false,
  questions: [newQuestion()],
});
export function Manage() {
  const { managed, reload, notify } = useApp(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const list = managed.filter(
    (q) =>
      (status === "all" || q.status === status) &&
      q.title.toLowerCase().includes(search.toLowerCase()),
  );
  async function duplicate(q: CatalogQuiz) {
    setBusy(q.id);
    setError("");
    try {
      await api.saveQuiz({
        ...q,
        title: `${q.title.slice(0, 90)} (copy)`,
        status: "draft",
        questions: q.questions!,
      });
      await reload();
      notify("A draft copy is ready to edit.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function archive(q: CatalogQuiz) {
    if (
      !window.confirm(
        `Archive “${q.title}”? Existing attempts and results will be preserved.`,
      )
    )
      return;
    setBusy(q.id);
    setError("");
    try {
      await api.saveQuiz(
        { ...q, status: "archived", questions: q.questions! },
        q.id,
        q.revision,
      );
      await reload();
      notify("Quiz archived. Existing results are preserved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TURN KNOWLEDGE INTO OPPORTUNITY"
        title="Build a better challenge."
        description="Create thoughtful assessments and help your learners take their next step."
      >
        <Link className="button primary" to="/builder/new">
          <Plus size={18} />
          Create a quiz
        </Link>
      </PageTitle>
      <div className="compact-stats">
        {["published", "draft", "archived"].map((s) => (
          <div className="panel" key={s}>
            <span>{s} quizzes</span>
            <strong>{managed.filter((q) => q.status === s).length}</strong>
          </div>
        ))}
      </div>
      <ErrorBox message={error} />
      <section className="panel">
        <div className="filter-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search your quizzes…"
          />
          <select
            aria-label="Quiz status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.title}</strong>
                      <small>
                        {q.category} · {q.difficulty}
                      </small>
                    </td>
                    <td>{q.questionCount}</td>
                    <td>{q.duration} min</td>
                    <td>
                      <Badge
                        tone={
                          q.status === "published"
                            ? "green"
                            : q.status === "draft"
                              ? "orange"
                              : "gray"
                        }
                      >
                        {q.status}
                      </Badge>
                    </td>
                    <td>{date(q.updatedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/builder/${q.id}`}
                          className="icon-button"
                          title="Edit quiz"
                          aria-label={`Edit ${q.title}`}
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          className="icon-button"
                          disabled={busy === q.id}
                          title="Duplicate quiz"
                          aria-label={`Duplicate ${q.title}`}
                          onClick={() => void duplicate(q)}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Export quiz JSON"
                          aria-label={`Export ${q.title}`}
                          onClick={() =>
                            download(
                              `quiz-${q.id}.json`,
                              JSON.stringify(q, null, 2),
                            )
                          }
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={q.status === "archived" || busy === q.id}
                          title="Archive quiz"
                          aria-label={`Archive ${q.title}`}
                          onClick={() => void archive(q)}
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Make room for your first quiz"
            description="Create a quiz, add your questions, and publish when it’s ready."
            action={
              <Link className="button primary" to="/builder/new">
                Create a quiz
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
export function Builder() {
  const { id } = useParams(),
    { managed, reload, notify } = useApp(),
    navigate = useNavigate();
  const [form, setForm] = useState<QuizInput>(newQuiz),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [bank, setBank] = useState(false),
    [bankSearch, setBankSearch] = useState(""),
    [dirty, setDirty] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    revision = useRef<number | undefined>(undefined);
  const source = managed.find((q) => q.id === id);
  useEffect(() => {
    if (id === "new") {
      const fresh = newQuiz();
      const selected = sessionStorage.getItem("qf-bank-selection");
      if (selected) {
        try {
          fresh.questions = JSON.parse(selected);
        } catch {}
        sessionStorage.removeItem("qf-bank-selection");
      }
      setForm(fresh);
      revision.current = undefined;
    } else if (source) {
      setForm({ ...source, questions: structuredClone(source.questions!) });
      revision.current = source.revision;
    }
    setDirty(false);
    // Capture the revision when opening. Later server changes must cause a conflict, not overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(p: Partial<QuizInput>) {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  }
  function patchQuestion(index: number, p: Partial<Question>) {
    patch({
      questions: form.questions.map((q, i) =>
        i === index ? { ...q, ...p } : q,
      ),
    });
  }
  async function save(status: QuizInput["status"]) {
    setBusy(true);
    setError("");
    try {
      const parsed = quizInputSchema.parse({ ...form, status });
      await api.saveQuiz(
        parsed,
        id === "new" ? undefined : id,
        revision.current,
      );
      setDirty(false);
      await reload();
      notify(
        status === "published"
          ? "Your quiz is published and ready for learners."
          : "Quiz saved.",
      );
      navigate("/manage");
    } catch (e) {
      setError(errorMessage(e));
      document
        .querySelector(".error-box")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setBusy(false);
    }
  }
  async function importFile(f: File) {
    if (f.size > 1024 * 1024) {
      setError("Use a JSON file smaller than 1 MB.");
      return;
    }
    try {
      const imported = quizInputSchema.parse(JSON.parse(await f.text()));
      patch({ ...imported, status: "draft" });
      setError("");
      notify("Imported into the editor. Review the questions, then save.");
    } catch (e) {
      setError(`Import failed: ${errorMessage(e)}`);
    }
    if (file.current) file.current.value = "";
  }
  const available = managed
    .flatMap((q) =>
      (q.questions || []).map((question) => ({ quiz: q.title, question })),
    )
    .filter((x) =>
      x.question.prompt.toLowerCase().includes(bankSearch.toLowerCase()),
    );
  if (id !== "new" && !source)
    return (
      <Empty
        title="Quiz not found"
        description="You may not have permission to edit this quiz."
        action={
          <Link to="/manage" className="button">
            Back to quizzes
          </Link>
        }
      />
    );
  return (
    <>
      <PageTitle
        title={
          id === "new"
            ? "Create something worth learning."
            : "Make your challenge even better."
        }
        description="Clear questions. Thoughtful feedback. Meaningful progress."
      >
        <button
          className="button"
          onClick={() => {
            if (!dirty || window.confirm("Leave without saving your changes?"))
              navigate("/manage");
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => void save("draft")}
        >
          <Save size={16} />
          Save draft
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void save("published")}
        >
          <CheckCircle2 size={16} />
          {busy ? "Saving…" : "Publish quiz"}
        </button>
      </PageTitle>
      <ErrorBox message={error} />
      <div className="builder-layout">
        <div>
          <section className="panel form-panel">
            <div className="section-heading">
              <div>
                <h2>The essentials</h2>
                <p>Give learners a clear sense of what’s ahead.</p>
              </div>
              <Badge tone={dirty ? "orange" : "gray"}>
                {dirty ? "Unsaved changes" : "Quiz details"}
              </Badge>
            </div>
            <label>
              Quiz title
              <input
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="e.g. JavaScript: Beyond the basics"
                maxLength={100}
                minLength={5}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="What will learners put into practice?"
                maxLength={1000}
                rows={3}
              />
            </label>
            <div className="form-grid">
              <label>
                Category
                <input
                  value={form.category}
                  list="categories"
                  onChange={(e) => patch({ category: e.target.value })}
                  maxLength={40}
                />
                <datalist id="categories">
                  {[
                    "Development",
                    "Computer Science",
                    "Design",
                    "Mathematics",
                    "Business",
                    "General Knowledge",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </datalist>
              </label>
              <label>
                Difficulty
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    patch({
                      difficulty: e.target.value as QuizInput["difficulty"],
                    })
                  }
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>
            </div>
          </section>
          <div className="section-heading question-section-heading">
            <div>
              <h2>
                Your questions{" "}
                <span className="count-bubble">{form.questions.length}</span>
              </h2>
              <p>Select the correct answer and add an explanation.</p>
            </div>
            <button className="button" onClick={() => setBank(true)}>
              <BookOpen size={16} />
              From question bank
            </button>
          </div>
          {form.questions.map((q, index) => (
            <section className="panel question-editor" key={q.id}>
              <div className="question-editor-head">
                <span className="question-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <select
                  aria-label={`Question ${index + 1} type`}
                  value={q.type}
                  onChange={(e) =>
                    patchQuestion(index, {
                      type: e.target.value as Question["type"],
                      correct:
                        e.target.value === "single"
                          ? [q.correct[0] || q.options[0].id]
                          : q.correct,
                    })
                  }
                >
                  <option value="single">Single choice</option>
                  <option value="multiple">Multiple answers</option>
                </select>
                <div className="table-actions">
                  <button
                    className="icon-button"
                    aria-label={`Move question ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...form.questions];
                      [next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ];
                      patch({ questions: next });
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move question ${index + 1} down`}
                    disabled={index === form.questions.length - 1}
                    onClick={() => {
                      const next = [...form.questions];
                      [next[index + 1], next[index]] = [
                        next[index],
                        next[index + 1],
                      ];
                      patch({ questions: next });
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Duplicate question ${index + 1}`}
                    onClick={() =>
                      patch({
                        questions: [
                          ...form.questions.slice(0, index + 1),
                          { ...structuredClone(q), id: newId() },
                          ...form.questions.slice(index + 1),
                        ],
                      })
                    }
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete question ${index + 1}`}
                    disabled={form.questions.length === 1}
                    onClick={() => {
                      if (window.confirm("Remove this question from the quiz?"))
                        patch({
                          questions: form.questions.filter(
                            (_, i) => i !== index,
                          ),
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <label>
                Question prompt
                <textarea
                  value={q.prompt}
                  onChange={(e) =>
                    patchQuestion(index, { prompt: e.target.value })
                  }
                  placeholder="Write a clear, specific question…"
                  rows={2}
                  maxLength={2000}
                />
              </label>
              <div className="editor-options">
                <span className="field-label">
                  ANSWER OPTIONS{" "}
                  <small>
                    Mark the correct{" "}
                    {q.type === "multiple" ? "answers" : "answer"}
                  </small>
                </span>
                {q.options.map((o, i) => (
                  <div
                    className={q.correct.includes(o.id) ? "correct-option" : ""}
                    key={o.id}
                  >
                    <input
                      type={q.type === "single" ? "radio" : "checkbox"}
                      name={`correct-${q.id}`}
                      aria-label={`Question ${index + 1} option ${i + 1} is correct`}
                      checked={q.correct.includes(o.id)}
                      onChange={() =>
                        patchQuestion(index, {
                          correct:
                            q.type === "single"
                              ? [o.id]
                              : q.correct.includes(o.id)
                                ? q.correct.filter((id) => id !== o.id)
                                : [...q.correct, o.id],
                        })
                      }
                    />
                    <span>{String.fromCharCode(65 + i)}</span>
                    <input
                      aria-label={`Question ${index + 1} option ${i + 1}`}
                      value={o.text}
                      maxLength={500}
                      onChange={(e) =>
                        patchQuestion(index, {
                          options: q.options.map((x) =>
                            x.id === o.id ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                      placeholder={`Answer option ${i + 1}`}
                    />
                    {q.options.length > 2 && (
                      <button
                        className="icon-button"
                        aria-label={`Remove option ${i + 1}`}
                        onClick={() =>
                          patchQuestion(index, {
                            options: q.options.filter((x) => x.id !== o.id),
                            correct: q.correct.filter((x) => x !== o.id),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {q.options.length < 6 && (
                <button
                  className="text-button"
                  onClick={() =>
                    patchQuestion(index, {
                      options: [...q.options, { id: newId(), text: "" }],
                    })
                  }
                >
                  <Plus size={15} />
                  Add option
                </button>
              )}
              <div className="form-grid explanation-fields">
                <label>
                  Answer explanation
                  <textarea
                    value={q.explanation}
                    onChange={(e) =>
                      patchQuestion(index, { explanation: e.target.value })
                    }
                    rows={2}
                    maxLength={2000}
                    placeholder="Help learners understand the reasoning…"
                  />
                </label>
                <label>
                  Points
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={q.points}
                    onChange={(e) =>
                      patchQuestion(index, { points: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </section>
          ))}
          <button
            className="add-question"
            disabled={form.questions.length >= 100}
            onClick={() =>
              patch({ questions: [...form.questions, newQuestion()] })
            }
          >
            <Plus size={20} />
            Add another question<span>{form.questions.length}/100</span>
          </button>
        </div>
        <aside className="builder-aside">
          <section className="panel form-panel">
            <h3>Assessment settings</h3>
            <label>
              Time limit (minutes)
              <input
                type="number"
                min={1}
                max={180}
                value={form.duration}
                onChange={(e) => patch({ duration: Number(e.target.value) })}
              />
            </label>
            <label>
              Passing score (%)
              <input
                type="number"
                min={1}
                max={100}
                value={form.passPercent}
                onChange={(e) => patch({ passPercent: Number(e.target.value) })}
              />
            </label>
            <label>
              Maximum attempts
              <input
                type="number"
                min={1}
                max={50}
                value={form.maxAttempts}
                onChange={(e) => patch({ maxAttempts: Number(e.target.value) })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.shuffle}
                onChange={(e) => patch({ shuffle: e.target.checked })}
              />
              <span>
                Shuffle question order
                <small>A different order for every attempt</small>
              </span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => patch({ featured: e.target.checked })}
              />
              <span>
                Feature this quiz
                <small>Prioritize in quiz recommendations</small>
              </span>
            </label>
            <div className="builder-total">
              <span>Total points</span>
              <b>{form.questions.reduce((s, q) => s + q.points, 0)}</b>
            </div>
          </section>
          <section className="panel import-panel">
            <h3>Bring your questions</h3>
            <p>
              Import a complete quiz JSON file or export the current editor
              content.
            </p>
            <input
              type="file"
              accept="application/json,.json"
              ref={file}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) void importFile(e.target.files[0]);
              }}
            />
            <button
              className="button full"
              onClick={() => file.current?.click()}
            >
              <Upload size={16} />
              Import JSON
            </button>
            <button
              className="button full"
              onClick={() =>
                download("quizforge-quiz.json", JSON.stringify(form, null, 2))
              }
            >
              <Download size={16} />
              Export JSON
            </button>
            <small>
              Imports open as drafts. Question IDs must be unique. Existing
              attempts keep their original question snapshot.
            </small>
          </section>
          <div className="player-tip">
            <CircleHelp size={22} />
            <p>
              All fields are validated before saving, including correct answers,
              unique IDs, and scoring limits.
            </p>
          </div>
        </aside>
      </div>
      {bank && (
        <Modal
          wide
          title="Add from your question bank"
          onClose={() => setBank(false)}
        >
          <div className="help-content">
            <SearchBox
              value={bankSearch}
              onChange={setBankSearch}
              placeholder="Search question prompts…"
            />
            <div className="bank-picker">
              {available.map((x, i) => (
                <div key={`${x.question.id}-${i}`}>
                  <div>
                    <small>{x.quiz}</small>
                    <strong>{x.question.prompt}</strong>
                  </div>
                  <button
                    className="button"
                    onClick={() => {
                      patch({
                        questions: [
                          ...form.questions,
                          { ...structuredClone(x.question), id: newId() },
                        ],
                      });
                      setBank(false);
                      notify("Question added to this quiz.");
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              ))}
              {!available.length && (
                <p>No questions found in your managed quizzes.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Bank() {
  const { managed } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [preview, setPreview] = useState<Question | null>(null);
  const questions = managed.flatMap((q) =>
    (q.questions || []).map((question) => ({
      key: `${q.id}/${question.id}`,
      question,
      quiz: q.title,
      category: q.category,
    })),
  );
  const visible = questions.filter((x) =>
    `${x.question.prompt} ${x.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Good questions go further."
        description="Reuse the questions from your managed quizzes to build something new."
      >
        <button
          className="button primary"
          disabled={!selected.length || selected.length > 100}
          onClick={() => {
            const qs = questions
              .filter((x) => selected.includes(x.key))
              .map((x) => ({ ...structuredClone(x.question), id: newId() }));
            sessionStorage.setItem("qf-bank-selection", JSON.stringify(qs));
            navigate("/builder/new");
          }}
        >
          <Plus size={17} />
          Create quiz with {selected.length} selected
        </button>
      </PageTitle>
      <div className="filter-toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search questions or topics…"
        />
        <Badge>{questions.length} questions</Badge>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Question</th>
              <th>Source quiz</th>
              <th>Type</th>
              <th>Points</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((x) => (
              <tr key={x.key}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${x.question.prompt}`}
                    checked={selected.includes(x.key)}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(x.key)
                          ? s.filter((v) => v !== x.key)
                          : [...s, x.key],
                      )
                    }
                  />
                </td>
                <td>
                  <strong>{x.question.prompt}</strong>
                  <small>{x.category}</small>
                </td>
                <td>{x.quiz}</td>
                <td>{x.question.type === "single" ? "Single" : "Multiple"}</td>
                <td>{x.question.points}</td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => setPreview(x.question)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <Empty
            title="Your question bank starts here"
            description="Create a quiz to add reusable questions to your workspace."
          />
        )}
      </div>
      {preview && (
        <Modal title="Question preview" onClose={() => setPreview(null)}>
          <div className="help-content">
            <h3>{preview.prompt}</h3>
            <div className="review-options">
              {preview.options.map((o) => (
                <div
                  key={o.id}
                  className={preview.correct.includes(o.id) ? "is-correct" : ""}
                >
                  <span>{o.text}</span>
                  {preview.correct.includes(o.id) && <CheckCircle2 size={17} />}
                </div>
              ))}
            </div>
            <div className="info-box">
              {preview.explanation || "No explanation provided."}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
