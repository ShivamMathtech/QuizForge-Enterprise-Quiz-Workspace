import { ZodError } from "zod";
import type { Attempt } from "../../shared/domain";
export const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const initials = (s: string) =>
  s
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const average = (a: Attempt[]) =>
  a.length
    ? Math.round(a.reduce((s, a) => s + (a.score || 0), 0) / a.length)
    : 0;
export const errorMessage = (e: unknown) =>
  e instanceof ZodError
    ? e.issues
        .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
        .join("; ")
    : e instanceof Error
      ? e.message
      : "Something went wrong";
export function download(
  name: string,
  content: string,
  mime = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value ?? "");
            if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
            return `"${s.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export const exportAttempts = (attempts: Attempt[]) =>
  download(
    "quizforge-results.csv",
    csv([
      [
        "Attempt ID",
        "Learner",
        "Quiz",
        "Status",
        "Score (%)",
        "Points",
        "Total points",
        "Passed",
        "Started",
        "Submitted",
      ],
      ...attempts.map((a) => [
        a.id,
        a.userName || a.userId,
        a.quizTitle,
        a.status,
        a.score,
        a.earnedPoints,
        a.totalPoints,
        a.passed ? "Yes" : "No",
        a.startedAt,
        a.submittedAt,
      ]),
    ]),
    "text/csv;charset=utf-8",
  );
