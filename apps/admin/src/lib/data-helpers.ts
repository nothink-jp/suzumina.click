// Admin app data processing utilities

export const formatDate = (timestamp: unknown): string => {
	if (!timestamp) return "不明";

	try {
		const typedTimestamp = timestamp as any;
		const date = typedTimestamp.toDate ? typedTimestamp.toDate() : new Date(typedTimestamp);
		if (Number.isNaN(date.getTime())) return "不明";

		return date.toLocaleDateString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "不明";
	}
};

export const formatRole = (role: string): string => {
	const roleMap: Record<string, string> = {
		admin: "管理者",
		moderator: "モデレーター",
		member: "メンバー",
	};
	return roleMap[role] || role;
};

export const formatStatus = (status: string): string => {
	const statusMap: Record<string, string> = {
		new: "新規",
		in_progress: "確認中",
		resolved: "対応済み",
		active: "アクティブ",
		inactive: "非アクティブ",
	};
	return statusMap[status] || status;
};

export const formatPriority = (priority: string): string => {
	const priorityMap: Record<string, string> = {
		high: "高",
		medium: "中",
		low: "低",
	};
	return priorityMap[priority] || priority;
};

export const formatCategory = (category: string): string => {
	const categoryMap: Record<string, string> = {
		bug: "バグ報告",
		feature: "機能リクエスト",
		question: "質問",
		other: "その他",
	};
	return categoryMap[category] || category;
};

export const formatNumber = (num: number): string => {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toLocaleString();
};

export const filterBySearch = <T extends Record<string, unknown>>(
	items: T[],
	searchTerm: string,
	searchFields: (keyof T)[],
): T[] => {
	if (!searchTerm.trim()) return items;

	const lowercaseSearch = searchTerm.toLowerCase();
	return items.filter((item) =>
		searchFields.some((field) => {
			const value = item[field];
			return value && String(value).toLowerCase().includes(lowercaseSearch);
		}),
	);
};

export const filterByStatus = <T extends { status?: string }>(items: T[], status: string): T[] => {
	if (!status || status === "all") return items;
	return items.filter((item) => item.status === status);
};

export const sortByField = <T extends Record<string, unknown>>(
	items: T[],
	field: keyof T,
	direction: "asc" | "desc" = "desc",
): T[] => {
	return [...items].sort((a, b) => {
		let aValue: any = a[field];
		let bValue: any = b[field];

		// Handle timestamps
		if (aValue?.toDate) aValue = aValue.toDate();
		if (bValue?.toDate) bValue = bValue.toDate();

		// Handle dates
		if (aValue instanceof Date) aValue = aValue.getTime();
		if (bValue instanceof Date) bValue = bValue.getTime();

		if (direction === "asc") {
			return aValue > bValue ? 1 : -1;
		}
		return aValue < bValue ? 1 : -1;
	});
};
