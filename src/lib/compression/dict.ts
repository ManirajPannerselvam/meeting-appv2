/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/compression/dict.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Central dictionary used for JSONB key compression.
 *
 * DESCRIPTION
 *   Converts long field names into short keys before
 *   saving reports to PostgreSQL JSONB.
 *
 * NOTE
 *   This dictionary MUST remain backward compatible.
 *   Never modify existing keys.
 *   Only append new mappings.
 * ============================================================
 */

/**
 * Long Name -> Short Key
 */
export const KEY_MAP: Record<string, string> = {
	total_input: 'i',
	total_output: 'o',
	balance: 'b',
	cash: 'c',
	online: 'n',
	expense: 'e',
	donation: 'd',
	hundi: 'h',
	ticket: 't',
	prasadam: 'p',
	visitor_count: 'v',
	remarks: 'r'
};

/**
 * Short Key -> Long Name
 */
export const REVERSE_KEY_MAP: Record<string, string> =
	Object.fromEntries(
		Object.entries(KEY_MAP).map(([longKey, shortKey]) => [
			shortKey,
			longKey
		])
	);

/**
 * Dictionary Version
 *
 * Increment ONLY when adding
 * new mappings.
 */
export const DICT_VERSION = 1;

/**
 * Compress a field name
 */
export function getShortKey(key: string): string {
	return KEY_MAP[key] ?? key;
}

/**
 * Expand a field name
 */
export function getLongKey(key: string): string {
	return REVERSE_KEY_MAP[key] ?? key;
}