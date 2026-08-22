/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/compression/decompress.ts
 * Author : Your Name
 * Created : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 * Decompress report JSON retrieved from Supabase.
 * ============================================================
 */

import pako from 'pako';
import { getLongKey } from './dict';

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/**
 * Base64 -> Uint8Array
 */
function base64ToUint8(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}

/**
 * Restore compressed keys recursively.
 */
function restoreKeys(value: JsonValue): JsonValue {
	if (Array.isArray(value)) {
		return value.map(restoreKeys);
	}

	if (value!== null && typeof value === 'object') {
		const result: Record<string, JsonValue> = {};

		for (const [key, child] of Object.entries(value)) {
			result[getLongKey(key)] = restoreKeys(child);
	}

		return result;
	}

	return value;
}

/**
 * Decompress JSON object.
 */
export function decompress<T>(compressed: string): T {
	const bytes = base64ToUint8(compressed);

	// pako types: use { to: 'string' } as any to satisfy TS
	const json = pako.ungzip(bytes, { to: 'string' } as pako.InflateOptions);

	const parsed = JSON.parse(json) as JsonValue;

	return restoreKeys(parsed) as T;
}

export default decompress;