import type { WorkDocument } from "@suzumina.click/shared-types";

/**
 * 2つの作品間の類似スコアを計算
 */
export function calculateSimilarityScore(
	work: WorkDocument,
	baseWork: WorkDocument,
	byCircle: boolean,
	byVoiceActors: boolean,
	byGenres: boolean,
): number {
	let score = 0;

	// サークル一致（高優先度）
	if (byCircle && work.circle === baseWork.circle) {
		score += 10;
	}

	// 声優一致（統合データ活用）
	if (byVoiceActors && baseWork.creators?.voice_by && work.creators?.voice_by) {
		const baseVoiceActorNames = baseWork.creators.voice_by.map((v) => v.name);
		const workVoiceActorNames = work.creators.voice_by.map((v) => v.name);
		const commonVoiceActors = baseVoiceActorNames.filter(
			(va) =>
				typeof va === "string" &&
				workVoiceActorNames.some(
					(wva) => typeof wva === "string" && (wva.includes(va) || va.includes(wva)),
				),
		);
		score += commonVoiceActors.length * 3;
	}

	// ジャンル一致（統合データ活用）
	if (byGenres && Array.isArray(baseWork.genres) && Array.isArray(work.genres)) {
		const commonGenres = baseWork.genres.filter(
			(genre: string) =>
				typeof genre === "string" &&
				(work.genres?.some(
					(workGenre) => typeof workGenre === "string" && workGenre.includes(genre),
				) ??
					false),
		);
		score += commonGenres.length * 2;
	}

	// カテゴリ一致
	if (work.category === baseWork.category) {
		score += 1;
	}

	// 価格帯類似性
	if (work.price && baseWork.price) {
		const priceDiff = Math.abs(work.price.current - baseWork.price.current);
		if (priceDiff < 500) score += 1;
	}

	return score;
}
