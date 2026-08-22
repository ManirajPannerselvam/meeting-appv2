/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/conflictResolver.ts
 * ============================================================
 * PURPOSE
 *   Offline Conflict Resolution Engine
 *
 * DESCRIPTION
 *   Resolves synchronization conflicts between
 *   local offline data and server data.
 *
 * STRATEGIES
 *     • Server Wins
 *     • Client Wins
 *     • Latest Timestamp
 *     • Merge
 *
 * No UI.
 * No IndexedDB.
 * No Supabase.
 * ============================================================
 */

/* ============================================================
 * TYPES
 * ============================================================ */

export type ConflictStrategy =
	| "SERVER_WINS"
	| "CLIENT_WINS"
	| "LATEST"
	| "MERGE";

export interface SyncRecord {
	id: string;
	updatedAt: string;
	[key: string]: unknown;
}

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Convert an ISO timestamp into milliseconds.
 *
 * Invalid timestamps return NaN.
 */
function getTimestamp(
	value: string
): number {
	return new Date(value).getTime();
}

/**
 * Determine whether a timestamp is valid.
 */
function isValidTimestamp(
	value: string
): boolean {
	return Number.isFinite(
		getTimestamp(value)
	);
}

/* ============================================================
 * SERVER WINS
 * ============================================================ */

/**
 * Server wins.
 *
 * The server record completely replaces
 * the local/client record.
 */
export function serverWins<
	T extends SyncRecord
>(
	server: T,
	_client: T
): T {
	return server;
}

/* ============================================================
 * CLIENT WINS
 * ============================================================ */

/**
 * Client wins.
 *
 * The local/client record completely replaces
 * the server record.
 */
export function clientWins<
	T extends SyncRecord
>(
	_server: T,
	client: T
): T {
	return client;
}

/* ============================================================
 * LATEST TIMESTAMP WINS
 * ============================================================ */

/**
 * Latest timestamp wins.
 *
 * Rules:
 *   1. Newer client timestamp → client
 *   2. Newer server timestamp → server
 *   3. Equal timestamps → server
 *   4. Invalid client timestamp → server
 *   5. Invalid server timestamp → client
 *   6. Both invalid → server
 */
export function latestWins<
	T extends SyncRecord
>(
	server: T,
	client: T
): T {
	const serverTime =
		getTimestamp(
			server.updatedAt
		);

	const clientTime =
		getTimestamp(
			client.updatedAt
		);

	const serverValid =
		isValidTimestamp(
			server.updatedAt
		);

	const clientValid =
		isValidTimestamp(
			client.updatedAt
		);

	if (
		clientValid &&
		!serverValid
	) {
		return client;
	}

	if (
		serverValid &&
		!clientValid
	) {
		return server;
	}

	if (
		!serverValid &&
		!clientValid
	) {
		return server;
	}

	return clientTime > serverTime
		? client
		: server;
}

/* ============================================================
 * MERGE
 * ============================================================ */

/**
 * Merge records.
 *
 * Server values are used as the base.
 * Client values overwrite matching fields.
 *
 * The identity field always comes from the
 * server record to prevent an accidental ID change.
 *
 * The timestamp represents the latest of the
 * two valid timestamps.
 */
export function mergeRecords<
	T extends SyncRecord
>(
	server: T,
	client: T
): T {
	const serverTime =
		getTimestamp(
			server.updatedAt
		);

	const clientTime =
		getTimestamp(
			client.updatedAt
		);

	const serverValid =
		isValidTimestamp(
			server.updatedAt
		);

	const clientValid =
		isValidTimestamp(
			client.updatedAt
		);

	let updatedAt =
		server.updatedAt;

	if (
		clientValid &&
		(!serverValid ||
			clientTime > serverTime)
	) {
		updatedAt =
			client.updatedAt;
	}

	return {
		...server,
		...client,

		id: server.id,

		updatedAt
	};
}

/* ============================================================
 * RESOLVE CONFLICT
 * ============================================================ */

/**
 * Resolve a synchronization conflict
 * using the requested strategy.
 */
export function resolveConflict<
	T extends SyncRecord
>(
	server: T,
	client: T,
	strategy: ConflictStrategy
): T {
	switch (strategy) {
		case "SERVER_WINS":
			return serverWins(
				server,
				client
			);

		case "CLIENT_WINS":
			return clientWins(
				server,
				client
			);

		case "LATEST":
			return latestWins(
				server,
				client
			);

		case "MERGE":
			return mergeRecords(
				server,
				client
			);

		default:
			/*
			 * Defensive fallback.
			 *
			 * ConflictStrategy is already a closed
			 * union, but keeping a deterministic fallback
			 * protects this function if the value comes
			 * from external/untyped data.
			 */
			return latestWins(
				server,
				client
			);
	}
}
