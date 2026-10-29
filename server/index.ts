import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { Store } from "./db.js";
import { createApp, initialize } from "./app.js";
const store = new Store(process.env.DATABASE_PATH || "./data/quizforge.sqlite");
await initialize(store, process.env.ENABLE_DEMO_ACCOUNTS === "true");
const sameSite = process.env.COOKIE_SAME_SITE || "lax";
if (!["lax", "strict", "none"].includes(sameSite))
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none");
const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 5)
  throw new Error("TRUST_PROXY must be an integer from 0 to 5");
const app = createApp(store, {
  origins: (
    process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4000"
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
  production: process.env.NODE_ENV === "production",
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: sameSite as "lax" | "strict" | "none",
  registration: process.env.ALLOW_REGISTRATION !== "false",
  trustProxy,
});
const dist = resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () =>
  console.info(`QuizForge API listening on http://localhost:${port}`),
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
