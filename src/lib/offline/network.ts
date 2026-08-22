/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/network.ts
 * ============================================================
 * PURPOSE
 *   Network connectivity manager.
 *
 * DESCRIPTION
 *   - Tracks online/offline status.
 *   - Exposes reactive Svelte stores.
 *   - No sync logic.
 *   - No IndexedDB logic.
 * ============================================================
 */

import { readable, writable } from "svelte/store";

/* ============================================================
 * ENVIRONMENT
 * ============================================================ */

const isBrowser =
	typeof window !== "undefined";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface NetworkState {
	online: boolean;
	effectiveType?: string;
	downlink?: number;
	rtt?: number;
	saveData?: boolean;
}

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialOnline =
	isBrowser
		? navigator.onLine
		: true;

/* ============================================================
 * BASIC ONLINE STATUS
 * ============================================================ */

/**
 * Reactive online/offline status.
 *
 * Existing consumers can continue using:
 *
 *   $isOnline
 */
export const isOnline =
	writable<boolean>(
		initialOnline
	);

/**
 * Last time network connectivity changed.
 */
export const lastNetworkChange =
	writable<Date>(
		new Date()
	);

/* ============================================================
 * NETWORK STORE
 * ============================================================ */

/**
 * Reactive network information.
 *
 * This store tracks:
 *   - online/offline state
 *   - effective connection type
 *   - estimated downlink
 *   - estimated RTT
 *   - save-data preference
 */
export const network =
	readable<NetworkState>(
		{
			online: initialOnline
		},
		(set) => {
			if (!isBrowser) {
				return () => {};
			}

			type NetworkInformation = {
				effectiveType?: string;
				downlink?: number;
				rtt?: number;
				saveData?: boolean;
			};

			const getConnection =
				(): NetworkInformation | undefined => {
					return (
						navigator as Navigator & {
							connection?: NetworkInformation;
						}
					).connection;
				};

			const update = (): void => {
				const connection =
					getConnection();

				const state: NetworkState = {
					online:
						navigator.onLine,

					effectiveType:
						connection?.effectiveType,

					downlink:
						connection?.downlink,

					rtt:
						connection?.rtt,

					saveData:
						connection?.saveData
				};

				isOnline.set(
					state.online
				);

				lastNetworkChange.set(
					new Date()
				);

				set(state);
			};

			/* Initial browser state */
			update();

			/* Browser connectivity events */
			window.addEventListener(
				"online",
				update
			);

			window.addEventListener(
				"offline",
				update
			);

			return (): void => {
				window.removeEventListener(
					"online",
					update
				);

				window.removeEventListener(
					"offline",
					update
				);
			};
		}
	);

/* ============================================================
 * IMPERATIVE STATUS CHECK
 * ============================================================ */

/**
 * Return the current browser connectivity state.
 *
 * On the server, true is returned so this helper
 * remains SSR-safe.
 */
export function online(): boolean {
	if (!isBrowser) {
		return true;
	}

	return navigator.onLine;
}