/**
 * Work Mapper - DLsite Individual Info API の薄い抽象化
 *
 * 新しいshared-types構造を使用した薄いマッピング層
 * ビジネスロジックはDomain Serviceに委譲
 */

import type {
	DLsiteApiResponse,
	LanguageDownload,
	PriceInfo,
	RatingInfo,
	SalesStatus,
	TranslationInfo,
	WorkCategory,
	WorkDocument,
} from "@suzumina.click/shared-types";
import { optimizeDateFormats } from "@suzumina.click/shared-types";

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

// 画像オブジェクトの型定義
interface ImageObject {
	url?: string;
	src?: string;
	[key: string]: unknown;
}

/**
 * Raw APIレスポンスからWorkエンティティに変換
 */
function toWork(raw: DLsiteApiResponse): WorkDocument {
	const productId = raw.workno || raw.product_id || "";

	return {
		// === 基本識別情報 ===
		id: productId,
		productId,
		circleId: raw.maker_id,
		baseProductId: undefined, // Not available in raw API

		// === 基本作品情報 ===
		title: raw.work_name || `Unknown Work ${productId}`,
		titleMasked: raw.work_name || `Unknown Work ${productId}`, // Use work_name as fallback
		titleKana: undefined, // Not available in raw API
		altName: undefined, // Not available in raw API
		circle: raw.maker_name || "Unknown Maker",
		circleEn: undefined, // Not available in raw API
		description: raw.intro_s || "",
		workType: raw.work_type,
		workTypeString: raw.work_type_string,
		category: (raw.work_type as WorkCategory) || "etc",
		originalCategoryText: raw.work_type_string || raw.work_type,
		workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`,
		thumbnailUrl: extractThumbnailUrl(raw, productId),
		highResImageUrl: extractHighResImageUrl(raw),

		// === 価格・評価情報 ===
		price: toPrice(raw) || { current: 0, currency: "JPY" },
		rating: toRating(raw),

		// === クリエイター情報 ===
		// DLsite APIの`creaters`を`creators`に正規化
		creators: normalizeCreators(raw),

		// === ジャンル情報 ===
		genres: extractGenres(raw),
		customGenres: extractCustomGenres(raw),

		// === 日付情報 ===
		releaseDate: raw.regist_date,
		releaseDateISO: raw.regist_date ? toISODate(raw.regist_date) : undefined,
		releaseDateDisplay: raw.regist_date ? formatDateDisplay(raw.regist_date) : undefined,
		registDate: raw.regist_date,
		updateDate: undefined, // Not available in raw API
		modifyFlag: undefined, // Not available in raw API

		// === 拡張メタデータ ===
		seriesId: raw.title?.title_id,
		seriesName: raw.title?.title_name,
		ageRating: mapAgeRating(raw.age_category),
		ageCategory: raw.age_category,
		ageCategoryString: mapAgeCategoryString(raw.age_category),
		workFormat: raw.work_type_string,
		fileFormat: raw.file_type_string,

		// === ファイル情報 ===
		fileType: raw.file_type,
		fileTypeString: raw.file_type_string,
		fileTypeSpecial: raw.file_type_special,
		fileSize: raw.file_size,

		// === サンプル画像 ===
		sampleImages: extractSampleImages(raw),

		// === 翻訳・言語情報 ===
		translationInfo: toTranslationInfo(raw),
		languageDownloads: toLanguageDownloads(raw),

		// === 販売状態情報 ===
		salesStatus: toSalesStatus(raw),

		// === データソース追跡 ===
		dataSources: {
			infoAPI: {
				lastFetched: new Date().toISOString(),
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
function toPrice(raw: DLsiteApiResponse): PriceInfo | undefined {
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
 *
 * SPR-272: 旧実装は `raw.rate_count` を評価件数として読んでいたが、DLsite Individual Info API は
 * このフィールドを返さない（実キャプチャ150件中0件）。そのため `count` が常に 0 となり
 * 早期 return で **rating が本番で一度も生成されていなかった**（本番 works 300件で 0件）。
 * 件数の実体は `rate_count_detail`（星ごとの内訳）なので、その合計を評価件数とする。
 *
 * スケールにも注意: `rate_average_star` は **10-50 の整数（0.5刻み。実測 40/45/50）** で、
 * `RatingInfo.stars` は 0-5（`work-schemas.ts` で max 5、読み手も `>= 4.0` や `toFixed(1)` で
 * 0-5 前提）。よって 10 で「割る」。旧実装のコメント「Convert 0-5 scale to 0-50 scale」は
 * 変換の向きと対象を取り違えており、仮に count が埋まっていれば 50 → 500 になっていた。
 * 生値 10-50 を保持するフィールド `rateAverageStar` はスキーマ上は存在するが、現状 toWork は
 * これを書いていない（未配線）。生値が必要になった時点で配線する。
 */
function toRating(raw: DLsiteApiResponse): RatingInfo | undefined {
	// 分布が唯一の件数ソースなので、不在なら評価が付いていないものとして扱う。
	const detail = raw.rate_count_detail;
	if (!detail) return undefined;

	// 評価件数は星ごとの内訳の合計（APIは合計値を直接返さない）
	const count = Object.values(detail).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
	const rawStar = raw.rate_average_star ?? 0;
	if (!rawStar || !count) return undefined;

	// 10-50スケール → 0-5スケール
	const stars = rawStar / 10;

	// rate_count_detail を ratingDetail 形式へ変換する
	const ratingDetail = [1, 2, 3, 4, 5]
		.map((reviewPoint) => {
			const detailCount = detail[reviewPoint.toString()] || 0;
			return {
				review_point: reviewPoint,
				count: detailCount,
				ratio: Math.round((detailCount / count) * 100),
			};
		})
		.filter((entry) => entry.count > 0);

	return {
		stars,
		count,
		ratingDetail,
	};
}

/**
 * 年齢制限のマッピング
 */
function mapAgeRating(ageCategory?: number): string | undefined {
	const AGE_RATING_MAP: Record<number, string> = {
		1: "全年齢",
		2: "R15",
		3: "R18",
	};
	return ageCategory ? AGE_RATING_MAP[ageCategory] : undefined;
}

/**
 * 年齢カテゴリ文字列のマッピング
 */
function mapAgeCategoryString(ageCategory?: number): string | undefined {
	const AGE_CATEGORY_STRING_MAP: Record<number, string> = {
		1: "general",
		2: "r15",
		3: "adult",
	};
	return ageCategory ? AGE_CATEGORY_STRING_MAP[ageCategory] : undefined;
}

/**
 * DLsite の「画像なし」プレースホルダ URL かどうか。
 *
 * API は画像が未登録の作品で `image_thum` / `image_main` に
 * `//www.dlsite.com/images/web/home/no_img_sam.gif`（`no_img_main.gif`）を返す。
 * これを URL として保存すると、web の `remotePatterns` 外のホストになるため画像を出せず、
 * JSON-LD・OG 画像も壊れた URL を指す（SPR-312）。保存前にここで弾く。
 */
function isNoImagePlaceholder(url: string | undefined): boolean {
	return url?.includes("/images/web/home/no_img_") ?? false;
}

/**
 * API から画像 URL が一切得られなかった場合の最終フォールバック。
 *
 * DLsite の画像は「次の千番台」ディレクトリ配下に置かれる（RJ01098758 → RJ01099000）。
 * 従来この関数はそのディレクトリを欠いた URL を返しており、実際には常に 404 だった。
 *
 * ただし**推測**であることに変わりはなく、API 由来の値が取れるときは必ずそちらを優先する。
 * SPR-312 の実測では productId からの導出は 39件中 7件で外れた
 * （翻訳版の画像は元作品 ID の配下にあり、productId からは辿れない）。
 * そもそもカバー画像が存在しない作品もあり、その場合はどう組み立てても 404 になる
 * （web 側は #943 の「画像なし」プレースホルダで受ける）。resize 形式の派生ファイルが
 * 残っていて 200 を返すことがあるが、原本が消えた作品では失効し得るので採用しない。
 */
function buildFallbackThumbnailUrl(productId: string): string {
	const match = productId.match(/^([A-Z]+)(\d+)$/);
	if (!match?.[1] || !match[2]) {
		return `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
	}
	const [, prefix, digits] = match;
	const bucket = (Math.floor(Number(digits) / 1000) + 1) * 1000;
	const dir = `${prefix}${String(bucket).padStart(digits.length, "0")}`;
	return `https://img.dlsite.jp/modpub/images2/work/doujin/${dir}/${productId}_img_main.jpg`;
}

/**
 * サムネイルURLの抽出
 *
 * `image_thum` が「画像なし」プレースホルダのときは `image_main` を使う。
 * 翻訳版は `image_main` が元作品の画像を指しており、API 側が正しい URL を持っている
 * （例: RJ01113566 の image_main は RJ01098758 の画像）。
 */
function extractThumbnailUrl(raw: DLsiteApiResponse, productId: string): string {
	const thumbUrl = extractUrlFromImageField(raw.image_thum);
	if (thumbUrl && !isNoImagePlaceholder(thumbUrl)) {
		return thumbUrl;
	}

	const mainUrl = extractHighResImageUrl(raw);
	if (mainUrl) {
		return mainUrl;
	}

	return buildFallbackThumbnailUrl(productId);
}

/**
 * 高解像度画像URLの抽出
 *
 * 「画像なし」プレースホルダは URL として無価値なため undefined を返す
 * （= フィールド不在。書き込み側で FieldValue.delete() に変換される）。
 */
function extractHighResImageUrl(raw: DLsiteApiResponse): string | undefined {
	// image_mainから抽出
	const mainUrl = extractUrlFromImageField(raw.image_main);
	if (mainUrl && !isNoImagePlaceholder(mainUrl)) return mainUrl;

	// srcsetから抽出
	const srcsetUrl = extractUrlFromSrcset(raw.srcset);
	return isNoImagePlaceholder(srcsetUrl) ? undefined : srcsetUrl;
}

/**
 * 画像フィールドからURLを抽出
 */
function extractUrlFromImageField(value: unknown): string | undefined {
	if (!value) return undefined;

	// 文字列の場合
	if (typeof value === "string") {
		return normalizeUrl(value);
	}

	// 数値の場合
	if (typeof value === "number") {
		return value.toString();
	}

	// オブジェクトの場合
	if (typeof value === "object" && value !== null) {
		const obj = value as ImageObject;
		if (obj.url && typeof obj.url === "string") {
			return normalizeUrl(obj.url);
		}
		if (obj.src && typeof obj.src === "string") {
			return normalizeUrl(obj.src);
		}
	}

	return undefined;
}

/**
 * srcsetからURLを抽出
 */
function extractUrlFromSrcset(srcset: unknown): string | undefined {
	if (!srcset) return undefined;

	if (typeof srcset === "string") {
		const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
		const lastUrl = urls[urls.length - 1];
		return lastUrl ? normalizeUrl(lastUrl) : undefined;
	}

	if (typeof srcset === "number") {
		return String(srcset);
	}

	return undefined;
}

/**
 * DLsite APIの`creaters`を`creators`に正規化
 */
function normalizeCreators(raw: DLsiteApiResponse): WorkDocument["creators"] | undefined {
	if (!raw.creaters) return undefined;
	if (Array.isArray(raw.creaters)) return undefined;

	return {
		voice_by: raw.creaters.voice_by || [],
		scenario_by: raw.creaters.scenario_by || [],
		illust_by: raw.creaters.illust_by || [],
		music_by: raw.creaters.music_by || [],
		others_by: raw.creaters.others_by || [],
		created_by: [], // Not available in raw API, always empty
	};
}

/**
 * ジャンル情報の抽出
 */
function extractGenres(raw: DLsiteApiResponse): string[] {
	return raw.genres?.map((g) => g.name).filter((name) => name) || [];
}

/**
 * カスタムジャンル情報の抽出
 */
function extractCustomGenres(raw: DLsiteApiResponse): Array<{
	genre_key: string;
	name: string;
	name_en?: string;
	display_order?: number;
}> {
	if (!raw.genres) return [];
	return raw.genres.map((g) => ({
		genre_key: g.search_val || g.name, // Use search_val as genre_key
		name: g.name,
		name_en: undefined, // Not available in raw API
		display_order: undefined, // Not available in raw API
	}));
}

/**
 * サンプル画像の抽出
 */
function extractSampleImages(
	raw: DLsiteApiResponse,
): Array<{ thumb: string; width?: number; height?: number }> {
	if (!raw.image_samples?.length) return [];

	return raw.image_samples
		.map(extractUrlFromImageField)
		.filter((thumb): thumb is string => thumb !== undefined)
		.map((thumb) => ({ thumb }));
}

/**
 * 翻訳情報の変換
 *
 * 親子関係（isParent / isChild / parentWorkno / childWorknos）まで取り込む。
 * 同じ作品の各言語版を1つにまとめる導線は、この関係が無いと復元できない（SPR-313）。
 */
function toTranslationInfo(raw: DLsiteApiResponse): TranslationInfo | undefined {
	const translation = raw.translation_info;
	if (!translation) return undefined;
	// API は非翻訳作品で original_workno / parent_workno / lang を null で返す。
	// 保存側は `string | undefined` なので null は「不在」に倒す。
	return {
		isTranslationAgree: translation.is_translation_agree,
		isVolunteer: translation.is_volunteer,
		isOriginal: translation.is_original,
		isParent: translation.is_parent,
		isChild: translation.is_child,
		originalWorkno: translation.original_workno ?? undefined,
		parentWorkno: translation.parent_workno ?? undefined,
		childWorknos: translation.child_worknos ?? undefined,
		lang: translation.lang ?? undefined,
		productionTradePriceRate: translation.production_trade_price_rate ?? undefined,
	};
}

/**
 * 言語別ダウンロード情報の変換
 */
function toLanguageDownloads(raw: DLsiteApiResponse): LanguageDownload[] {
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
function toISODate(dateStr: string): string | undefined {
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (match) return `${dateStr}T00:00:00.000Z`;
	return optimizeDateFormats(dateStr)?.iso;
}

/**
 * 日付を表示形式に変換
 */
function formatDateDisplay(dateStr: string): string | undefined {
	return optimizeDateFormats(dateStr)?.display;
}

/**
 * 販売状態情報の変換
 *
 * SPR-264: 旧実装は存在しないネストオブジェクト `raw.sales_status` を読んでおり、
 * 常に undefined を返していた（実測150件で0件・実APIはフラットフィールドのみ返す）。
 * `isSale`（セール中判定）は work-tiering.ts の volatile ティア判定が参照する値のため、
 * 実フィールド `is_discount_work`（実測150件中78件がtrue）から正しくマッピングする。
 * `isSoldOut` は実APIに信頼できる直接対応フィールドが無いため undefined のまま。
 *
 * `isSale`/`isDiscount` は同一フィールド `is_discount_work` から求めており実質同義（意図的）。
 * `isTimesale`（タイムセール）・`isReserveWork`（予約）起因の価格変動は `isSale` に含めない。
 * 実測150件では `is_timesale_work`/`is_limit_sales` が全件 false で、volatile ティア判定
 * （work-tiering.ts の `salesStatus?.isSale === true`）への実害は無い。DLsite の実APIには
 * 「一般的なセール中」を示す独立フィールドが無く、現状 `is_discount_work` が最も広く
 * カバーする信号のため、これを唯一のソースとして採用している。
 */
function toSalesStatus(raw: DLsiteApiResponse): SalesStatus {
	return {
		isSale: raw.is_discount_work,
		onSale: raw.on_sale,
		isDiscount: raw.is_discount_work,
		isPointup: raw.is_title_pointup ?? undefined,
		isFree: raw.free,
		isRental: raw.is_rental_work,
		isSoldOut: undefined,
		isReserveWork: raw.is_reserve_work,
		isReservable: raw.is_reservable,
		isTimesale: raw.is_timesale_work,
		dlsiteplayWork: raw.is_dlsiteplay_work,
	};
}

/**
 * URL正規化（プロトコル相対URLをHTTPSに）
 */
function normalizeUrl(url: string): string {
	return url.startsWith("//") ? `https:${url}` : url;
}

// マッパー関数を集約した公開 API（呼び出しは WorkMapper.toWork 等で統一）
export const WorkMapper = {
	toWork,
	toPrice,
	toRating,
	// Private methods that were previously accessible as static methods
	mapAgeRating,
	mapAgeCategoryString,
	extractThumbnailUrl,
	extractHighResImageUrl,
	normalizeCreators,
	extractGenres,
	extractCustomGenres,
	extractSampleImages,
	toTranslationInfo,
	toLanguageDownloads,
	toISODate,
	formatDateDisplay,
	toSalesStatus,
	normalizeUrl,
};
