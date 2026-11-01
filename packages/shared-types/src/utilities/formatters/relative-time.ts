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
	return formatDaysAgo(diffDays);
}

/**
 * 1 日以上前の日数を「昨日」「N日前」「N週間前」「Nヶ月前」「N年前」にする（しきい値の正本）
 *
 * 日数の数え方は呼び出し側が決める（経過時間で切り捨てるか、暦日の差か）。
 * 1 以上を前提にした表記で、1 未満（0・負数・NaN）は意味のある文言にならない。
 * 0 以下の扱い（「今日」「たった今」等）は呼び出し側で先に分岐する
 * （formatRelativeTime は未来日時で負数を渡し「-1日前」になる＝既存挙動のまま）
 */
export function formatDaysAgo(days: number): string {
	if (days === 1) {
		return "昨日";
	}
	if (days < 7) {
		return `${days}日前`;
	}
	if (days < 30) {
		return `${Math.floor(days / 7)}週間前`;
	}
	if (days < 365) {
		return `${Math.floor(days / 30)}ヶ月前`;
	}
	return `${Math.floor(days / 365)}年前`;
}

export function formatMemberSince(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return `${year}年${month}月から`;
}
