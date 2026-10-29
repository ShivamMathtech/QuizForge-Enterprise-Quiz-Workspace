import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { User, Quiz, Attempt, Audit } from "../shared/domain.js";

export type UserRow = Omit<User, "active"> & {
  active: number;
  password: string;
};
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
    );
    this.migrate();
  }
  migrate() {
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    if (this.db.prepare("SELECT version FROM migrations WHERE version=1").get())
      return;
    this.tx(() => {
      this.db.exec(`
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('learner','instructor','admin')),
          active INTEGER NOT NULL DEFAULT 1, joinedAt TEXT NOT NULL);
        CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE INDEX sessions_expiry ON sessions(expires_at);
        CREATE TABLE quizzes (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL);
        CREATE TABLE attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), quiz_id TEXT NOT NULL REFERENCES quizzes(id),
          status TEXT NOT NULL CHECK(status IN ('in_progress','completed')), body TEXT NOT NULL);
        CREATE INDEX attempts_user ON attempts(user_id);
        CREATE INDEX attempts_quiz ON attempts(quiz_id);
        CREATE UNIQUE INDEX one_active_attempt ON attempts(user_id,quiz_id) WHERE status='in_progress';
        CREATE TABLE audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, createdAt TEXT NOT NULL);
        CREATE INDEX audit_created ON audit(createdAt);
        CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
        INSERT INTO settings VALUES (1,'{"organization":"QuizForge Workspace","registration":true}');
      `);
      this.db
        .prepare("INSERT INTO migrations VALUES (1,?)")
        .run(new Date().toISOString());
    });
  }
  tx<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  user(id: string) {
    return this.db.prepare("SELECT * FROM users WHERE id=?").get(id) as
      UserRow | undefined;
  }
  email(email: string) {
    return this.db.prepare("SELECT * FROM users WHERE email=?").get(email) as
      UserRow | undefined;
  }
  users(): User[] {
    return (
      this.db
        .prepare("SELECT * FROM users ORDER BY joinedAt DESC")
        .all() as UserRow[]
    ).map(publicUser);
  }
  addUser(u: User, password: string) {
    this.db
      .prepare(
        "INSERT INTO users(id,name,email,password,role,active,joinedAt) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        u.id,
        u.name,
        u.email,
        password,
        u.role,
        u.active ? 1 : 0,
        u.joinedAt,
      );
  }
  quiz(id: string): Quiz | undefined {
    const r = this.db.prepare("SELECT body FROM quizzes WHERE id=?").get(id);
    return r ? JSON.parse(String(r.body)) : undefined;
  }
  quizzes(): Quiz[] {
    return this.db
      .prepare("SELECT body FROM quizzes")
      .all()
      .map((r) => JSON.parse(String(r.body)));
  }
  putQuiz(q: Quiz) {
    this.db
      .prepare(
        "INSERT INTO quizzes(id,owner,body) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
      )
      .run(q.id, q.createdBy, JSON.stringify(q));
  }
  attempt(id: string): Attempt | undefined {
    const r = this.db.prepare("SELECT body FROM attempts WHERE id=?").get(id);
    return r ? JSON.parse(String(r.body)) : undefined;
  }
  attempts(): Attempt[] {
    return this.db
      .prepare("SELECT body FROM attempts")
      .all()
      .map((r) => JSON.parse(String(r.body)));
  }
  putAttempt(a: Attempt) {
    this.db
      .prepare(
        "INSERT INTO attempts(id,user_id,quiz_id,status,body) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,body=excluded.body",
      )
      .run(a.id, a.userId, a.quizId, a.status, JSON.stringify(a));
  }
  audit(actor: string, action: string, entity: string) {
    this.db
      .prepare("INSERT INTO audit VALUES (?,?,?,?,?)")
      .run(randomUUID(), actor, action, entity, new Date().toISOString());
  }
  audits(): Audit[] {
    return this.db
      .prepare("SELECT * FROM audit ORDER BY createdAt DESC LIMIT 200")
      .all() as Audit[];
  }
  close() {
    this.db.close();
  }
}
export function publicUser(u: UserRow): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: !!u.active,
    joinedAt: u.joinedAt,
  };
}
