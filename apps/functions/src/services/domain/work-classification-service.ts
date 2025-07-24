/**
 * Work Classification Domain Service
 *
 * 作品の分類・カテゴライズに関するビジネスロジックを集約
 */

import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";

export class WorkClassificationService {
	/**
	 * 作品のメインカテゴリを判定
	 */
	static determineMainCategory(work: OptimizedFirestoreDLsiteWorkData): string {
		// workFormat から主要カテゴリを判定
		const format = work.workFormat?.toLowerCase() || "";

		if (format.includes("voice") || format.includes("音声") || format.includes("ボイス")) {
			return "voice";
		}
		if (format.includes("game") || format.includes("ゲーム")) {
			return "game";
		}
		if (format.includes("comic") || format.includes("manga") || format.includes("漫画")) {
			return "comic";
		}
		if (format.includes("cg") || format.includes("illust") || format.includes("イラスト")) {
			return "illustration";
		}
		if (format.includes("novel") || format.includes("小説")) {
			return "novel";
		}
		if (format.includes("video") || format.includes("動画")) {
			return "video";
		}

		return "other";
	}

	/**
	 * ASMRコンテンツかどうか判定
	 */
	static isASMRContent(work: OptimizedFirestoreDLsiteWorkData): boolean {
		const searchTargets = [
			work.title.toLowerCase(),
			...work.genres.map((g) => g.toLowerCase()),
			work.workFormat?.toLowerCase() || "",
		];

		const asmrKeywords = ["asmr", "音声作品", "ボイス", "音声", "耳かき", "囁き"];

		return searchTargets.some((target) => asmrKeywords.some((keyword) => target.includes(keyword)));
	}

	/**
	 * R18コンテンツかどうか判定
	 */
	static isAdultContent(work: OptimizedFirestoreDLsiteWorkData): boolean {
		// ageRating から判定
		const ageRating = work.ageRating || "";
		return ageRating === "R18" || ageRating.includes("18") || ageRating === "Adult";
	}

	/**
	 * 作品の人気度を計算（1-100のスコア）
	 */
	static calculatePopularityScore(work: OptimizedFirestoreDLsiteWorkData): number {
		let score = 0;

		// レビュー評価による加点（最大40点）
		if (work.rating?.stars) {
			score += (work.rating.stars / 50) * 40;
		}

		// レビュー数による加点（最大30点）
		const reviewCount = work.rating?.count || 0;
		if (reviewCount > 0) {
			// 対数スケールで計算（1000件で満点）
			score += Math.min(30, (Math.log10(reviewCount + 1) / 3) * 30);
		}

		// ウィッシュリスト数による加点は廃止（DLsite API提供終了のため）
		// 代わりに評価とレビュー数の重みを調整

		// 新作ボーナス（最大10点）
		if (work.releaseDateISO) {
			const releaseDate = new Date(work.releaseDateISO);
			const daysSinceRelease = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceRelease < 30) {
				score += 10 * (1 - daysSinceRelease / 30);
			}
		}

		return Math.round(Math.min(100, score));
	}

	/**
	 * 作品のタグを正規化
	 */
	static normalizeTags(genres: string[]): string[] {
		const tagMap: Record<string, string> = {
			耳かき: "ASMR",
			ボイス: "音声作品",
			えっち: "R18",
			成人向け: "R18",
			// 追加のタグマッピング
		};

		const normalizedTags = new Set<string>();

		for (const genre of genres) {
			const normalized = tagMap[genre] || genre;
			normalizedTags.add(normalized);
		}

		return Array.from(normalizedTags).sort();
	}

	/**
	 * シリーズ作品かどうか判定
	 */
	static isSeriesWork(work: OptimizedFirestoreDLsiteWorkData): boolean {
		const title = work.title.toLowerCase();
		const seriesPatterns = [
			/第\d+話/,
			/vol\.\s*\d+/i,
			/chapter\s*\d+/i,
			/part\s*\d+/i,
			/その\d+/,
			/episode\s*\d+/i,
			/#\d+/,
		];

		return seriesPatterns.some((pattern) => pattern.test(title));
	}

	/**
	 * 作品のターゲット層を推定
	 */
	static estimateTargetAudience(work: OptimizedFirestoreDLsiteWorkData): {
		gender: "male" | "female" | "all";
		ageGroup: "teen" | "adult" | "all";
	} {
		const genres = work.genres.map((g) => g.toLowerCase());

		// ジェンダー推定
		let gender: "male" | "female" | "all" = "all";

		const femaleKeywords = ["乙女", "女性向け", "bl", "ボーイズラブ"];
		const maleKeywords = ["男性向け", "美少女"];

		if (genres.some((g) => femaleKeywords.some((k) => g.includes(k)))) {
			gender = "female";
		} else if (genres.some((g) => maleKeywords.some((k) => g.includes(k)))) {
			gender = "male";
		}

		// 年齢層推定
		const ageGroup = WorkClassificationService.isAdultContent(work) ? "adult" : "all";

		return { gender, ageGroup };
	}

	/**
	 * 類似作品のスコアを計算
	 */
	static calculateSimilarityScore(
		work1: OptimizedFirestoreDLsiteWorkData,
		work2: OptimizedFirestoreDLsiteWorkData,
	): number {
		let score = 0;

		// 同じサークルの作品（40点）
		if (work1.circleId === work2.circleId) {
			score += 40;
		}

		// ジャンルの一致度（最大30点）
		const commonGenres = work1.genres.filter((g) => work2.genres.includes(g));
		const genreScore =
			(commonGenres.length / Math.max(work1.genres.length, work2.genres.length)) * 30;
		score += genreScore;

		// カテゴリの一致（20点）
		if (
			WorkClassificationService.determineMainCategory(work1) ===
			WorkClassificationService.determineMainCategory(work2)
		) {
			score += 20;
		}

		// 価格帯の近さ（最大10点）
		const priceDiff = Math.abs(work1.price.current - work2.price.current);
		const priceScore = Math.max(0, 10 - priceDiff / 100);
		score += priceScore;

		return Math.round(score);
	}
}
