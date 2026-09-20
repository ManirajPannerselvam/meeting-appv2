/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/hooks.client.ts
 * ============================================================
 * FIXED: No void, no double init, no Multiple GoTrueClient
 * ============================================================
 */

import type { HandleClientError } from "@sveltejs/kit";
import { initializeApplication } from "$lib/init";

let initDone = false;

// Initialize once, with proper error handling
async function boot() {
  if (initDone) return;
  initDone = true;

  try {
    await initializeApplication();
    console.info("[hooks.client] App booted successfully");
  } catch (e) {
    console.warn("[hooks.client] Boot failed, continuing offline:", e);
  }
}

// Only run in browser, once
if (typeof window!== 'undefined') {
  boot();
}

export const handleError: HandleClientError = ({ error, status, message }) => {
  console.error("Client Error:", status, message, error);
  return {
    message: "An unexpected error occurred. Check console."
  };
};