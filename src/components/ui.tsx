import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  Search,
  ArrowUpRight,
  Clock3,
  Layers,
  Code2,
  Palette,
  Braces,
  Sigma,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type { CatalogQuiz } from "../../shared/domain";
export function Spinner() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
    </div>
  ) : null;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search quizzes…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function CategoryIcon({
  category,
  size = 22,
}: {
  category: string;
  size?: number;
}) {
  const Icon =
    category === "Design"
      ? Palette
      : category === "Mathematics"
        ? Sigma
        : category === "Computer Science"
          ? Braces
          : Code2;
  return <Icon size={size} />;
}
export function QuizCard({
  quiz,
  onStart,
  completed = false,
}: {
  quiz: CatalogQuiz;
  onStart: (q: CatalogQuiz) => void;
  completed?: boolean;
}) {
  return (
    <article
      className={`quiz-card category-${quiz.category.replaceAll(" ", "").toLowerCase()}`}
    >
      <div className="card-art">
        <div className="art-rings" />
        <div className="art-icon">
          <CategoryIcon category={quiz.category} size={48} />
        </div>
        <span className="art-label">{quiz.category}</span>
        {completed && (
          <span className="complete-mark" title="Completed">
            <CheckCircle2 size={19} />
          </span>
        )}
      </div>
      <div className="quiz-card-body">
        <div className="between">
          <span className="tiny-label">{quiz.category}</span>
          <Badge
            tone={
              quiz.difficulty === "Advanced"
                ? "orange"
                : quiz.difficulty === "Beginner"
                  ? "green"
                  : "purple"
            }
          >
            {quiz.difficulty}
          </Badge>
        </div>
        <h3>{quiz.title}</h3>
        <p>{quiz.description}</p>
        <div className="quiz-meta">
          <span>
            <Layers size={14} />
            {quiz.questionCount} questions
          </span>
          <span>
            <Clock3 size={14} />
            {quiz.duration} min
          </span>
        </div>
        <div className="card-footer">
          <span>{quiz.passPercent}% to pass</span>
          <button className="text-button" onClick={() => onStart(quiz)}>
            Take quiz <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    el?.addEventListener("cancel", cancel);
    return () => {
      el?.removeEventListener("cancel", cancel);
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
