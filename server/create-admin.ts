import { randomUUID } from "node:crypto";
import { Store } from "./db.js";
import { hashPassword } from "./security.js";
import { emailSchema, passwordSchema } from "../shared/domain.js";
const email = emailSchema.parse(process.env.BOOTSTRAP_ADMIN_EMAIL);
const password = passwordSchema.parse(process.env.BOOTSTRAP_ADMIN_PASSWORD);
const db = new Store(process.env.DATABASE_PATH || "./data/quizforge.sqlite");
try {
  if (db.email(email))
    throw new Error(
      "This email already exists. Existing users are not overwritten.",
    );
  db.addUser(
    {
      id: randomUUID(),
      email,
      name: "Administrator",
      role: "admin",
      active: true,
      joinedAt: new Date().toISOString(),
    },
    await hashPassword(password),
  );
  console.info(
    "Administrator created. Remove BOOTSTRAP_ADMIN_PASSWORD from the environment after use.",
  );
} finally {
  db.close();
}
