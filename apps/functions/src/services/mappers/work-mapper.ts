/**
 * Work Mapper - DLsite Individual Info API の薄い抽象化
 *
 * 新しいshared-types構造を使用した薄いマッピング層
 * ビジネスロジックはDomain Serviceに委譲
 */

import type {
	DLsiteRawApiResponse,
	LanguageDownload,
	OptimizedFirestoreDLsiteWorkData,
	PriceInfo,
	RatingInfo,
	SalesStatus,
	TranslationInfo,
	WorkCategory,
} from "@suzumina.click/shared-types";
import { DateFormatter } from "@suzumina.click/shared-types";

// 言語エディション項目の型定義
interface LanguageEditionItem {
	workno: string;
	label: string;
	lang: string;
	dl_count?: string;
	display_label?: string;
	edition_id?: number;
	edition_type?: string;
	display_order?: number;
}

/**
 * DLsite Individual Info APIからWorkエンティティへの変換
 * 薄いマッピング層として実装
 */
export class WorkMapper {
	/**
	 * Raw APIレスポンスからWorkエンティティに変換
	 */
	static toWork(raw: DLsiteRawApiResponse): OptimizedFirestoreDLsiteWorkData {
		const productId = raw.workno || raw.product_id || "";

		return {
			// === 基本識別情報 ===
			id: productId,
			productId,
			circleId: raw.maker_id,

			// === 基本作品情報 ===
			title: raw.work_name || `Unknown Work ${productId}`,
			circle: raw.maker_name || "Unknown Maker",
			description: raw.intro_s || "",
			workType: raw.work_type,
			workTypeString: raw.work_type_string,
			category: (raw.work_type as WorkCategory) || "etc",
			originalCategoryText: raw.work_type_string || raw.work_type,
			workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`,
			thumbnailUrl: WorkMapper.extractThumbnailUrl(raw, productId),
			highResImageUrl: WorkMapper.extractHighResImageUrl(raw),

			// === 価格・評価情報 ===
			price: WorkMapper.toPrice(raw) || { current: 0, currency: "JPY" },
			rating: WorkMapper.toRating(raw),
			wishlistCount: raw.wishlist_count,

			// === クリエイター情報 ===
			voiceActors: WorkMapper.extractVoiceActors(raw),
			scenario: WorkMapper.extractScenarioWriters(raw),
			illustration: WorkMapper.extractIllustrators(raw),
			music: WorkMapper.extractMusicComposers(raw),
			author: WorkMapper.extractAuthors(raw),

			// === ジャンル情報 ===
			genres: WorkMapper.extractGenres(raw),

			// === 日付情報 ===
			releaseDate: raw.regist_date,
			releaseDateISO: raw.regist_date ? WorkMapper.toISODate(raw.regist_date) : undefined,
			releaseDateDisplay: raw.regist_date
				? WorkMapper.formatDateDisplay(raw.regist_date)
				: undefined,

			// === 拡張メタデータ ===
			seriesName: raw.title?.title_name,
			ageRating: WorkMapper.mapAgeRating(raw.age_category),
			workFormat: raw.work_type_string,
			fileFormat: raw.file_type_string,

			// === ファイル情報 ===
			fileType: raw.file_type,
			fileTypeString: raw.file_type_string,
			fileTypeSpecial: raw.file_type_special,
			fileSize: raw.file_size,

			// === サンプル画像 ===
			sampleImages: WorkMapper.extractSampleImages(raw),

			// === 翻訳・言語情報 ===
			translationInfo: WorkMapper.toTranslationInfo(raw),
			languageDownloads: WorkMapper.toLanguageDownloads(raw),

			// === 販売状態情報 ===
			salesStatus: WorkMapper.toSalesStatus(raw),

			// === データソース追跡 ===
			dataSources: {
				infoAPI: {
					lastFetched: new Date().toISOString(),
					wishlistCount: raw.wishlist_count,
					customGenres: [],
				},
			},

			// === システム管理情報 ===
			lastFetchedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}

	/**
	 * 価格情報への変換
	 */
	static toPrice(raw: DLsiteRawApiResponse): PriceInfo | undefined {
		const current = raw.price ?? 0;
		const basePrice: PriceInfo = {
			current,
			currency: "JPY",
			original: raw.official_price !== current ? raw.official_price : undefined,
			discount: raw.discount_rate && raw.discount_rate > 0 ? raw.discount_rate : undefined,
			point: raw.point,
			isFreeOrMissingPrice: current === 0,
		};
		if (raw.locale_price || raw.locale_official_price) {
			// 一時的なフィールド追加のためanyキャストを使用
			const extendedPrice = basePrice as PriceInfo & {
				localePrices?: unknown;
				localeOfficialPrices?: unknown;
			};
			extendedPrice.localePrices = raw.locale_price;
			extendedPrice.localeOfficialPrices = raw.locale_official_price;
		}
		return basePrice;
	}

	/**
	 * 評価情報への変換
	 * APIが提供する評価分布をそのまま保持
	 */
	static toRating(raw: DLsiteRawApiResponse): RatingInfo | undefined {
		const avgRating = raw.rate_average_star ?? raw.rate_average ?? 0;
		const count = raw.rate_count ?? 0;
		if (!avgRating || !count) return undefined;

		// Convert 0-5 scale to 0-50 scale
		const stars = Math.round(avgRating * 10);

		// Convert rate_count_detail to proper ratingDetail format
		const ratingDetail = raw.rate_count_detail
			? [1, 2, 3, 4, 5]
					.map((reviewPoint) => {
						const detailCount = raw.rate_count_detail![reviewPoint.toString()] || 0;
						return {
							review_point: reviewPoint,
							count: detailCount,
							ratio: count > 0 ? Math.round((detailCount / count) * 100) : 0,
						};
					})
					.filter((detail) => detail.count > 0)
			: undefined;

		return {
			stars,
			count,
			ratingDetail,
		};
	}

	/**
	 * 年齢制限のマッピング
	 */
	private static mapAgeRating(ageCategory?: number): string | undefined {
		const AGE_RATING_MAP: Record<number, string> = {
			1: "全年齢",
			2: "R15",
			3: "R18",
		};
		return ageCategory ? AGE_RATING_MAP[ageCategory] : undefined;
	}

	/**
	 * サムネイルURLの抽出
	 */
	private static extractThumbnailUrl(raw: DLsiteRawApiResponse, productId: string): string {
		// 文字列の場合
		if (raw.image_thum && typeof raw.image_thum === "string") {
			return WorkMapper.normalizeUrl(raw.image_thum);
		}

		// 数値の場合は文字列に変換
		if (raw.image_thum && typeof raw.image_thum === "number") {
			return raw.image_thum.toString();
		}

		// オブジェクトの場合はurlまたはsrcプロパティを探す
		if (raw.image_thum && typeof raw.image_thum === "object" && raw.image_thum !== null) {
			const obj = raw.image_thum as any;
			if (obj.url && typeof obj.url === "string") {
				return WorkMapper.normalizeUrl(obj.url);
			}
			if (obj.src && typeof obj.src === "string") {
				return WorkMapper.normalizeUrl(obj.src);
			}
		}

		// デフォルトURL
		return `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
	}

	/**
	 * 高解像度画像URLの抽出
	 */
	private static extractHighResImageUrl(raw: DLsiteRawApiResponse): string | undefined {
		// image_mainの処理
		if (raw.image_main) {
			// 文字列の場合
			if (typeof raw.image_main === "string") {
				return WorkMapper.normalizeUrl(raw.image_main);
			}
			// 数値の場合
			if (typeof raw.image_main === "number") {
				return raw.image_main.toString();
			}
			// オブジェクトの場合
			if (typeof raw.image_main === "object" && raw.image_main !== null) {
				const obj = raw.image_main as any;
				if (obj.url && typeof obj.url === "string") {
					return WorkMapper.normalizeUrl(obj.url);
				}
				if (obj.src && typeof obj.src === "string") {
					return WorkMapper.normalizeUrl(obj.src);
				}
			}
		}

		// srcsetの処理
		if (raw.srcset) {
			if (typeof raw.srcset === "string") {
				const urls = raw.srcset.split(",").map((s) => s.trim().split(" ")[0]);
				const lastUrl = urls[urls.length - 1];
				return lastUrl ? WorkMapper.normalizeUrl(lastUrl) : undefined;
			}
			// 数値の場合
			if (typeof raw.srcset === "number") {
				return String(raw.srcset);
			}
		}

		return undefined;
	}

	/**
	 * 声優情報の抽出
	 */
	private static extractVoiceActors(raw: DLsiteRawApiResponse): string[] {
		if (!raw.creaters) return [];
		if (Array.isArray(raw.creaters)) return [];
		return raw.creaters.voice_by?.map((c) => c.name).filter(Boolean) || [];
	}

	/**
	 * シナリオライターの抽出
	 */
	private static extractScenarioWriters(raw: DLsiteRawApiResponse): string[] {
		if (!raw.creaters) return [];
		if (Array.isArray(raw.creaters)) return [];
		return raw.creaters.scenario_by?.map((c) => c.name).filter(Boolean) || [];
	}

	/**
	 * イラストレーターの抽出
	 */
	private static extractIllustrators(raw: DLsiteRawApiResponse): string[] {
		if (!raw.creaters) return [];
		if (Array.isArray(raw.creaters)) return [];
		return raw.creaters.illust_by?.map((c) => c.name).filter(Boolean) || [];
	}

	/**
	 * 音楽作曲者の抽出
	 */
	private static extractMusicComposers(raw: DLsiteRawApiResponse): string[] {
		if (!raw.creaters) return [];
		if (Array.isArray(raw.creaters)) return [];
		return raw.creaters.music_by?.map((c) => c.name).filter(Boolean) || [];
	}

	/**
	 * 作者情報の抽出
	 */
	private static extractAuthors(raw: DLsiteRawApiResponse): string[] {
		if (!raw.creaters) return [];
		if (Array.isArray(raw.creaters)) return [];
		return raw.creaters.others_by?.map((c) => c.name).filter(Boolean) || [];
	}

	/**
	 * ジャンル情報の抽出
	 */
	private static extractGenres(raw: DLsiteRawApiResponse): string[] {
		return raw.genres?.map((g) => g.name).filter((name) => name) || [];
	}

	/**
	 * サンプル画像の抽出
	 */
	private static extractSampleImages(
		raw: DLsiteRawApiResponse,
	): Array<{ thumb: string; width?: number; height?: number }> {
		if (!raw.image_samples?.length) return [];

		const samples: Array<{ thumb: string; width?: number; height?: number }> = [];

		for (const item of raw.image_samples) {
			// 文字列の場合
			if (typeof item === "string") {
				samples.push({ thumb: WorkMapper.normalizeUrl(item) });
			}
			// 数値の場合
			else if (typeof item === "number") {
				samples.push({ thumb: item.toString() });
			}
			// オブジェクトの場合
			else if (typeof item === "object" && item !== null) {
				const obj = item as any;
				if (obj.url && typeof obj.url === "string") {
					samples.push({ thumb: WorkMapper.normalizeUrl(obj.url) });
				} else if (obj.src && typeof obj.src === "string") {
					samples.push({ thumb: WorkMapper.normalizeUrl(obj.src) });
				}
				// 無効なオブジェクトはスキップ
			}
		}

		return samples;
	}

	/**
	 * 翻訳情報の変換
	 */
	private static toTranslationInfo(raw: DLsiteRawApiResponse): TranslationInfo | undefined {
		if (!raw.translation) return undefined;
		return {
			isTranslationAgree: raw.translation.is_translation_agree,
			isVolunteer: raw.translation.is_volunteer,
			isOriginal: raw.translation.is_original,
			originalWorkno: raw.translation.original_workno,
			lang: raw.translation.lang,
		};
	}

	/**
	 * 言語別ダウンロード情報の変換
	 */
	private static toLanguageDownloads(raw: DLsiteRawApiResponse): LanguageDownload[] {
		if (!raw.language_editions) return [];

		// 配列形式の場合
		if (Array.isArray(raw.language_editions)) {
			return raw.language_editions.map((edition) => ({
				workno: edition.workno,
				label: edition.label,
				lang: edition.lang,
				dlCount: edition.dl_count || "",
				displayLabel: edition.display_label || edition.label,
				editionId: edition.edition_id,
				editionType: edition.edition_type,
				displayOrder: edition.display_order,
			}));
		}

		// オブジェクト形式の場合
		return Object.values(raw.language_editions as Record<string, LanguageEditionItem>).map(
			(edition) => ({
				workno: edition.workno,
				label: edition.label,
				lang: edition.lang,
				dlCount: edition.dl_count || "",
				displayLabel: edition.display_label || edition.label,
				editionId: edition.edition_id,
				editionType: edition.edition_type,
				displayOrder: edition.display_order,
			}),
		);
	}

	/**
	 * 日付をISO形式に変換
	 */
	private static toISODate(dateStr: string): string | undefined {
		const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) return `${dateStr}T00:00:00.000Z`;
		return DateFormatter.optimizeDateFormats(dateStr)?.iso;
	}

	/**
	 * 日付を表示形式に変換
	 */
	private static formatDateDisplay(dateStr: string): string | undefined {
		return DateFormatter.optimizeDateFormats(dateStr)?.display;
	}

	/**
	 * 販売状態情報の変換
	 */
	private static toSalesStatus(raw: DLsiteRawApiResponse): SalesStatus | undefined {
		if (!raw.sales_status) return undefined;

		return {
			isSale: raw.sales_status.is_sale,
			onSale: raw.sales_status.on_sale,
			isDiscount: raw.sales_status.is_discount,
			isPointup: raw.sales_status.is_pointup,
			isFree: raw.sales_status.is_free,
			isRental: raw.sales_status.is_rental,
			isSoldOut: raw.sales_status.is_sold_out,
			isReserveWork: raw.sales_status.is_reserve_work,
			isReservable: raw.sales_status.is_reservable,
			isTimesale: raw.sales_status.is_timesale,
			dlsiteplayWork: raw.sales_status.dlsiteplay_work,
		};
	}

	/**
	 * URL正規化（プロトコル相対URLをHTTPSに）
	 */
	private static normalizeUrl(url: string): string {
		return url.startsWith("//") ? `https:${url}` : url;
	}
}
