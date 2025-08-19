/**
 * Work Actions - ビジネスロジック（純粋関数）
 *
 * WorkDataに対する操作を純粋関数として定義
 * 副作用なし、同じ入力には必ず同じ出力
 */

import type { WorkData, WorkUpdate } from "../models/work-data";

/**
 * 日付ユーティリティ
 */
const daysSince = (dateStr: string): number => {
	const date = new Date(dateStr);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Work に関するビジネスロジック
 */
export const WorkActions = {
	/**
	 * 新作判定（30日以内）
	 */
	isNewRelease: (work: WorkData): boolean => {
		if (!work.releaseDate) return false;
		return daysSince(work.releaseDate) <= 30;
	},

	/**
	 * セール中判定
	 */
	isOnSale: (work: WorkData): boolean => {
		return (work.price.discountRate ?? 0) > 0;
	},

	/**
	 * 価格更新
	 */
	updatePrice: (work: WorkData, newPrice: number, originalPrice?: number): WorkData => {
		const discountRate =
			originalPrice && originalPrice > newPrice
				? Math.round((1 - newPrice / originalPrice) * 100)
				: undefined;

		return {
			...work,
			price: {
				current: newPrice,
				original: originalPrice,
				discountRate,
				currency: work.price.currency || "JPY",
			},
			lastModified: new Date().toISOString(),
		};
	},

	/**
	 * タイトル更新
	 */
	updateTitle: (work: WorkData, title: string, maskedTitle?: string): WorkData => ({
		...work,
		title,
		maskedTitle: maskedTitle || work.maskedTitle,
		lastModified: new Date().toISOString(),
	}),

	/**
	 * タグ追加
	 */
	addTag: (work: WorkData, tag: string): WorkData => {
		if (work.tags?.includes(tag)) return work;

		return {
			...work,
			tags: [...(work.tags || []), tag],
			lastModified: new Date().toISOString(),
		};
	},

	/**
	 * タグ削除
	 */
	removeTag: (work: WorkData, tag: string): WorkData => ({
		...work,
		tags: work.tags?.filter((t) => t !== tag),
		lastModified: new Date().toISOString(),
	}),

	/**
	 * 表示用価格フォーマット
	 */
	formatPrice: (work: WorkData, locale: "ja" | "en" = "ja"): string => {
		const formatter = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
			style: "currency",
			currency: work.price.currency || "JPY",
		});
		return formatter.format(work.price.current);
	},

	/**
	 * 割引率表示
	 */
	formatDiscount: (work: WorkData): string | null => {
		if (!work.price.discountRate) return null;
		return `${work.price.discountRate}% OFF`;
	},

	/**
	 * 表示用タイトル取得
	 */
	getDisplayTitle: (work: WorkData): string => {
		return work.maskedTitle || work.title;
	},

	/**
	 * 作品URLの生成
	 */
	generateWorkUrl: (work: WorkData): string => {
		const site = work.isAdult ? "maniax" : "home";
		return `https://www.dlsite.com/${site}/work/=/product_id/${work.productId}.html`;
	},

	/**
	 * サムネイルURLの生成
	 */
	generateThumbnailUrl: (work: WorkData, size: "main" | "thum" = "main"): string => {
		if (work.thumbnailUrl) return work.thumbnailUrl;

		// RJ123456 -> RJ123000 for folder path
		const match = work.productId.match(/^([A-Z]+)(\d+)$/);
		if (!match) return "";

		const prefix = match[1];
		const number = match[2];
		if (!number || number.length < 3) return "";
		const groupNumber = `${number.slice(0, -3)}000`;
		const folder = `${prefix}${groupNumber}`;

		return `https://img.dlsite.jp/modpub/images2/work/doujin/${folder}/${work.productId}_img_${size}.jpg`;
	},

	/**
	 * 人気度スコアの計算
	 */
	calculatePopularityScore: (work: WorkData): number => {
		const ratingScore = (work.rating?.average || 0) * 20; // max 100
		const reviewScore = Math.min((work.rating?.count || 0) / 10, 10); // max 10
		const salesScore = Math.min((work.saleCount || 0) / 100, 30); // max 30
		const recencyScore = WorkActions.isNewRelease(work) ? 10 : 0; // max 10

		const total = ratingScore + reviewScore + salesScore + recencyScore;
		return Math.min(Math.round(total), 100); // Cap at 100
	},

	/**
	 * 評価の信頼度判定
	 */
	getRatingReliability: (work: WorkData): "high" | "medium" | "low" | "none" => {
		const count = work.rating?.count || 0;
		if (count === 0) return "none";
		if (count >= 100) return "high";
		if (count >= 20) return "medium";
		return "low";
	},

	/**
	 * 部分更新の適用
	 */
	applyUpdate: (work: WorkData, update: WorkUpdate): WorkData => ({
		...work,
		...update,
		lastModified: new Date().toISOString(),
	}),

	/**
	 * 計算済みプロパティの生成
	 */
	computeProperties: (work: WorkData): WorkData => ({
		...work,
		_computed: {
			isNewRelease: WorkActions.isNewRelease(work),
			isOnSale: WorkActions.isOnSale(work),
			displayTitle: WorkActions.getDisplayTitle(work),
			formattedPrice: WorkActions.formatPrice(work),
		},
	}),

	/**
	 * 成人向けコンテンツかどうかの判定
	 */
	isAdultContent: (work: WorkData): boolean => {
		return work.ageRating === "R18" || work.ageRating === "R-18" || work.ageRating === "18禁";
	},
} as const;
