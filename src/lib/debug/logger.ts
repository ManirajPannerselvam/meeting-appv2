export function log(level: string, module: string, message: string) {
  const entry =
    `[${new Date().toISOString()}] ` +
    `[${level}] ` +
    `[${module}] ` +
    `${message}`;

  console.log(entry);

  try {
    const logs = JSON.parse(localStorage.getItem("__app_logs") || "[]");
    logs.push(entry);
    localStorage.setItem("__app_logs", JSON.stringify(logs));
  } catch (e) {
    console.error("Logger error:", e);
  }
}

export function error(module: string, message: string) {
  return log("ERROR", module, message);
}

export function info(module: string, message: string) {
  return log("INFO", module, message);
}