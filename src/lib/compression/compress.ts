/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/compression/compress.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Compress report JSON before storing in Supabase.
 *
 * DESCRIPTION
 *   - Replace long keys with short dictionary keys
 *   - GZIP JSON using pako
 *   - Return Base64 string for storage/transmission
 *
 * DEPENDS ON
 *   dict.ts
 *   pako
 * ============================================================
 */

import pako from 'pako';
import { getShortKey } from './dict';

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/**
 * Recursively replace long keys with short keys.
 */
function compressKeys(value: JsonValue): JsonValue {
	if (Array.isArray(value)) {
		return value.map(compressKeys);
	}

	if (value !== null && typeof value === 'object') {
		const result: Record<string, JsonValue> = {};

		for (const [key, child] of Object.entries(value)) {
			result[getShortKey(key)] = compressKeys(child);
		}

		return result;
	}

	return value;
}

/**
 * Convert Uint8Array to Base64.
 */
function uint8ToBase64(data: Uint8Array): string {
	let binary = '';

	for (const byte of data) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

/**
 * Compress any JSON-compatible object.
 */
export function compress<T>(data: T): string {
	const compressedObject = compressKeys(
		data as JsonValue
	);

	const json = JSON.stringify(compressedObject);

	const gzip = pako.gzip(json);

	return uint8ToBase64(gzip);
}

export default compress;