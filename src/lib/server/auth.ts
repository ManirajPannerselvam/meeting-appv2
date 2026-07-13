export function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    throw new Error("403 Forbidden");
  }
}

export function requireUser(user) {
  if (!user) {
    throw new Error("401 Unauthorized");
  }
}