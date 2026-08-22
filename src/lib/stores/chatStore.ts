import { writable } from "svelte/store";

export const contacts = writable([]);
export const groups = writable([]);
export const messages = writable([]);

export const selectedContact = writable(null);
export const selectedGroup = writable(null);