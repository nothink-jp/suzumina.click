import type { AudioButtonQuery } from "@/types/audio-button";

// AdvancedFilters type definition (previously from advanced-filter-panel)
export interface AdvancedFilters {
	playCount?: {
		min?: number;
		max?: number;
	};
	likeCount?: {
		min?: number;
		max?: number;
	};
	favoriteCount?: {
		min?: number;
		max?: number;
	};
	createdAt?: {
		from?: Date;
		to?: Date;
	};
	createdBy?: string;
}

// SearchParams型定義
export interface SearchParams {
	q?: string;
	tags?: string;
	sort?: string;
	page?: string;
	limit?: string;
	sourceVideoId?: string;
	// 高度フィルタパラメータ
	playCountMin?: string;
	playCountMax?: string;
	likeCountMin?: string;
	likeCountMax?: string;
	favoriteCountMin?: string;
	favoriteCountMax?: string;
	createdAfter?: string;
	createdBefore?: string;
	createdBy?: string;
}

// Helper function to parse numeric range from search params
export const parseNumericRange = (minParam?: string, maxParam?: string) => ({
	min: minParam ? Number(minParam) : undefined,
	max: maxParam ? Number(maxParam) : undefined,
});

// Helper function to parse date range from search params
export const parseDateRange = (fromParam?: string, toParam?: string) => ({
	from: fromParam ? new Date(fromParam) : undefined,
	to: toParam ? new Date(toParam) : undefined,
});

// Helper function to initialize advanced filters from search params
export const createAdvancedFiltersFromParams = (params: SearchParams): AdvancedFilters => ({
	playCount: parseNumericRange(params.playCountMin, params.playCountMax),
	likeCount: parseNumericRange(params.likeCountMin, params.likeCountMax),
	favoriteCount: parseNumericRange(params.favoriteCountMin, params.favoriteCountMax),
	createdAt: parseDateRange(params.createdAfter, params.createdBefore),
	createdBy: params.createdBy || undefined,
});

// Helper function to convert advanced filters to URL params
export const convertFiltersToParams = (
	filters: AdvancedFilters,
): Record<string, string | undefined> => ({
	playCountMin: filters.playCount?.min?.toString(),
	playCountMax: filters.playCount?.max?.toString(),
	likeCountMin: filters.likeCount?.min?.toString(),
	likeCountMax: filters.likeCount?.max?.toString(),
	favoriteCountMin: filters.favoriteCount?.min?.toString(),
	favoriteCountMax: filters.favoriteCount?.max?.toString(),
	createdAfter: filters.createdAt?.from?.toISOString(),
	createdBefore: filters.createdAt?.to?.toISOString(),
	createdBy: filters.createdBy,
});

// クエリビルダークラス
export class AudioButtonQueryBuilder {
	private query: Partial<AudioButtonQuery> = {};

	constructor(itemsPerPage: number, currentPage: number) {
		this.query = {
			limit: itemsPerPage,
			includeTotalCount: true,
			onlyPublic: true,
		};
		if (currentPage > 1) {
			this.query.page = currentPage;
		}
	}

	addBasicSearchParams(params: SearchParams): this {
		if (params.q) this.query.search = params.q;
		if (params.tags) this.query.tags = params.tags.split(",");
		if (params.sort)
			this.query.sortBy = params.sort as "newest" | "oldest" | "popular" | "mostPlayed";
		if (params.sourceVideoId) this.query.sourceVideoId = params.sourceVideoId;
		return this;
	}

	addPlayAndLikeParams(params: SearchParams): this {
		if (params.playCountMin) this.query.playCountMin = Number(params.playCountMin);
		if (params.playCountMax) this.query.playCountMax = Number(params.playCountMax);
		if (params.likeCountMin) this.query.likeCountMin = Number(params.likeCountMin);
		if (params.likeCountMax) this.query.likeCountMax = Number(params.likeCountMax);
		return this;
	}

	addFavoriteParams(params: SearchParams): this {
		if (params.favoriteCountMin) this.query.favoriteCountMin = Number(params.favoriteCountMin);
		if (params.favoriteCountMax) this.query.favoriteCountMax = Number(params.favoriteCountMax);
		return this;
	}

	addDateAndUserParams(params: SearchParams): this {
		if (params.createdAfter) this.query.createdAfter = params.createdAfter;
		if (params.createdBefore) this.query.createdBefore = params.createdBefore;
		if (params.createdBy) this.query.createdBy = params.createdBy;
		return this;
	}

	build(): Partial<AudioButtonQuery> {
		return this.query;
	}
}

// フィルタが適用されているかどうかを判定
export const hasFilters = (params: SearchParams): boolean => {
	return !!(
		params.q ||
		params.tags ||
		params.sourceVideoId ||
		params.playCountMin ||
		params.playCountMax ||
		params.likeCountMin ||
		params.likeCountMax ||
		params.favoriteCountMin ||
		params.favoriteCountMax ||
		params.createdAfter ||
		params.createdBefore ||
		params.createdBy
	);
};
