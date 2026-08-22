export function formatCurrency(
	amount: number | string | null | undefined,
	currency = 'INR',
	locale = 'en-IN'
): string {
	if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0';
	
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(Number(amount));
	} catch {
		return `₹${Number(amount).toLocaleString()}`;
	}
}

export function formatNumber(
	num: number | string | null | undefined
): string {
	if (num === null || num === undefined || isNaN(Number(num))) return '0';
	return Number(num).toLocaleString('en-IN');
}