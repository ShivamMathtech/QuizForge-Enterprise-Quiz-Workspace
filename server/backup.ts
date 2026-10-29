import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
mkdirSync("backups", { recursive: true });
const db = new DatabaseSync(
  process.env.DATABASE_PATH || "./data/quizforge.sqlite",
);
const target = resolve(
  "backups",
  `quizforge-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
try {
  await backup(db, target);
  console.info(`Consistent SQLite backup created: ${target}`);
} finally {
  db.close();
}
