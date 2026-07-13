export function getUser() {
  if (typeof localStorage === "undefined") return null;
  return JSON.parse(localStorage.getItem("user") || "null");
}

export function logoutUser() {
  localStorage.removeItem("user");
}