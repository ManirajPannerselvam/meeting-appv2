/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/hooks.client.ts
 * ============================================================
 * PURPOSE
 *   Client-side application bootstrap.
 *
 * DESCRIPTION
 *   Initializes the application once when the client starts.
 *
 * INITIALIZES
 *   - IndexedDB
 *   - Authentication
 *   - Offline Sync
 *   - Realtime (future)
 * ============================================================
 */

import type { HandleClientError } from "@sveltejs/kit";
import { initializeApplication } from "$lib/init";

// Initialize application once on client startup.
void initializeApplication();

/**
 * Global client error handler.
 */
export const handleError: HandleClientError = ({ error, status }) => {
	console.error("Client Error:", status, error);

	return {
		message: "An unexpected error occurred."
	};
};