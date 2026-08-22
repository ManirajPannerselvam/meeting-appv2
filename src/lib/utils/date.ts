export function formatDate(
	date: string | Date | null | undefined,
	options: Intl.DateTimeFormatOptions = { 
	year: 'numeric', 
	month: 'short', 
	day: '2-digit' 
	}
): string {
	if (!date) return '-';
	try {
		return new Date(date).toLocaleDateString('en-IN', options);
	} catch {
		return '-';
	}
}

export function formatDateTime(
	date: string | Date | null | undefined
): string {
	if (!date) return '-';
	try {
		return new Date(date).toLocaleString('en-IN', {
			year: 'numeric',
			month: 'short', 
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
	});
	} catch {
		return '-';
	}
}

export function formatTime(date: string | Date | null | undefined): string {
	if (!date) return '-';
	try {
		return new Date(date).toLocaleTimeString('en-IN', {
			hour: '2-digit',
			minute: '2-digit'
	});
	} catch {
		return '-';
	}
}

// For "2 hours ago"
export function timeAgo(date: string | Date): string {
	const now = new Date();
	const past = new Date(date);
	const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
	
	if (diff < 60) return 'Just now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}