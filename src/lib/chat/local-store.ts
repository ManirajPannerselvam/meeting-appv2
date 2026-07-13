export function saveLocalMessage(msg: any) {
  const old = JSON.parse(localStorage.getItem("chat") || "[]");
  old.push({ ...msg, status: "pending" });
  localStorage.setItem("chat", JSON.stringify(old));
}

export function getLocalMessages() {
  return JSON.parse(localStorage.getItem("chat") || "[]");
}

export function clearSyncedMessages() {
  localStorage.removeItem("chat");
}