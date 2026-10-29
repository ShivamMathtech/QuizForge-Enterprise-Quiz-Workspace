import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Use Node.js 24 LTS. Download it from https://nodejs.org/");
  process.exit(1);
}
const env = {
  ...process.env,
  VITE_APP_MODE: "api",
  VITE_API_URL: "/api",
  ENABLE_DEMO_ACCOUNTS: process.env.ENABLE_DEMO_ACCOUNTS || "true",
};
const children = [
  spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--watch",
      "--env-file-if-exists=.env",
      "server/index.ts",
    ],
    { env: { ...env, PORT: process.env.API_PORT || "4000" }, stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/vite/bin/vite.js", import.meta.url),
      ),
      "--host",
      "0.0.0.0",
      ...process.argv.slice(2),
    ],
    { env, stdio: "inherit" },
  ),
];
let shuttingDown = false;
function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 300).unref();
}
for (const child of children) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!shuttingDown) stop(code || 0);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
console.info(
  "\nQuizForge full stack: open http://localhost:5173 · API http://localhost:4000/api/health\n",
);
