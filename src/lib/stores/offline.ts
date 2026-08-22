import { writable, derived } from "svelte/store";

function createOnlineStore() {
	const { subscribe, set } = writable(navigator.onLine);
	if(typeof window !== 'undefined'){
		window.addEventListener('online', () => set(true));
		window.addEventListener('offline', () => set(false));
	}
	return { subscribe };
}

export const isOnline = createOnlineStore();
export const pendingQueueCount = writable(0); // update this in sync.ts