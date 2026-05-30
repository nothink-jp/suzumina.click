import type { DateRangePreset } from "../search-filters";

export function getDateRangeFromPreset(preset: DateRangePreset): {
	from: Date;
	to: Date;
} {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	switch (preset) {
		case "today":
			return {
				from: today,
				to: new Date(today.getTime() + 24 * 60 * 60 * 1000),
			};

		case "this_week": {
			const dayOfWeek = today.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const weekStart = new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
			return {
				from: weekStart,
				to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
			};
		}

		case "this_month": {
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			return {
				from: monthStart,
				to: monthEnd,
			};
		}

		case "last_30_days": {
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			return {
				from: thirtyDaysAgo,
				to: now,
			};
		}

		case "custom":
			return {
				from: today,
				to: now,
			};
	}
}
