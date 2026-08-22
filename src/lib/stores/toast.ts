import { writable } from "svelte/store";

export type ToastType =
	| "success"
	| "error"
	| "warning"
	| "info";

export interface Toast {

	id: number;

	type: ToastType;

	message: string;

	duration: number;

}

const { subscribe, update } = writable<Toast[]>([]);

let nextId = 1;

function show(

	type: ToastType,

	message: string,

	duration = 3000

) {

	const id = nextId++;

	update((items) => [

		...items,

		{

			id,

			type,

			message,

			duration

		}

	]);

	setTimeout(() => {

		remove(id);

	}, duration);

}

function remove(id: number) {

	update((items) =>

		items.filter((item) => item.id !== id)

	);

}

export const toast = {

	subscribe,

	remove,

	success: (message: string) =>
		show("success", message),

	error: (message: string) =>
		show("error", message),

	warning: (message: string) =>
		show("warning", message),

	info: (message: string) =>
		show("info", message)

};