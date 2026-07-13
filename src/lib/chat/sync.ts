import { getLocalMessages, clearSyncedMessages } from "./local-store";

export async function syncMessages() {
  const isOnline = navigator.onLine;

  if (!isOnline) return;

  const messages = getLocalMessages();

  for (const msg of messages) {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg)
    });
  }

  clearSyncedMessages();
}