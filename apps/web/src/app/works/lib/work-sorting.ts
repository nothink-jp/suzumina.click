import type { WorkDocument } from "@suzumina.click/shared-types";

/**
 * 作品リストをソート
 */
export function sortWorks(works: WorkDocument[], sort: string): WorkDocument[] {
	const sorted = [...works];

	switch (sort) {
		case "oldest":
			return sorted.sort((a, b) => {
				const dateA = a.releaseDateISO || "";
				const dateB = b.releaseDateISO || "";
				return dateA.localeCompare(dateB);
			});
		case "price_low":
			return sorted.sort((a, b) => (a.price?.current || 0) - (b.price?.current || 0));
		case "price_high":
			return sorted.sort((a, b) => (b.price?.current || 0) - (a.price?.current || 0));
		case "rating":
			return sorted.sort((a, b) => (b.rating?.stars || 0) - (a.rating?.stars || 0));
		case "popular":
			return sorted.sort((a, b) => (b.rating?.count || 0) - (a.rating?.count || 0));
		default: // "newest"
			return sorted.sort((a, b) => {
				const dateA = a.releaseDateISO || "";
				const dateB = b.releaseDateISO || "";
				return dateB.localeCompare(dateA);
			});
	}
}
