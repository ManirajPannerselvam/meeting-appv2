// src/lib/utils/env.ts
export function isTauri(): boolean {
	// @ts-ignore
	return !!(window as any).__TAURI__;
}