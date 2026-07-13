import bcrypt from "bcryptjs";
import { redirect } from "@sveltejs/kit";

const users = new Map(); // fallback (replace with DB later if needed)

/**
 * CREATE USER (REGISTER)
 */
export async function createUser(db, username, password, role = "user") {
  const hash = await bcrypt.hash(password, 10);

  await db.execute(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username, hash, role]
  );
}

/**
 * LOGIN USER
 */
export async function loginUser(db, username, password) {
  const result = await db.select(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );

  const user = result?.[0];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

/**
 * PROTECT ROUTES
 */
export function requireAuth(session) {
  if (!session?.user) throw redirect(302, "/login");
}

export function requireAdmin(session) {
  if (!session?.user || session.user.role !== "admin") {
    throw redirect(302, "/dashboard");
  }
}