import { log } from "$lib/debug/logger";

export function initErrorHandler() {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (ev: ErrorEvent) => {
        const page = window.location.pathname;

        const message =
            `${ev.message} at ${ev.filename}:${ev.lineno}:${ev.colno}\n` +
            `${ev.error?.stack || ""}`;

        log("ERROR", page || "UNKNOWN", message);

        try {
            showErrorOverlay(
                page || "UNKNOWN",
                ev.message,
                ev.error?.stack || ""
            );
        } catch {
            // ignore
        }
    });

    window.addEventListener(
        "unhandledrejection",
        (ev: PromiseRejectionEvent) => {
            const page = window.location.pathname;

            const reason =
                ev.reason && typeof ev.reason === "object"
                    ? JSON.stringify(ev.reason)
                    : String(ev.reason);

            log(
                "ERROR",
                page || "UNKNOWN",
                `UnhandledPromiseRejection: ${reason}`
            );

            try {
                showErrorOverlay(
                    page || "UNKNOWN",
                    "UnhandledPromiseRejection",
                    reason
                );
            } catch {
                // ignore
            }
        }
    );
}

function showErrorOverlay(
    page: string,
    error: string,
    stack: string
) {
    const existing = document.getElementById(
        "__global_error_overlay"
    );

    if (existing) return;

    const overlay = document.createElement("div");

    overlay.id = "__global_error_overlay";

    overlay.style.position = "fixed";
    overlay.style.right = "12px";
    overlay.style.bottom = "12px";
    overlay.style.zIndex = "99999";
    overlay.style.maxWidth = "420px";
    overlay.style.padding = "12px";
    overlay.style.background = "rgba(200,20,20,0.95)";
    overlay.style.color = "#fff";
    overlay.style.fontFamily = "monospace";
    overlay.style.fontSize = "12px";
    overlay.style.borderRadius = "6px";

    overlay.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">
      ${page}
    </div>

    <div style="white-space:pre-wrap;max-height:200px;overflow:auto">
      ${error}
      <br><br>
      ${stack}
    </div>

    <div style="margin-top:8px">
      Check console and logs
    </div>

    <button
      id="__overlay_close"
      style="margin-top:8px"
    >
      Close
    </button>
  `;

    document.body.appendChild(overlay);

    const btn = document.getElementById(
        "__overlay_close"
    );

    btn?.addEventListener("click", () => {
        overlay.remove();
    });
}

export default {
    initErrorHandler
};