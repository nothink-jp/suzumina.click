/**
 * DLsite HTML パーサー
 *
 * DLsiteの検索結果HTMLから作品情報を抽出する機能を提供します。
 * 30.jsonのサンプルデータに基づいて実装されています。
 */

import type { WorkCategory } from "@suzumina.click/shared-types";
import * as cheerio from "cheerio";
import * as logger from "../../shared/logger";

/**
 * HTMLから抽出される生のデータ構造
 */
export interface ParsedWorkData {
	/** DLsite商品ID（RJ236867など） */
	productId: string;
	/** 作品タイトル */
	title: string;
	/** サークル名 */
	circle: string;
	/** 声優名（複数の場合あり） */
	author?: string[];
	/** 作品カテゴリ */
	category: WorkCategory;
	/** 作品ページURL */
	workUrl: string;
	/** サムネイル画像URL */
	thumbnailUrl: string;
	/** 現在価格 */
	currentPrice: number;
	/** 元の価格（セール時） */
	originalPrice?: number;
	/** 割引率 */
	discount?: number;
	/** ポイント */
	point?: number;
	/** 評価（星の数） */
	stars?: number;
	/** 評価数 */
	ratingCount?: number;
	/** レビュー数 */
	reviewCount?: number;
	/** 販売数 */
	salesCount?: number;
	/** 年齢制限情報 */
	ageRating?: string;
	/** 独占配信フラグ */
	isExclusive: boolean;
	/** 作品タグ */
	tags?: string[];
	/** サンプル画像情報 */
	sampleImages: Array<{
		thumb: string;
		width?: number;
		height?: number;
	}>;
}

/**
 * 作品カテゴリをDLsiteのclass名から変換
 */
export function extractCategoryFromClass(categoryElement: unknown): WorkCategory {
	const classNames =
		(categoryElement as { attr: (name: string) => string | undefined }).attr("class") || "";

	// カテゴリマッピング表
	const categoryMap: Record<string, WorkCategory> = {
		type_ADV: "ADV",
		type_SOU: "SOU",
		type_RPG: "RPG",
		type_MOV: "MOV",
		type_MNG: "MNG",
		type_GAM: "GAM",
		type_CG: "CG",
		type_TOL: "TOL",
		type_ET3: "ET3",
		type_SLN: "SLN",
		type_ACN: "ACN",
		type_PZL: "PZL",
		type_QIZ: "QIZ",
		type_TBL: "TBL",
		type_DGT: "DGT",
	};

	// マッピング表からマッチするカテゴリを検索
	for (const [className, category] of Object.entries(categoryMap)) {
		if (classNames.includes(className)) {
			return category;
		}
	}

	return "etc";
}

/**
 * 価格文字列から数値を抽出
 */
export function extractPriceNumber(priceText: string): number {
	const match = priceText.match(/(\d+(?:,\d+)*)/);
	if (match?.[1]) {
		return Number.parseInt(match[1].replace(/,/g, ""), 10);
	}
	return 0;
}

/**
 * 評価の星の数を抽出
 */
export function extractStarRating(ratingElement: unknown): number {
	const className =
		(ratingElement as { attr: (name: string) => string | undefined }).attr("class") || "";
	const match = className.match(/star_(\d+)/);
	if (match?.[1]) {
		return Number.parseInt(match[1], 10) / 10; // star_45 -> 4.5
	}
	return 0;
}

/**
 * 括弧内の数値を抽出（評価数、レビュー数など）
 */
export function extractNumberFromParentheses(text: string): number {
	const match = text.match(/\((\d+(?:,\d+)*)\)/);
	if (match?.[1]) {
		return Number.parseInt(match[1].replace(/,/g, ""), 10);
	}
	return 0;
}

/**
 * サンプル画像データを解析
 */
export function parseSampleImages(
	sampleData: string,
): Array<{ thumb: string; width?: number; height?: number }> {
	if (!sampleData || sampleData.trim() === "") {
		// 空のデータは正常ケース（サンプル画像がない作品）
		return [];
	}

	try {
		const samples = JSON.parse(sampleData);
		if (Array.isArray(samples)) {
			return samples.map((sample: { thumb?: string; width?: string; height?: string }) => ({
				thumb: sample.thumb || "",
				width: sample.width ? Number.parseInt(sample.width, 10) : undefined,
				height: sample.height ? Number.parseInt(sample.height, 10) : undefined,
			}));
		}

		// 配列でない場合はサンプル画像なしとして処理
		logger.debug("サンプル画像データが配列ではありません:", {
			sampleData: sampleData.substring(0, 100),
		});
	} catch (error) {
		// JSONパースエラーは警告レベルを下げ、作品処理を継続
		logger.debug("サンプル画像データのJSONパースに失敗（作品処理は継続）:", {
			error: error instanceof Error ? error.message : String(error),
			sampleDataPreview: sampleData.substring(0, 100),
		});
	}
	return [];
}

/**
 * タグ情報を抽出する関数
 */
export function extractTags($item: unknown): string[] {
	const tags: string[] = [];

	// search_tag内のリンクからタグを抽出
	(
		$item as {
			find: (selector: string) => {
				each: (callback: (index: number, element: unknown) => void) => void;
			};
		}
	)
		.find(".search_tag a")
		.each((_, element) => {
			const tagText = cheerio
				// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
				.load("")(element as any)
				.text()
				.trim();
			if (tagText && !tags.includes(tagText)) {
				tags.push(tagText);
			}
		});

	return tags;
}

/**
 * 基本的な作品情報（ID、タイトル、サークル、声優）を抽出
 */
interface BasicProductInfo {
	productId: string;
	title: string;
	circle: string;
	author?: string[];
	workUrl: string;
}

function extractProductInfo($item: unknown, index: number): BasicProductInfo | null {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;
	// productIdの抽出（a要素のhrefまたはidから）
	const linkElement = $itemElement.find("a[href*='/product_id/']").first();
	if (linkElement.length === 0) {
		// 作品データがない行（ヘッダー行など）はスキップ
		return null;
	}

	const href = linkElement.attr("href") || "";
	const productIdMatch = href.match(/\/product_id\/([^.]+)\.html/);
	if (!productIdMatch) {
		logger.warn(`作品${index}: product_idが抽出できません。href: ${href}`);
		return null;
	}
	const productId = productIdMatch[1];

	// タイトルは .work_name 内のリンクから取得
	const titleElement = $itemElement.find(".work_name a[href*='/product_id/']").first();
	const title = titleElement.attr("title")?.trim() || titleElement.text().trim() || "";
	if (!title) {
		logger.warn(`作品${productId}: タイトルが見つかりません`);
		return null;
	}

	const circle = $itemElement.find(".maker_name a").first().text().trim();
	if (!circle) {
		logger.warn(`作品${productId}: サークル名が見つかりません`);
		return null;
	}

	// 声優名の抽出（author要素から）- 複数対応
	const authorElements = $itemElement.find(".author a");
	let author: string[] | undefined;

	if (authorElements.length > 0) {
		// リンク要素から個別に抽出
		const linkNames = authorElements
			// biome-ignore lint/suspicious/noExplicitAny: cheerio element mapping
			.map((_: any, el: any) => cheerio.load("")(el).text().trim())
			.get()
			.filter((name: string) => name);

		// リンクテキストにスラッシュ区切りが含まれている場合は分割
		const allNames: string[] = [];
		for (const name of linkNames) {
			if (name.includes("/")) {
				// スラッシュ区切りの場合は分割
				const splitNames = name
					.split(/[/、,]+/)
					.map((n: string) => n.trim())
					.filter((n: string) => n && n.length > 1);
				allNames.push(...splitNames);
			} else {
				allNames.push(name);
			}
		}

		author = allNames.length > 0 ? allNames : undefined;
	} else {
		// リンク要素がない場合は.authorセクション全体のテキストをチェック
		const authorSectionText = $itemElement.find(".author").text().trim();
		if (authorSectionText) {
			const splitNames = authorSectionText
				.split(/[/、,]+/)
				.map((n: string) => n.trim())
				.filter((n: string) => n && n.length > 1 && n.length < 50);
			author = splitNames.length > 0 ? splitNames : undefined;
		}
	}

	// URLの抽出
	const workUrl = href;
	if (!workUrl) {
		logger.warn(`作品${productId}: 作品URLが見つかりません`);
		return null;
	}

	return {
		productId,
		title,
		circle,
		author,
		workUrl,
	};
}

/**
 * DLsite画像ディレクトリパスを生成
 * 新形式(8桁): RJ01413726 → RJ01414000 (下4桁を1000の倍数に切り上げ)
 * 旧形式(6桁): RJ405712 → RJ406000 (下3桁を1000の倍数に切り上げ)
 */
export function generateDLsiteImageDirectory(productId: string): string {
	// RJ プレフィックスを除去して数値部分を取得
	const numericPart = productId.replace(/^RJ/, "");

	if (numericPart.length === 8) {
		// 新形式 (8桁): RJ01413726 → RJ01414000
		const baseNumber = Number.parseInt(numericPart, 10);
		const directoryNumber = Math.floor(baseNumber / 1000) * 1000 + 1000;
		return `RJ${directoryNumber.toString().padStart(8, "0")}`;
	}
	if (numericPart.length === 6) {
		// 旧形式 (6桁): RJ405712 → RJ406000
		const baseNumber = Number.parseInt(numericPart, 10);
		const directoryNumber = Math.floor(baseNumber / 1000) * 1000 + 1000;
		return `RJ${directoryNumber.toString().padStart(6, "0")}`;
	}
	// フォールバック: 元のロジック
	return `${productId.slice(0, 4)}000`;
}

/**
 * サムネイル画像URLを抽出
 */
function extractThumbnailUrl($item: unknown, productId: string): string {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;

	// 高画質サムネイル画像URLの抽出を試みる
	let thumbnailUrl = "";
	const thumbImgPopup = $itemElement.find("[data-vue-component='thumb-img-popup'] img[v-cloak]");
	if (thumbImgPopup.length > 0) {
		// v-cloak内の:src属性から高画質URLを抽出
		const srcAttr = thumbImgPopup.attr(":src");
		if (srcAttr) {
			const match = srcAttr.match(
				/'(\/\/img\.dlsite\.jp\/modpub\/images2\/work\/doujin\/[^']+\.jpg)'/,
			);
			if (match?.[1]) {
				thumbnailUrl = match[1];
			}
		}
	}

	if (!thumbnailUrl) {
		// 従来のサムネイル画像URLの抽出を試みる
		thumbnailUrl =
			$itemElement.find("img.lazy").attr("src") ||
			$itemElement.find("img").first().attr("src") ||
			$itemElement.find("img.work_thumb").attr("src") ||
			$itemElement.find("img[data-src]").attr("data-src") ||
			"";
	}

	if (!thumbnailUrl) {
		// サムネイル画像が見つからない場合はデフォルト画像を使用
		const directoryPath = generateDLsiteImageDirectory(productId);
		// WebP形式を優先、フォールバックでJPG形式
		thumbnailUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${directoryPath}/${productId}_img_main.webp`;
		logger.debug(
			`作品${productId}: サムネイル画像URLが見つからないため、デフォルトURLを使用 (${directoryPath}, WebP優先)`,
		);
	}

	return thumbnailUrl.startsWith("//") ? `https:${thumbnailUrl}` : thumbnailUrl;
}

/**
 * 価格情報（現在価格、元価格、割引率、ポイント）を抽出
 */
interface PriceInfo {
	currentPrice: number;
	originalPrice?: number;
	discount?: number;
	point?: number;
}

function extractPriceInfo($item: unknown): PriceInfo {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;

	// 価格情報の抽出（新構造対応）
	const currentPriceText = $itemElement
		.find(".work_price .work_price_parts")
		.not(".strike .work_price_parts")
		.text()
		.trim();
	const currentPrice = extractPriceNumber(currentPriceText);

	const originalPriceText = $itemElement.find(".strike .work_price_parts").text().trim();
	const originalPrice = originalPriceText ? extractPriceNumber(originalPriceText) : undefined;

	// 割引率の抽出
	const discountElement = $itemElement.find(".icon_lead_01.type_sale");
	const discountText = discountElement.text().trim();
	let discount: number | undefined;
	if (discountText) {
		const discountMatch = discountText.match(/(\d+)%OFF/);
		if (discountMatch) {
			discount = Number.parseInt(discountMatch[1], 10);
		}
	}

	// ポイントの抽出
	const pointText = $itemElement.find(".work_point").text().trim();
	const pointMatch = pointText.match(/(\d+)pt/);
	const point = pointMatch ? Number.parseInt(pointMatch[1], 10) : undefined;

	return {
		currentPrice,
		originalPrice,
		discount,
		point,
	};
}

/**
 * 評価情報（星、評価数、レビュー数）を抽出
 */
interface RatingInfo {
	stars?: number;
	ratingCount?: number;
	reviewCount?: number;
}

function extractRatingInfo($item: unknown): RatingInfo {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;

	let stars: number | undefined;
	let ratingCount: number | undefined;
	let reviewCount: number | undefined;

	// 評価情報の抽出
	const ratingElement = $itemElement.find(".star_rating");
	if (ratingElement.length > 0) {
		stars = extractStarRating(ratingElement);
		const ratingText = ratingElement.text().trim();
		ratingCount = extractNumberFromParentheses(ratingText);
	}

	// レビュー数の抽出
	const reviewElement = $itemElement.find(".work_review a");
	if (reviewElement.length > 0) {
		const reviewText = reviewElement.text().trim();
		reviewCount = extractNumberFromParentheses(reviewText);
	}

	return {
		stars,
		ratingCount,
		reviewCount,
	};
}

/**
 * 販売数とメタデータ（年齢制限、独占配信フラグ）を抽出
 */
interface SalesAndMetadata {
	salesCount?: number;
	ageRating?: string;
	isExclusive: boolean;
}

function extractSalesAndMetadata($item: unknown, productId: string): SalesAndMetadata {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;

	// 販売数の抽出
	const salesElement = $itemElement.find(`._dl_count_${productId}`);
	let salesCount: number | undefined;
	if (salesElement.length > 0) {
		const salesText = salesElement.text().trim();
		salesCount = extractPriceNumber(salesText);
	}

	// 年齢制限の抽出
	const ageRatingElement = $itemElement.find(".icon_GEN, .icon_R15, .icon_R18");
	const ageRating = ageRatingElement.attr("title") || ageRatingElement.text().trim() || undefined;

	// 独占配信フラグの判定
	const isExclusive = $itemElement.find(".icon_lead_01.type_exclusive").length > 0;

	return {
		salesCount,
		ageRating,
		isExclusive,
	};
}

/**
 * ParsedWorkDataオブジェクトを作成
 */
function createWorkObject(
	basicInfo: BasicProductInfo,
	category: WorkCategory,
	thumbnailUrl: string,
	priceInfo: PriceInfo,
	ratingInfo: RatingInfo,
	salesAndMetadata: SalesAndMetadata,
	tags: string[],
	sampleImages: Array<{ thumb: string; width?: number; height?: number }>,
): ParsedWorkData {
	return {
		productId: basicInfo.productId,
		title: basicInfo.title,
		circle: basicInfo.circle,
		author: basicInfo.author,
		category,
		workUrl: basicInfo.workUrl.startsWith("https://")
			? basicInfo.workUrl
			: `https://www.dlsite.com${basicInfo.workUrl}`,
		thumbnailUrl,
		currentPrice: priceInfo.currentPrice,
		originalPrice: priceInfo.originalPrice,
		discount: priceInfo.discount,
		point: priceInfo.point,
		stars: ratingInfo.stars,
		ratingCount: ratingInfo.ratingCount,
		reviewCount: ratingInfo.reviewCount,
		salesCount: salesAndMetadata.salesCount,
		ageRating: salesAndMetadata.ageRating,
		isExclusive: salesAndMetadata.isExclusive,
		sampleImages,
		tags,
	};
}

/**
 * 単一の作品テーブル行を処理
 */
function processWorkTableRow($item: unknown, index: number): ParsedWorkData | null {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $itemElement = $item as any;
	try {
		// 基本情報を抽出
		const basicInfo = extractProductInfo($item, index);
		if (!basicInfo) {
			return null;
		}

		// カテゴリの抽出
		const categoryElement = $itemElement.find(".work_category");
		const category = extractCategoryFromClass(categoryElement);

		// サムネイルURLを抽出
		const thumbnailUrl = extractThumbnailUrl($item, basicInfo.productId);

		// 価格情報を抽出
		const priceInfo = extractPriceInfo($item);

		// 評価情報を抽出
		const ratingInfo = extractRatingInfo($item);

		// 販売数とメタデータを抽出
		const salesAndMetadata = extractSalesAndMetadata($item, basicInfo.productId);

		// タグ情報の抽出
		const tags = extractTags($item);

		// サンプル画像の抽出
		const sampleButton = $itemElement.find("[data-view_samples]");
		let sampleImages: Array<{
			thumb: string;
			width?: number;
			height?: number;
		}> = [];
		if (sampleButton.length > 0) {
			const sampleData = sampleButton.attr("data-view_samples");
			if (sampleData) {
				sampleImages = parseSampleImages(sampleData);
			}
		}

		// 作品オブジェクトを作成
		const work = createWorkObject(
			basicInfo,
			category,
			thumbnailUrl,
			priceInfo,
			ratingInfo,
			salesAndMetadata,
			tags,
			sampleImages,
		);

		logger.debug(
			`作品${basicInfo.productId}の解析完了: ${basicInfo.title}, タグ数: ${tags.length}`,
		);
		return work;
	} catch (error) {
		logger.error(`作品${index}の解析中にエラーが発生:`, error);
		return null;
	}
}

/**
 * DLsiteの検索結果HTMLから作品データを抽出（新HTML構造対応）
 */
export function parseWorksFromHTML(html: string): ParsedWorkData[] {
	const $ = cheerio.load(html);
	const works: ParsedWorkData[] = [];

	logger.debug("HTMLパース開始（新構造対応）");

	// 構造1: table.work_1col_table の tr 要素から作品情報を取得（通常のHTMLページ）
	$("table.work_1col_table tr").each((index: number, element: unknown) => {
		const work = processWorkTableRow($(element as never), index);
		if (work) {
			works.push(work);
		}
	});

	// 構造2: ul#search_result_img_box の li 要素から作品情報を取得（AJAX APIレスポンス）
	if (works.length === 0) {
		logger.debug("table構造が見つからないため、AJAX構造（ul#search_result_img_box）を試行");
		$("#search_result_img_box li[data-list_item_product_id]").each(
			(index: number, element: unknown) => {
				const work = processWorkListItem(element, index);
				if (work) {
					works.push(work);
				}
			},
		);
	}

	logger.info(`HTMLパース完了: ${works.length}件の作品を抽出`);
	return works;
}

/**
 * カテゴリテキストをWorkCategory enumにマッピング
 */
function mapCategoryTextToWorkCategory(categoryText: string): WorkCategory {
	// 日本語テキストからマッピング
	switch (categoryText) {
		case "アドベンチャー":
			return "ADV" as WorkCategory;
		case "ボイス・ASMR":
		case "音声作品":
			return "SOU" as WorkCategory;
		case "アクション":
			return "ACN" as WorkCategory;
		case "シミュレーション":
			return "SLN" as WorkCategory;
		case "ロールプレイング":
			return "RPG" as WorkCategory;
		case "パズル":
			return "PZL" as WorkCategory;
		case "クイズ":
			return "QIZ" as WorkCategory;
		case "シューティング":
			return "STG" as WorkCategory;
		case "タイピング":
			return "TYP" as WorkCategory;
		case "テーブル":
			return "TBL" as WorkCategory;
		case "デジタルノベル":
			return "DNV" as WorkCategory;
		case "CG・イラスト":
			return "ICG" as WorkCategory;
		case "コミック":
			return "COM" as WorkCategory;
		case "動画":
			return "MOV" as WorkCategory;
		case "音楽":
			return "MUS" as WorkCategory;
		case "ツール/アクセサリ":
			return "TOL" as WorkCategory;
		case "その他ゲーム":
			return "ETC" as WorkCategory;
		default:
			logger.warn(`未知のカテゴリテキスト: ${categoryText}`);
			return "ETC" as WorkCategory;
	}
}

/**
 * AJAX APIレスポンスのli要素から作品データを処理
 */
function processWorkListItem(element: unknown, index: number): ParsedWorkData | null {
	// biome-ignore lint/suspicious/noExplicitAny: cheerio element type is complex
	const $item = cheerio.load("")(element as any);
	try {
		// 作品IDを取得
		const productId = $item.attr("data-list_item_product_id");
		if (!productId) {
			logger.debug(`作品${index}: 作品IDが見つかりません`);
			return null;
		}

		// 基本情報を抽出
		const title =
			$item.find(".work_name a").attr("title") || $item.find(".work_name a").text().trim();
		if (!title) {
			logger.debug(`作品${productId}: タイトルが見つかりません`);
			return null;
		}

		const circle = $item.find(".maker_name a").first().text().trim();
		const workUrl = $item.find(".work_name a").attr("href") || "";

		// 画像URL
		const thumbnailUrl = $item.find("img").attr("src") || "";

		// カテゴリ情報
		const categoryElement = $item.find(".work_category a");
		const categoryText = categoryElement.text().trim();
		const category = mapCategoryTextToWorkCategory(categoryText);

		// 価格情報
		const currentPriceText = $item.find(".work_price_base").first().text().trim();
		const currentPrice = Number.parseInt(currentPriceText.replace(/[^\d]/g, ""), 10) || 0;

		const originalPriceText = $item.find(".strike .work_price_base").text().trim();
		const originalPrice = originalPriceText
			? Number.parseInt(originalPriceText.replace(/[^\d]/g, ""), 10)
			: undefined;

		// 販売数
		const salesText = $item.find(".work_dl span").text().trim();
		const salesCount = salesText ? Number.parseInt(salesText.replace(/[^\d]/g, ""), 10) : undefined;

		// 評価情報
		const ratingElement = $item.find(".star_rating");
		let stars: number | undefined;
		let ratingCount: number | undefined;

		if (ratingElement.length > 0) {
			const ratingClass = ratingElement.attr("class") || "";
			const starMatch = ratingClass?.match(/star_(\d+)/);
			if (starMatch && starMatch[1]) {
				stars = Number.parseInt(starMatch[1], 10) / 10; // star_45 -> 4.5
			}

			const ratingText = ratingElement.text().trim();
			const ratingMatch = ratingText?.match(/\((\d+)\)/);
			if (ratingMatch && ratingMatch[1]) {
				ratingCount = Number.parseInt(ratingMatch[1], 10);
			}
		}

		// 声優情報（涼花みなせの場合）
		const authorElements = $item.find(".maker_name .author a");
		const author: string[] = [];
		authorElements.each((_: number, el: unknown) => {
			const authorName = cheerio
				.load("")(el as any)
				.text()
				.trim();
			if (authorName) {
				author.push(authorName);
			}
		});

		// 割引率計算
		let discount: number | undefined;
		if (originalPrice && originalPrice > currentPrice) {
			discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
		}

		// 独占配信フラグ
		const isExclusive = $item.hasClass("type_exclusive_01");

		logger.debug(`作品${productId}の解析完了: ${title}, タグ数: 0`);

		return {
			productId,
			title,
			circle,
			author: author.length > 0 ? author : undefined,
			category,
			workUrl: workUrl.startsWith("//")
				? `https:${workUrl}`
				: workUrl.startsWith("/")
					? `https://www.dlsite.com${workUrl}`
					: workUrl,
			thumbnailUrl: thumbnailUrl.startsWith("//") ? `https:${thumbnailUrl}` : thumbnailUrl,
			currentPrice,
			originalPrice,
			discount,
			stars,
			ratingCount,
			salesCount,
			isExclusive,
			tags: [], // AJAX構造では詳細なタグ情報は取得困難
			sampleImages: [], // AJAX構造ではサンプル画像は取得困難
		};
	} catch (error) {
		logger.error(`作品${index}の処理中にエラー:`, error);
		return null;
	}
}

/**
 * 単一の作品検索結果JSONからHTMLを抽出してパース
 */
export function parseWorksFromSearchResult(searchResultJson: string): ParsedWorkData[] {
	try {
		const data = JSON.parse(searchResultJson);
		const html = data.search_result;

		if (typeof html !== "string") {
			throw new Error("search_resultフィールドが文字列ではありません");
		}

		return parseWorksFromHTML(html);
	} catch (error) {
		logger.error("検索結果JSONの解析に失敗:", error);
		return [];
	}
}
