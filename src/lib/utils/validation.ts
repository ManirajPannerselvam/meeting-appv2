export function required(value: unknown) {

	return value !== null &&
		value !== undefined &&
		value !== "";

}

export function isEmail(email: string) {

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

export function minLength(

	value: string,

	length: number

) {

	return value.length >= length;

}