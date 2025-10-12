import type { WorkDocument } from "@suzumina.click/shared-types";
import { filterR18Content, filterWorksByLanguage } from "@suzumina.click/shared-types";

/**
 * 拡張検索パラメータ（統合データ構造対応）
 */
export interface EnhancedSearchParams {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	category?: string;
	language?: string;
	voiceActors?: string[];
	genres?: string[];
	priceRange?: {
		min?: number;
		max?: number;
	};
	ratingRange?: {
		min?: number;
		max?: number;
	};
	hasHighResImage?: boolean;
	_strategy?: "minimal" | "standard" | "comprehensive";
	ageRating?: string[];
	showR18?: boolean;
}

/**
 * 検索テキストで作品をフィルタリング
 */
export function filterWorksBySearchText(works: WorkDocument[], searchText: string): WorkDocument[] {
	const lowerSearch = searchText.toLowerCase();
	return works.filter((work) => {
		const searchableText = [
			work.title,
			work.circle,
			work.description,
			...(work.creators?.voice_by?.map((c) => c.name) || []),
			...(work.creators?.scenario_by?.map((c) => c.name) || []),
			...(work.creators?.illust_by?.map((c) => c.name) || []),
			...(work.creators?.music_by?.map((c) => c.name) || []),
			...(work.creators?.others_by?.map((c) => c.name) || []),
			...(Array.isArray(work.genres) ? work.genres.filter((g) => typeof g === "string") : []),
		]
			.filter((text) => typeof text === "string")
			.join(" ")
			.toLowerCase();

		return searchableText.includes(lowerSearch);
	});
}

/**
 * 統合データ構造による拡張検索フィルタリング
 */
export function filterWorksByUnifiedData(
	works: WorkDocument[],
	params: EnhancedSearchParams,
): WorkDocument[] {
	let filteredWorks = [...works];

	// 基本検索（タイトル・サークル・説明文・統合クリエイター情報）
	if (params.search) {
		filteredWorks = filterWorksBySearchText(filteredWorks, params.search);
	}

	// カテゴリーフィルタリング
	if (params.category && params.category !== "all") {
		filteredWorks = filteredWorks.filter((work) => work.category === params.category);
	}

	// 言語フィルタリング
	if (params.language && params.language !== "all") {
		filteredWorks = filterWorksByLanguage(filteredWorks, params.language);
	}

	// 声優フィルタリング（統合データ活用）
	if (params.voiceActors && params.voiceActors.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workVoiceActorNames = work.creators?.voice_by?.map((c) => c.name) || [];
			return params.voiceActors?.some((va) =>
				workVoiceActorNames.some(
					(wva) => typeof wva === "string" && typeof va === "string" && wva.includes(va),
				),
			);
		});
	}

	// ジャンルフィルタリング（AND検索）
	if (params.genres && params.genres.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workGenres = Array.isArray(work.genres) ? work.genres : [];
			return params.genres?.every((genre) =>
				workGenres.some(
					(wg) => typeof wg === "string" && typeof genre === "string" && wg.includes(genre),
				),
			);
		});
	}

	// 価格範囲フィルタリング
	if (params.priceRange) {
		filteredWorks = filteredWorks.filter((work) => {
			const price = work.price?.current || 0;
			const { min = 0, max = Number.MAX_SAFE_INTEGER } = params.priceRange || {};
			return price >= min && price <= max;
		});
	}

	// 評価範囲フィルタリング
	if (params.ratingRange) {
		filteredWorks = filteredWorks.filter((work) => {
			const rating = work.rating?.stars || 0;
			const { min = 0, max = 5 } = params.ratingRange || {};
			return rating >= min && rating <= max;
		});
	}

	// 高解像度画像有無フィルタリング
	if (params.hasHighResImage !== undefined) {
		filteredWorks = filteredWorks.filter((work) => {
			const hasHighRes = !!(work.highResImageUrl && work.highResImageUrl.trim() !== "");
			return hasHighRes === params.hasHighResImage;
		});
	}

	// 年齢制限フィルタリング
	if (params.showR18 === false) {
		const getAgeRatingFromWork = (work: WorkDocument): string | undefined => {
			return work.ageRating || undefined;
		};
		filteredWorks = filterR18Content(filteredWorks, getAgeRatingFromWork);
	}

	// 特定の年齢制限でフィルタリング
	if (params.ageRating && params.ageRating.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workAgeRating = work.ageRating || "";
			return params.ageRating?.some(
				(rating) =>
					typeof workAgeRating === "string" &&
					typeof rating === "string" &&
					(workAgeRating.includes(rating) || rating === workAgeRating),
			);
		});
	}

	return filteredWorks;
}

/**
 * 複雑なフィルタリングが必要かチェック
 */
export function needsComplexFiltering(params: EnhancedSearchParams): boolean {
	return !!(
		params.search ||
		(params.language && params.language !== "all") ||
		params.voiceActors?.length ||
		params.genres?.length ||
		params.priceRange ||
		params.ratingRange ||
		params.hasHighResImage !== undefined ||
		(params.ageRating && params.ageRating.length > 1) ||
		params.showR18 === false
	);
}
