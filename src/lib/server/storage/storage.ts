import { readFileSync, writeFileSync } from "fs";

const file = "src/lib/server/storage/users.json";

// 📥 Get all users
export function getUsers() {
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}

// 💾 Save users
export function saveUsers(users) {
  writeFileSync(file, JSON.stringify(users, null, 2));
}