/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/conflict.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Detect and resolve synchronization conflicts.
 *
 * DESCRIPTION
 *   Centralized conflict resolution used by:
 *     - Daily Reports
 *     - Temple Chat
 *     - Future offline modules
 *
 * DEFAULT STRATEGY
 *   Last-Write-Wins (updated_at)
 *
 * FUTURE
 *   - Field level merge
 *   - Manual conflict resolution UI
 *   - Admin conflict audit
 * ============================================================
 */

export type ConflictStrategy =
	| 'last-write-wins'
	| 'server'
	| 'client'
	| 'manual';

export interface ConflictResult<T> {
	hasConflict: boolean;
	resolved: T;
	strategy: ConflictStrategy;
}

export interface TimestampedRecord {
	updated_at: string;
}

/**
 * Detect conflict
 */
export function hasConflict<T extends TimestampedRecord>(
	local: T,
	server: T
): boolean {
	return local.updated_at !== server.updated_at;
}

/**
 * Last Write Wins
 */
export function lastWriteWins<T extends TimestampedRecord>(
	local: T,
	server: T
): ConflictResult<T> {
	if (
		new Date(local.updated_at).getTime() >=
		new Date(server.updated_at).getTime()
	) {
		return {
			hasConflict: true,
			resolved: local,
			strategy: 'last-write-wins'
		};
	}

	return {
		hasConflict: true,
		resolved: server,
		strategy: 'last-write-wins'
	};
}

/**
 * Always keep server version
 */
export function serverWins<T>(
	server: T
): ConflictResult<T> {
	return {
		hasConflict: true,
		resolved: server,
		strategy: 'server'
	};
}

/**
 * Always keep client version
 */
export function clientWins<T>(
	local: T
): ConflictResult<T> {
	return {
		hasConflict: true,
		resolved: local,
		strategy: 'client'
	};
}

/**
 * Resolve conflict
 */
export function resolveConflict<
	T extends TimestampedRecord
>(
	local: T,
	server: T,
	strategy: ConflictStrategy = 'last-write-wins'
): ConflictResult<T> {
	if (!hasConflict(local, server)) {
		return {
			hasConflict: false,
			resolved: server,
			strategy
		};
	}

	switch (strategy) {
		case 'client':
			return clientWins(local);

		case 'server':
			return serverWins(server);

		case 'manual':
			return {
				hasConflict: true,
				resolved: server,
				strategy: 'manual'
			};

		default:
			return lastWriteWins(local, server);
	}
}