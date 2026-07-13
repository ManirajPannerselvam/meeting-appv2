import Database from "@tauri-apps/plugin-sql";

let db;

export async function initDB() {
  if (!db) {
    db = await Database.load("sqlite:meeting.db");
  }
  return db;
}