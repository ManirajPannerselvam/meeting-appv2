
/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/indexeddb.ts
 * ============================================================
 * PURPOSE
 *   IndexedDB wrapper for offline-first support.
 *
 * DESCRIPTION
 *   Stores:
 *     - Pending report queue
 *     - Pending chat queue
 *     - Cached templates
 *     - Cached reports
 *     - Cached chat messages
 *
 * NOTE
 *   This file ONLY manages IndexedDB.
 *   No Supabase logic.
 *   No business logic.
 * ============================================================
 */

const DATABASE_NAME = "temple-operations";
const DATABASE_VERSION = 1;

export const STORES = {
	REPORT_QUEUE: "report_queue",
	CHAT_QUEUE: "chat_queue",
	TEMPLATES: "templates",
	REPORTS: "reports",
	CHAT_MESSAGES: "chat_messages"
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open IndexedDB
 */
export function openDatabase(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(
			DATABASE_NAME,
			DATABASE_VERSION
		);

		request.onerror = () => reject(request.error);

		request.onsuccess = () => {
			const db = request.result;

			db.onversionchange = () => {
				db.close();
				dbPromise = null;
			};

			resolve(db);
		};

		request.onupgradeneeded = () => {
			const db = request.result;

			Object.values(STORES).forEach((storeName) => {
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, {
						keyPath: "id"
					});
				}
			});
		};
	});

	return dbPromise;
}

/**
 * Initialize Database
 * (Used by init.ts)
 */
export async function initializeDatabase(): Promise<void> {
	await openDatabase();
}

/**
 * Backward compatibility
 */
export const initializeOffline = initializeDatabase;

/**
 * Delete Database
 */
export async function deleteDatabase(): Promise<void> {
	if (dbPromise) {
		const db = await dbPromise;
		db.close();
		dbPromise = null;
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DATABASE_NAME);

		request.onsuccess = () => resolve();

		request.onerror = () => reject(request.error);

		request.onblocked = () =>
			reject(new Error("Database deletion blocked."));
	});
}

/**
 * Get Object Store
 */
async function getStore(
	storeName: StoreName,
	mode: IDBTransactionMode = "readonly"
): Promise<IDBObjectStore> {
	const db = await openDatabase();

	return db
		.transaction(storeName, mode)
		.objectStore(storeName);
}

/**
 * Save one record
 */
export async function put<T>(
	storeName: StoreName,
	value: T
): Promise<void> {
	const store = await getStore(storeName, "readwrite");

	return new Promise((resolve, reject) => {
		const request = store.put(value);

		request.onsuccess = () => resolve();

		request.onerror = () => reject(request.error);
	});
}

/**
 * Save multiple records
 */
export async function putMany<T>(
	storeName: StoreName,
	values: T[]
): Promise<void> {
	const db = await openDatabase();

	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, "readwrite");
		const store = tx.objectStore(storeName);

		values.forEach((value) => store.put(value));

		tx.oncomplete = () => resolve();

		tx.onerror = () => reject(tx.error);
	});
}

/**
 * Get one record
 */
export async function get<T>(
	storeName: StoreName,
	id: IDBValidKey
): Promise<T | undefined> {
	const store = await getStore(storeName);

	return new Promise((resolve, reject) => {
		const request = store.get(id);

		request.onsuccess = () =>
			resolve(request.result as T | undefined);

		request.onerror = () => reject(request.error);
	});
}

/**
 * Record exists?
 */
export async function exists(
	storeName: StoreName,
	id: IDBValidKey
): Promise<boolean> {
	const record = await get(storeName, id);
	return record !== undefined;
}

/**
 * Get all records
 */
export async function getAll<T>(
	storeName: StoreName
): Promise<T[]> {
	const store = await getStore(storeName);

	return new Promise((resolve, reject) => {
		const request = store.getAll();

		request.onsuccess = () =>
			resolve(request.result as T[]);

		request.onerror = () => reject(request.error);
	});
}

/**
 * Count records
 */
export async function count(
	storeName: StoreName
): Promise<number> {
	const store = await getStore(storeName);

	return new Promise((resolve, reject) => {
		const request = store.count();

		request.onsuccess = () =>
			resolve(request.result);

		request.onerror = () => reject(request.error);
	});
}

/**
 * Delete one record
 */
export async function remove(
	storeName: StoreName,
	id: IDBValidKey
): Promise<void> {
	const store = await getStore(storeName, "readwrite");

	return new Promise((resolve, reject) => {
		const request = store.delete(id);

		request.onsuccess = () => resolve();

		request.onerror = () => reject(request.error);
	});
}

/**
 * Clear store
 */
export async function clear(
	storeName: StoreName
): Promise<void> {
	const store = await getStore(storeName, "readwrite");

	return new Promise((resolve, reject) => {
		const request = store.clear();

		request.onsuccess = () => resolve();

		request.onerror = () => reject(request.error);
	});
}
