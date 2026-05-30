export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return diffMinutes <= 1 ? "たった今" : `${diffMinutes}分前`;
		}
		return `${diffHours}時間前`;
	}
	if (diffDays === 1) {
		return "昨日";
	}
	if (diffDays < 7) {
		return `${diffDays}日前`;
	}
	if (diffDays < 30) {
		const diffWeeks = Math.floor(diffDays / 7);
		return `${diffWeeks}週間前`;
	}
	if (diffDays < 365) {
		const diffMonths = Math.floor(diffDays / 30);
		return `${diffMonths}ヶ月前`;
	}
	const diffYears = Math.floor(diffDays / 365);
	return `${diffYears}年前`;
}

export function formatMemberSince(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return `${year}年${month}月から`;
}
